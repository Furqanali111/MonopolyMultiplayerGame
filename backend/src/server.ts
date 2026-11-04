import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// Load environment variables
dotenv.config();

// Import game engine
import {
    buyProperty,
    startAuction,
    placeBid,
    passAuction,
    buildHouse,
    sellHouse,
    mortgageProperty,
    unmortgageProperty,
    proposeTrade,
    acceptTrade,
    declineTrade,
    declareBankruptcy,
    attemptPayment,
    rollTurn,
    rollForJailTurn,
    leaveJail,
    endTurn,
    applyWinCondition,
    canBuyProperty,
    canBuildHouse,
    canSellHouse,
    canMortgage,
    canUnmortgage,
} from '../../src/game/engine';
import { DEFAULT_RULES, HouseRules, sanitizeRules } from '../../src/game/types';
import { addEventsToStats, finalStandings } from '../../src/game/stats';
import { diffEvents } from '../../src/game/events';
import { autoStep, whoMustAct } from '../../src/game/autopilot';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, BOARD_TILES } from '../../src/game/constants';

const app = express();
const httpServer = createServer(app);

// Configure CORS
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:8080',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build (production)
const frontendPath = path.join(__dirname, '../../../../dist');
app.use(express.static(frontendPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Monopoly backend server is running' });
});

// In-memory storage (will be replaced with proper managers)
const sessions = new Map<string, any>();
const rooms = new Map<string, any>();
// token -> user record. Survives socket reconnects so a refresh keeps the same seat.
const users = new Map<string, any>();
// How long a dropped player keeps their seat before being removed / forfeiting
const GRACE_MS = Number(process.env.RECONNECT_GRACE_MS) || 60_000;

// Store a new game state, broadcast it, and announce the end of the game once.
function publish(room: any, next: any) {
    const prev = room.gameState;
    next = applyWinCondition(next);
    room.gameState = next;
    room.version = (room.version || 0) + 1;
    const events = diffEvents(prev, next);
    addEventsToStats((room.stats ??= {}), events);
    io.to(room.code).emit('game:stateUpdate', { gameState: next, events, seq: room.version });
    if (next.phase === 'gameover' && prev.phase !== 'gameover') {
        room.state = 'finished';
        stopAuto(room);
        io.to(room.code).emit('game:ended', { winner: next.winner, finalState: next, standings: finalStandings(next, room.stats) });
        return;
    }
    scheduleAuto(room);
}

// ---------------------------------------------------------------------------
// Autopilot: bots play, and humans who run out of time or are offline get a
// stand-in decision so the table never waits forever.
// ---------------------------------------------------------------------------
const TURN_MS = Number(process.env.TURN_TIMEOUT_MS ?? 90_000);        // 0 disables the timer
const OFFLINE_TURN_MS = Number(process.env.OFFLINE_TURN_MS ?? 10_000);
const BOT_MS = Number(process.env.BOT_DELAY_MS ?? 900);

// Timers live here, not on the room: a room object is sent to clients and a Timeout is circular.
const autoTimers = new Map<string, NodeJS.Timeout>();
function stopAuto(room: any) {
    clearTimeout(autoTimers.get(room.code));
    autoTimers.delete(room.code);
}

function scheduleAuto(room: any) {
    stopAuto(room);
    if (room.state !== 'playing' || !room.gameState) return;

    const actor = whoMustAct(room.gameState);
    if (!actor) return;

    const seat = room.players.find((p: any) => p.id === actor.id);
    const away = !actor.isAI && !(seat && seat.isConnected);
    const stoodIn = room.autoplay?.has(actor.id);
    const delay = actor.isAI ? BOT_MS : away ? OFFLINE_TURN_MS : stoodIn ? BOT_MS * 2 : TURN_MS;
    if (!delay) return; // timer disabled and a connected human is acting

    if (!actor.isAI && !stoodIn && !away) {
        io.to(room.code).emit('game:deadline', { playerId: actor.id, at: Date.now() + delay });
    }

    const version = room.version;
    autoTimers.set(room.code, setTimeout(() => {
        if (room.version !== version || room.state !== 'playing') return; // something happened meanwhile
        const next = autoStep(room.gameState);
        if (!next) return;
        if (!actor.isAI) {
            (room.autoplay ??= new Set()).add(actor.id);
            io.to(room.code).emit('game:autoplayed', { playerId: actor.id });
        }
        publish(room, next);
    }, delay));
}

