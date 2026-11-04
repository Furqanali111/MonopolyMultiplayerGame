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
    movePlayer,
    resolveTile,
    buyProperty,
    startAuction,
    placeBid,
    passAuction,
    finalizeAuction,
    buildHouse,
    sellHouse,
    mortgageProperty,
    unmortgageProperty,
    releaseFromJail,
    incrementJailTurn,
    proposeTrade,
    acceptTrade,
    declineTrade,
    declareBankruptcy,
    attemptPayment,
} from './game/engine';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, BOARD_TILES } from './game/constants';

const app = express();
const httpServer = createServer(app);

// Configure CORS
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build (production)
const frontendPath = path.join(__dirname, '../../dist');
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

    socket.on('game:rollDice', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        // Verify it's this player's turn
        if (currentPlayer.id !== session.userId) {
            socket.emit('game:error', { message: 'Not your turn' });
            return;
        }

        // If player is in jail, they should use 'game:rollForJail' instead
        if (currentPlayer.inJail) {
            socket.emit('game:error', { message: 'You are in jail. Use the jail actions to attempt escape.' });
            return;
        }

        // Roll dice
        const dice: [number, number] = [
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1
        ];

        gameState.lastDiceRoll = dice;
        const diceSum = dice[0] + dice[1];

        console.log(`🎲 ${currentPlayer.name} rolled ${dice[0]} and ${dice[1]}`);

        // Use engine to move player (handles passing GO automatically)
        // IMPORTANT: movePlayer expects player ID, not index!
        gameState = movePlayer(gameState, currentPlayer.id, diceSum);

        // Get the tile name for the new position from the UPDATED gameState
        const updatedPlayer = gameState.players[gameState.currentPlayerIndex];
        const newPosition = updatedPlayer.position;
        const tileName = BOARD_TILES[newPosition]?.name || `Position ${newPosition}`;

        // Add a log entry with the tile name
        gameState.gameLog.push(`${currentPlayer.name} rolled ${dice[0]} and ${dice[1]}, landed on ${tileName}`);

        // Use resolveTile to handle what happens when landing on this tile
        // This handles: properties, chance/community chest, taxes, jail, etc.
        // IMPORTANT: resolveTile also expects player ID, not index!
        gameState = resolveTile(gameState, currentPlayer.id);

        // Update room state
        room.gameState = gameState;

        // Broadcast updated state to all players
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });
    });

    socket.on('game:buyProperty', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.id !== session.userId) return;

        // Use game engine to buy property at current position
        gameState = buyProperty(
            gameState,
            currentPlayer.id,
            currentPlayer.position
        );

        // After buying, set turn phase to 'endturn' so player can end their turn
        // (unless they rolled doubles, then they can roll again)
        const updatedPlayer = gameState.players[gameState.currentPlayerIndex];
        if (updatedPlayer.doublesCount > 0) {
            gameState.turnPhase = 'roll';
        } else {
            gameState.turnPhase = 'endturn';
        }

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`🏠 ${currentPlayer.name} bought property at position ${currentPlayer.position}`);
    });

    socket.on('game:declineProperty', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.id !== session.userId) return;

        // Start auction for the property using game engine
        gameState = startAuction(gameState, currentPlayer.position);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`📢 Auction started for position ${currentPlayer.position}`);
    });

    socket.on('game:endTurn', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.id !== session.userId) return;

        // Reset turn phase for next player
        gameState.turnPhase = 'roll';
        gameState.currentCard = null;

        // Move to next active (non-bankrupt) player
        let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        while (gameState.players[nextIndex].isBankrupt && nextIndex !== gameState.currentPlayerIndex) {
            nextIndex = (nextIndex + 1) % gameState.players.length;
        }

        gameState.currentPlayerIndex = nextIndex;
        const nextPlayer = gameState.players[nextIndex];
        gameState.gameLog.push(`${nextPlayer.name}'s turn`);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`⏭️  Turn ended, now ${nextPlayer.name}'s turn`);
    });

    // ============================================================================
    // PROPERTY MANAGEMENT
    // ============================================================================

    socket.on('game:buildHouse', ({ position }: { position: number }) => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.id !== session.userId) return;

        gameState = buildHouse(gameState, currentPlayer.id, position);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`🏗️  ${currentPlayer.name} built house at position ${position}`);
    });

    socket.on('game:sellHouse', ({ position }: { position: number }) => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.id !== session.userId) return;

        gameState = sellHouse(gameState, currentPlayer.id, position);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`💰 ${currentPlayer.name} sold house at position ${position}`);
    });

    socket.on('game:mortgage', ({ position }: { position: number }) => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.id !== session.userId) return;

        gameState = mortgageProperty(gameState, currentPlayer.id, position);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`🏦 ${currentPlayer.name} mortgaged property at position ${position}`);
    });

    socket.on('game:unmortgage', ({ position }: { position: number }) => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.id !== session.userId) return;

        gameState = unmortgageProperty(gameState, currentPlayer.id, position);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`🔓 ${currentPlayer.name} unmortgaged property at position ${position}`);
    });

    // ============================================================================
    // AUCTION SYSTEM
    // ============================================================================

    socket.on('game:placeBid', ({ amount }: { amount: number }) => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;

        console.log(`🔍 AUCTION BID DEBUG:`);
        console.log(`  - Socket ID: ${socket.id}`);
        console.log(`  - Session User ID: ${session.userId}`);
        console.log(`  - Session Username: ${session.username}`);
        console.log(`  - Bid Amount: $${amount}`);
        console.log(`  - Current Auction State:`, gameState.auction);

        // Find this player's ID
        const player = gameState.players.find((p: any) => p.id === session.userId);
        if (!player) {
            console.log(`❌ Player not found for userId: ${session.userId}`);
            return;
        }

        console.log(`  - Found Player:`, { id: player.id, name: player.name });

        gameState = placeBid(gameState, session.userId, amount);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`💰 ${player.name} bid $${amount}`);
    });

    socket.on('game:passAuction', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;

        const player = gameState.players.find((p: any) => p.id === session.userId);
        if (!player) return;

        gameState = passAuction(gameState, session.userId);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`👋 ${player.name} passed on auction`);
    });

    // ============================================================================
    // JAIL ACTIONS
    // ============================================================================

    socket.on('game:payJailFine', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.id !== session.userId) return;

        gameState = releaseFromJail(gameState, currentPlayer.id, 'fine');

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`💵 ${currentPlayer.name} paid jail fine`);
    });

    socket.on('game:useJailCard', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.id !== session.userId) return;

        gameState = releaseFromJail(gameState, currentPlayer.id, 'card');

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`🎴 ${currentPlayer.name} used Get Out of Jail Free card`);
    });

    socket.on('game:rollForJail', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];

        if (currentPlayer.id !== session.userId) return;

        // Roll dice
        const dice: [number, number] = [
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1
        ];
        gameState.lastDiceRoll = dice;

        // Check if doubles
        if (dice[0] === dice[1]) {
            // Released from jail!
            gameState = releaseFromJail(gameState, currentPlayer.id, 'doubles');
            console.log(`🎲 ${currentPlayer.name} rolled doubles (${dice[0]}, ${dice[1]}) and escaped jail!`);

            // Move the player
            const diceSum = dice[0] + dice[1];
            gameState = movePlayer(gameState, currentPlayer.id, diceSum);
            gameState = resolveTile(gameState, currentPlayer.id);
        } else {
            // Increment jail turn count
            gameState = incrementJailTurn(gameState, currentPlayer.id);
            console.log(`🎲 ${currentPlayer.name} rolled (${dice[0]}, ${dice[1]}) - not doubles, still in jail`);

            // End their turn since they didn't escape
            gameState.turnPhase = 'endturn';
        }

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });
    });

    // ============================================================================
    // TRADING
    // ============================================================================

    socket.on('game:proposeTrade', ({ trade }: { trade: any }) => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;

        const fromIndex = gameState.players.findIndex((p: any) => p.id === session.userId);
        if (fromIndex === -1) return;

        gameState = proposeTrade(gameState, {
            fromPlayer: fromIndex,
            toPlayer: trade.toPlayerId,
            offeredProperties: trade.offeredProperties || [],
            offeredMoney: trade.offeredMoney || 0,
            offeredCards: trade.offeredCards || 0,
            requestedProperties: trade.requestedProperties || [],
            requestedMoney: trade.requestedMoney || 0,
            requestedCards: trade.requestedCards || 0,
        });

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`🤝 ${gameState.players[fromIndex].name} proposed a trade`);
    });

    socket.on('game:acceptTrade', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;

        gameState = acceptTrade(gameState);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`✅ Trade accepted`);
    });

    socket.on('game:declineTrade', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;

        gameState = declineTrade(gameState);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`❌ Trade declined`);
    });

    // ============================================================================
    // BANKRUPTCY
    // ============================================================================

    socket.on('game:declareBankruptcy', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;

        if (!gameState.bankruptcyState) return;

        const { playerId, creditorId } = gameState.bankruptcyState;

        gameState = declareBankruptcy(gameState, playerId, creditorId);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`💔 Player ${playerId} declared bankruptcy`);
    });

    socket.on('game:attemptPayment', () => {
        const session = sessions.get(socket.id);
        if (!session || !session.roomCode) return;

        const room = rooms.get(session.roomCode);
        if (!room || room.state !== 'playing' || !room.gameState) return;

        let gameState = room.gameState;

        if (!gameState.bankruptcyState) return;

        const { playerId, amountOwed, creditorId, reason } = gameState.bankruptcyState;

        gameState = attemptPayment(gameState, playerId, amountOwed, creditorId, reason);

        room.gameState = gameState;
        io.to(session.roomCode).emit('game:stateUpdate', { gameState });

        console.log(`💰 Player ${playerId} attempted payment`);
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
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
