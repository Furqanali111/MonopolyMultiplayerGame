import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

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

// Game initialization function for multiplayer
function initializeMultiplayerGame(roomPlayers: any[]) {
    // Shuffle cards
    const chanceCards = shuffleArray([...CHANCE_CARDS]);
    const communityChestCards = shuffleArray([...COMMUNITY_CHEST_CARDS]);

    // Create players from room participants
    const players = roomPlayers.map((roomPlayer, index) => ({
        id: roomPlayer.id,
        name: roomPlayer.username,
        color: roomPlayer.color,
        money: 1500,
        position: 0,
        isAI: false,
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

    socket.on('auth:login', ({ username }, callback) => {
        console.log(`🔐 Login attempt: ${username}`);

        // Validate username
        if (!username || username.length < 3 || username.length > 15) {
            callback({
                success: false,
                error: 'Username must be 3-15 characters',
            });
            return;
        }

        // Create session
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessions.set(socket.id, {
            userId,
            username,
            socketId: socket.id,
            roomCode: null,
        });

        callback({
            success: true,
            userId,
            username,
        });

        console.log(`✅ User logged in: ${username} (${userId})`);
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
        if (room) {
            // Remove player from room
            room.players = room.players.filter((p: any) => p.id !== session.userId);

            // If room is empty, delete it
            if (room.players.length === 0) {
                rooms.delete(session.roomCode);
                console.log(`🗑️ Room deleted: ${session.roomCode}`);
            } else {
                // If host left, assign new host
                if (room.hostId === session.userId && room.players.length > 0) {
                    room.hostId = room.players[0].id;
                    room.players[0].isHost = true;
                    console.log(`👑 New host: ${room.players[0].username}`);
                }

                // Notify remaining players
                io.to(session.roomCode).emit('room:playerLeft', {
                    playerId: session.userId,
                    room,
                });
            }
        }

        socket.leave(session.roomCode);
        session.roomCode = null;

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
        const gameState = initializeMultiplayerGame(room.players);
        room.gameState = gameState;

        io.to(session.roomCode).emit('game:started', { gameState });

        console.log(`🎮 Game started in room ${session.roomCode} with ${room.players.length} players`);
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

            next = applyWinCondition(next);
            room.gameState = next;
            io.to(room.code).emit('game:stateUpdate', { gameState: next });
            if (next.phase === 'gameover' && gs.phase !== 'gameover') {
                room.state = 'finished';
                io.to(room.code).emit('game:ended', { winner: next.winner, finalState: next });
            }
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
        if (session && session.roomCode) {
            const room = rooms.get(session.roomCode);
            if (room) {
                const player = room.players.find((p: any) => p.id === session.userId);
                if (player) {
                    player.isConnected = false;

                    // TODO: Implement host migration logic
                    // TODO: Implement reconnection timeout

                    io.to(session.roomCode).emit('room:updated', room);
                }
            }
        }

        sessions.delete(socket.id);
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

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
});