const humans = (room: any) => room.players.filter((p: any) => !p.isBot);
function closeRoom(room: any) {
    stopAuto(room);
    rooms.delete(room.code);
    console.log(`🗑️ Room deleted: ${room.code}`);
}

// shortcut: host is handed to the first connected player automatically (no accept/timeout offer)
function migrateHost(room: any) {
    const next = room.players.find((p: any) => !p.isBot && p.isConnected && p.id !== room.hostId);
    if (!next) return;
    room.players.forEach((p: any) => (p.isHost = p.id === next.id));
    room.hostId = next.id;
    io.to(room.code).emit('host:migrated', { newHostId: next.id, newHostName: next.username });
}

// A player who never returns loses: assets go to the bank and the game moves on.
// shortcut: any open auction/trade is cancelled rather than resolved around the leaver.
function forfeit(room: any, userId: string) {
    let gs = room.gameState;
    const p = gs?.players.find((x: any) => x.id === userId);
    if (!p || p.isBankrupt || gs.phase === 'gameover') return;

    const wasCurrent = gs.players[gs.currentPlayerIndex].id === userId;
    gs = declareBankruptcy(gs, userId, null);
    gs = { ...gs, phase: 'playing', auction: null, trade: null, bankruptcyState: null };
    if (gs.preAuctionPlayerIndex !== undefined) {
        gs.currentPlayerIndex = gs.preAuctionPlayerIndex;
        gs.preAuctionPlayerIndex = undefined;
    }
    if (wasCurrent || gs.players[gs.currentPlayerIndex].isBankrupt) {
        if (applyWinCondition(gs).phase !== 'gameover') gs = endTurn(gs);
    }
    publish(room, gs);
}

// Take a player out of their room (voluntary leave, or grace period expired).
function removePlayer(room: any, userId: string) {
    if (room.state === 'playing') forfeit(room, userId);
    room.players = room.players.filter((p: any) => p.id !== userId);

    if (humans(room).length === 0) {
        closeRoom(room);
        return;
    }
    if (room.hostId === userId) {
        const next = humans(room).find((p: any) => p.isConnected) || humans(room)[0];
        room.players.forEach((p: any) => (p.isHost = p.id === next.id));
        room.hostId = next.id;
        io.to(room.code).emit('host:migrated', { newHostId: next.id, newHostName: next.username });
    }
    io.to(room.code).emit('room:playerLeft', { playerId: userId, room });
}

function dropUser(user: any) {
    users.delete(user.token);
    const room = user.roomCode && rooms.get(user.roomCode);
    user.roomCode = null;
    if (room) removePlayer(room, user.userId);
}

// Game initialization function for multiplayer
function initializeMultiplayerGame(roomPlayers: any[], rules: HouseRules) {
    // Shuffle cards
    const chanceCards = shuffleArray([...CHANCE_CARDS]);
    const communityChestCards = shuffleArray([...COMMUNITY_CHEST_CARDS]);

    // Create players from room participants
    const players = roomPlayers.map((roomPlayer, index) => ({
        id: roomPlayer.id,
        name: roomPlayer.username,
        color: roomPlayer.color,
        money: rules.startingMoney,
        position: 0,
        isAI: !!roomPlayer.isBot,
        ...(roomPlayer.isBot ? { difficulty: 'medium' } : {}),
        inJail: false,
        jailTurns: 0,
        getOutOfJailCards: 0,
        isBankrupt: false,
        doublesCount: 0,
    }));

    return {
        phase: 'playing',
        players,
        currentPlayerIndex: 0,
        ownedProperties: [],
        availableHouses: 32, // Total houses in Monopoly
        availableHotels: 12, // Total hotels in Monopoly
        chanceDeck: chanceCards,
        communityChestDeck: communityChestCards,
        lastDiceRoll: null,
        turnPhase: 'roll',
        currentCard: null,
        auction: null,
        trade: null,
        bankruptcyState: null,
        winner: null,
        gameLog: ['Game started! Roll the dice to begin.'],
        diceMultiplierForRent: 0,
        specialRentMultiplier: null,
        rules,
        freeParkingPot: 0,
    };
}

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // ============================================================================
    // AUTHENTICATION
    // ============================================================================

    socket.on('auth:login', ({ username, token }, callback) => {
        // Returning user (page refresh / dropped connection): reattach to the same seat
        const existing = token && users.get(token);
        if (existing) {
            clearTimeout(existing.timer);
            sessions.delete(existing.socketId);
            existing.socketId = socket.id;
            sessions.set(socket.id, existing);

            const room = existing.roomCode && rooms.get(existing.roomCode);
            if (room) {
                const player = room.players.find((p: any) => p.id === existing.userId);
                if (player) {
                    player.isConnected = true;
                    player.socketId = socket.id;
                }
                socket.join(room.code);
                io.to(room.code).emit('room:updated', room);
                socket.emit('chat:history', room.chat || []);
                scheduleAuto(room);
            } else {
                existing.roomCode = null;
            }
            callback({ success: true, userId: existing.userId, username: existing.username, token, room: room || null });
            console.log(`🔁 ${existing.username} reconnected`);
            return;
        }

        if (!username || username.length < 3 || username.length > 15) {
            callback({ success: false, error: 'Username must be 3-15 characters' });
            return;
        }

        const user = {
            userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            username,
            token: randomUUID(),
            socketId: socket.id,
            roomCode: null as string | null,
            timer: undefined as NodeJS.Timeout | undefined,
        };
        users.set(user.token, user);
        sessions.set(socket.id, user);

        callback({ success: true, userId: user.userId, username, token: user.token, room: null });
        console.log(`✅ User logged in: ${username} (${user.userId})`);
    });

    // ============================================================================
    // ROOM MANAGEMENT
    // ============================================================================

    socket.on('room:create', ({ }, callback) => {
        const session = sessions.get(socket.id);
        if (!session) {
            callback({ error: 'Not authenticated' });
            return;
        }

        // Generate unique room code
        const roomCode = generateRoomCode();

        // Create room
        const room = {
            code: roomCode,
            hostId: session.userId,
            players: [
                {
                    id: session.userId,
                    username: session.username,
                    socketId: socket.id,
                    color: '#FF0000', // Red for host
                    isReady: false,
                    isConnected: true,
                    isHost: true,
                },
            ],
            maxPlayers: 6,
            rules: DEFAULT_RULES,
            state: 'waiting',
            gameState: null,
            createdAt: new Date(),
        };

        rooms.set(roomCode, room);
        session.roomCode = roomCode;

        // Join socket room
        socket.join(roomCode);

        callback({ roomCode, room });

        console.log(`🏠 Room created: ${roomCode} by ${session.username}`);
    });

    socket.on('room:join', ({ roomCode }, callback) => {
        const session = sessions.get(socket.id);
        if (!session) {
            callback({ success: false, error: 'Not authenticated' });
            return;
        }

        const room = rooms.get(roomCode);
        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        if (room.state !== 'waiting') {
            callback({ success: false, error: 'Game already started' });
            return;
        }

        if (room.players.length >= room.maxPlayers) {
            callback({ success: false, error: 'Room is full' });
            return;
        }

        // Add player to room
        const playerColors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF'];
        const usedColors = room.players.map((p: any) => p.color);
        const availableColor = playerColors.find((c) => !usedColors.includes(c)) || '#FFFFFF';

        const newPlayer = {
            id: session.userId,
            username: session.username,
            socketId: socket.id,
            color: availableColor,
            isReady: false,
            isConnected: true,
            isHost: false,
        };

        room.players.push(newPlayer);
        session.roomCode = roomCode;

        // Join socket room
        socket.join(roomCode);

        // Notify all players
        io.to(roomCode).emit('room:playerJoined', { player: newPlayer, room });

        callback({ success: true, room });

        console.log(`👤 ${session.username} joined room ${roomCode}`);
    });

    socket.on('room:leave', ({ }, callback) => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) {
            callback({ success: false });
            return;
        }
        const room = rooms.get(session.roomCode);
        socket.leave(session.roomCode);
        session.roomCode = null;
        if (room) removePlayer(room, session.userId);
        callback({ success: true });
        console.log(`👋 ${session.username} left room`);
    });

    socket.on('room:ready', ({ isReady }) => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room) return;

        // Update player ready status
        const player = room.players.find((p: any) => p.id === session.userId);
        if (player) {
            player.isReady = isReady;

            // Broadcast update
            io.to(session.roomCode).emit('room:updated', room);

            console.log(`${session.username} is ${isReady ? 'ready' : 'not ready'}`);
        }
    });

    socket.on('room:start', ({ }) => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.hostId !== session.userId) {
            socket.emit('room:error', { message: 'Only host can start game' });
            return;
        }

        // Check if enough players are ready
        const readyPlayers = room.players.filter((p: any) => p.isReady || p.isHost);
        if (readyPlayers.length < 2) {
            socket.emit('room:error', { message: 'Need at least 2 ready players' });
            return;
        }

        // Start game
        room.state = 'playing';

        // Initialize game state from room players
        const gameState = initializeMultiplayerGame(room.players, room.rules);
        room.gameState = gameState;
        room.version = 0;
        room.autoplay = new Set();
        room.stats = {};

        io.to(session.roomCode).emit('game:started', { gameState });
        scheduleAuto(room);

        console.log(`🎮 Game started in room ${session.roomCode} with ${room.players.length} players`);
    });

    // Chat: short, rate-limited text; the last 50 messages are kept for people who rejoin
    socket.on('chat:send', ({ text }) => {
        const session = sessions.get(socket.id);
        const room = session?.roomCode && rooms.get(session.roomCode);
        if (!room || typeof text !== 'string') return;
        const clean = text.trim().slice(0, 200);
        const now = Date.now();
        if (!clean || now - (session.lastChat || 0) < 500) return;
        session.lastChat = now;
        const message = { from: session.userId, username: session.username, text: clean, at: now };
        room.chat = [...(room.chat || []), message].slice(-50);
        io.to(room.code).emit('chat:message', message);
    });

    // After a game: back to the lobby with the same people (and bots), ready flags cleared
    socket.on('room:rematch', () => {
        const session = sessions.get(socket.id);
        const room = session?.roomCode && rooms.get(session.roomCode);
        if (!room || room.hostId !== session.userId || room.state !== 'finished') return;
        stopAuto(room);
        room.players = room.players.filter((p: any) => p.isBot || p.isConnected);
        room.players.forEach((p: any) => (p.isReady = !!p.isBot));
        room.state = 'waiting';
        room.gameState = null;
        room.stats = {};
        room.autoplay = new Set();
        io.to(room.code).emit('room:updated', room);
        io.to(room.code).emit('room:rematch', { room });
    });

    // Host picks the house rules in the lobby
    socket.on('room:setRules', ({ rules }) => {
        const session = sessions.get(socket.id);
        const room = session?.roomCode && rooms.get(session.roomCode);
        if (!room || room.hostId !== session.userId || room.state !== 'waiting') return;
        room.rules = sanitizeRules(rules);
        io.to(room.code).emit('room:updated', room);
    });

    // Bots fill empty seats; the host adds and removes them in the lobby
    const PLAYER_COLORS = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF'];
    socket.on('room:addBot', () => {
        const session = sessions.get(socket.id);
        const room = session?.roomCode && rooms.get(session.roomCode);
        if (!room || room.hostId !== session.userId || room.state !== 'waiting') return;
        if (room.players.length >= room.maxPlayers) {
            socket.emit('room:error', { message: 'Room is full' });
            return;
        }
        const n = room.players.filter((p: any) => p.isBot).length + 1;
        const used = room.players.map((p: any) => p.color);
        room.players.push({
            id: `bot_${Date.now()}_${n}`,
            username: `Bot ${n}`,
            socketId: null,
            color: PLAYER_COLORS.find((c) => !used.includes(c)) || '#FFFFFF',
            isReady: true,
            isConnected: true,
            isHost: false,
            isBot: true,
        });
        io.to(room.code).emit('room:updated', room);
    });

    socket.on('room:removeBot', ({ botId }) => {
        const session = sessions.get(socket.id);
        const room = session?.roomCode && rooms.get(session.roomCode);
        if (!room || room.hostId !== session.userId || room.state !== 'waiting') return;
        room.players = room.players.filter((p: any) => !(p.isBot && p.id === botId));
        io.to(room.code).emit('room:updated', room);
    });

    // ============================================================================
    // GAME ACTIONS
    // ============================================================================
    // Every action goes through game(): it finds the room, checks the game phase,
    // checks the acting player, runs the shared engine, then broadcasts the result.

    type Ctx = { gs: any; me: any; current: any };
    type Rule = {
        phase?: string;              // required gameState.phase (default 'playing')
        turnPhase?: string;          // required turnPhase
        currentOnly?: boolean;       // only the player whose turn it is
        who?: (c: Ctx) => number | undefined; // the one player allowed to act
    };

    function game(event: string, rule: Rule, run: (c: Ctx, data: any) => any) {
        socket.on(event, (data: any = {}) => {
            const session = sessions.get(socket.id);
            const room = session?.roomCode && rooms.get(session.roomCode);
            if (!room || room.state !== 'playing' || !room.gameState) return;

            const gs = room.gameState;
            const me = gs.players.find((p: any) => p.id === session.userId);
            const c: Ctx = { gs, me, current: gs.players[gs.currentPlayerIndex] };
            const reject = (message: string) => socket.emit('game:error', { message });

            if (!me || me.isBankrupt) return reject('You are not in this game');
            if (gs.phase !== (rule.phase ?? 'playing')) return reject(`Not allowed during ${gs.phase}`);
            if (rule.currentOnly && c.current.id !== me.id) return reject('Not your turn');
            if (rule.turnPhase && gs.turnPhase !== rule.turnPhase) return reject(`Not allowed now (${gs.turnPhase})`);
            if (rule.who && rule.who(c) !== me.id) return reject('Not your decision');

            let next = run(c, data);
            if (!next || next === gs) return reject('Action not allowed');

            room.autoplay?.delete(me.id); // they are back at the keyboard
            publish(room, next);
        });
    }

    const rollDie = () => Math.floor(Math.random() * 6) + 1;
    const rollTwo = (): [number, number] => [rollDie(), rollDie()];

    // Turn flow
    game('game:rollDice', { currentOnly: true, turnPhase: 'roll' }, ({ gs }) => rollTurn(gs, rollTwo()));
    game('game:rollForJail', { currentOnly: true, turnPhase: 'injail' }, ({ gs }) => rollForJailTurn(gs, rollTwo()));
    game('game:payJailFine', { currentOnly: true, turnPhase: 'injail' }, ({ gs, me }) => leaveJail(gs, me.id, 'fine'));
    game('game:useJailCard', { currentOnly: true, turnPhase: 'injail' }, ({ gs, me }) => leaveJail(gs, me.id, 'card'));
    game('game:endTurn', { currentOnly: true, turnPhase: 'endturn' }, ({ gs }) => endTurn(gs));

    // Property purchase
    game('game:buyProperty', { currentOnly: true, turnPhase: 'action' }, ({ gs, me }) =>
        canBuyProperty(gs, me.id, me.position) ? buyProperty(gs, me.id, me.position) : null);
    game('game:declineProperty', { currentOnly: true, turnPhase: 'action' }, ({ gs, me }) =>
        startAuction(gs, me.position));

    // Property management (current player, any point in their turn)
    game('game:buildHouse', { currentOnly: true }, ({ gs, me }, { position }) =>
        canBuildHouse(gs, me.id, position) ? buildHouse(gs, me.id, position) : null);
    game('game:sellHouse', { currentOnly: true }, ({ gs, me }, { position }) =>
        canSellHouse(gs, me.id, position) ? sellHouse(gs, me.id, position) : null);
    game('game:mortgage', { currentOnly: true }, ({ gs, me }, { position }) =>
        canMortgage(gs, me.id, position) ? mortgageProperty(gs, me.id, position) : null);
    game('game:unmortgage', { currentOnly: true }, ({ gs, me }, { position }) =>
        canUnmortgage(gs, me.id, position) ? unmortgageProperty(gs, me.id, position) : null);

    // Auction (engine enforces whose bid it is)
    game('game:placeBid', { phase: 'auction' }, ({ gs, me }, { amount }) =>
        Number.isFinite(amount) ? placeBid(gs, me.id, amount) : null);
    game('game:passAuction', { phase: 'auction' }, ({ gs, me }) => passAuction(gs, me.id));

    // Trading: only the proposer proposes, only the recipient answers
    game('game:proposeTrade', { currentOnly: true }, ({ gs, me }, { offer }) => {
        if (!offer) return null;
        const next = proposeTrade(gs, {
            fromPlayer: me.id,
            toPlayer: offer.toPlayer,
            offeredProperties: offer.offeredProperties || [],
            offeredMoney: Math.max(0, Number(offer.offeredMoney) || 0),
            offeredCards: Math.max(0, Number(offer.offeredCards) || 0),
            requestedProperties: offer.requestedProperties || [],
            requestedMoney: Math.max(0, Number(offer.requestedMoney) || 0),
            requestedCards: Math.max(0, Number(offer.requestedCards) || 0),
        });
        return next.phase === 'trade' ? next : null;
    });
    game('game:acceptTrade', { phase: 'trade', who: ({ gs }) => gs.trade?.toPlayer }, ({ gs }) => acceptTrade(gs));
    game('game:declineTrade', { phase: 'trade', who: ({ gs }) => gs.trade?.toPlayer }, ({ gs }) => declineTrade(gs));

    // Bankruptcy: only the player who owes
    game('game:attemptPayment', { phase: 'bankruptcy', who: ({ gs }) => gs.bankruptcyState?.playerId }, ({ gs }) => {
        const b = gs.bankruptcyState;
        return attemptPayment(gs, b.playerId, b.amountOwed, b.creditorId, b.reason);
    });
    game('game:declareBankruptcy', { phase: 'bankruptcy', who: ({ gs }) => gs.bankruptcyState?.playerId }, ({ gs }) => {
        const b = gs.bankruptcyState;
        return declareBankruptcy(gs, b.playerId, b.creditorId);
    });

    // ============================================================================
    // DISCONNECTION
    // ============================================================================

    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);

        const session = sessions.get(socket.id);
        sessions.delete(socket.id);
        // Ignore stale sockets that were already replaced by a reconnect
        if (!session || session.socketId !== socket.id) return;

        const room = session.roomCode && rooms.get(session.roomCode);
        if (room) {
            const player = room.players.find((p: any) => p.id === session.userId);
            if (player) player.isConnected = false;
            if (room.hostId === session.userId) migrateHost(room);
            io.to(room.code).emit('room:updated', room);
            scheduleAuto(room); // if it was their turn, the offline timer starts
        }
        // Keep the seat for the grace period, then drop the player
        session.timer = setTimeout(() => dropUser(session), GRACE_MS);
    });
});

// Serve React app for all other routes (must be after API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Helper function to generate room code
function generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        if (i === 4) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ---------------------------------------------------------------------------
// Persistence: rooms and identities are snapshotted to a JSON file so a restart
// doesn't end every game. shortcut: single-file snapshot every 2s (a crash can lose
// the last couple of seconds); move to Redis/SQLite when running more than one server.
// ---------------------------------------------------------------------------
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '../../data/state.json');

const serialise = () =>
    JSON.stringify(
        { rooms: [...rooms.values()], users: [...users.values()] },
        (key, value) => (key === 'timer' ? undefined : value instanceof Set ? [...value] : value)
    );

let lastSaved = '';
function saveState() {
    try {
        const data = serialise();
        if (data === lastSaved) return;
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE + '.tmp', data);
        fs.renameSync(DATA_FILE + '.tmp', DATA_FILE); // atomic swap: never a half-written file
        lastSaved = data;
    } catch (err) {
        console.error('⚠️ Could not save state:', err);
    }
}

function loadState() {
    try {
        if (!fs.existsSync(DATA_FILE)) return;
        const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        for (const room of saved.rooms || []) {
            // Nobody is connected yet; bots always are
            room.players.forEach((p: any) => {
                p.isConnected = !!p.isBot;
                p.socketId = null;
            });
            room.autoplay = new Set(room.autoplay || []);
            rooms.set(room.code, room);
        }
        for (const user of saved.users || []) {
            user.socketId = null;
            users.set(user.token, user);
            // Everyone gets the normal grace period to come back
            user.timer = setTimeout(() => dropUser(user), GRACE_MS);
        }
        rooms.forEach((room) => scheduleAuto(room));
        console.log(`♻️  Restored ${rooms.size} room(s) and ${users.size} player(s)`);
    } catch (err) {
        console.error('⚠️ Could not load saved state (starting empty):', err);
    }
}

loadState();
setInterval(saveState, 2000).unref();
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
        saveState();
        process.exit(0);
    });
}

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
});
