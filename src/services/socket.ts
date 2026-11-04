import { io, Socket } from 'socket.io-client';
import { GameState, TradeOffer, HouseRules } from '@/game/types';
import type { GameEvent } from '@/game/events';

// Socket.IO client instance
let socket: Socket | null = null;
let hasConnectedBefore = false;

// Identity token: lets a refresh or dropped connection get the same seat back.
const TOKEN_KEY = 'monopoly:token';
const getToken = (): string | null => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
const saveToken = (token?: string) => {
    try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
};

// Backend URL - in production, connect to same origin (same port)
// In development, connect to backend dev server
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;

/**
 * Initialize Socket.IO connection
 */
export const initializeSocket = (): Socket => {
    if (socket && socket.connected) {
        return socket;
    }

    socket = io(BACKEND_URL, {
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
    });

    // Connection event listeners
    socket.on('connect', () => {
        console.log('✅ Connected to server:', socket?.id);
        // Socket.IO reconnected with a new socket id: reclaim our seat
        if (hasConnectedBefore) resume();
        hasConnectedBefore = true;
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from server:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });

    return socket;
};

/**
 * Get current socket instance
 */
export const getSocket = (): Socket | null => {
    return socket;
};

/**
 * Connect to server
 */
export const connectSocket = (): void => {
    if (!socket) {
        initializeSocket();
    }
    socket?.connect();
};

/**
 * Disconnect from server
 */
export const disconnectSocket = (): void => {
    socket?.disconnect();
};

// ============================================================================
// AUTHENTICATION EVENTS
// ============================================================================

export interface LoginResponse {
    success: boolean;
    userId?: string;
    username?: string;
    token?: string;
    room?: Room | null;
    error?: string;
}

/**
 * Login with username (guest login)
 */
export const login = (username: string): Promise<LoginResponse> => {
    return new Promise((resolve) => {
        socket?.emit('auth:login', { username }, (response: LoginResponse) => {
            if (response.success) saveToken(response.token);
            resolve(response);
        });
    });
};

/**
 * Reclaim the previous identity (and room, if any) using the stored token.
 */
export const resume = (): Promise<LoginResponse | null> => {
    const token = getToken();
    if (!token || !socket) return Promise.resolve(null);
    return new Promise((resolve) => {
        socket!.emit('auth:login', { token }, (response: LoginResponse) => {
            if (!response.success) saveToken(undefined); // token expired on the server
            resolve(response.success ? response : null);
        });
    });
};

/**
 * On page load: connect and resume the saved session, if there is one.
 */
export const resumeSession = async (): Promise<LoginResponse | null> => {
    if (!getToken()) return null;
    const s = socket ?? initializeSocket();
    if (!s.connected) {
        await new Promise<void>((done) => {
            s.once('connect', () => done());
            s.once('connect_error', () => done());
            s.connect();
        });
    }
    return s.connected ? resume() : null;
};

// ============================================================================
// ROOM EVENTS
// ============================================================================

export interface Room {
    code: string;
    hostId: string;
    players: RoomPlayer[];
    maxPlayers: number;
    rules: HouseRules;
    state: 'waiting' | 'playing' | 'finished';
    gameState: GameState | null;
    createdAt: Date;
}

export interface RoomPlayer {
    id: string;
    username: string;
    socketId: string;
    color: string;
    isReady: boolean;
    isConnected: boolean;
    isHost: boolean;
    isBot?: boolean;
}

export interface CreateRoomResponse {
    roomCode: string;
    room: Room;
}

export interface JoinRoomResponse {
    success: boolean;
    room?: Room;
    error?: string;
}

/**
 * Create a new room
 */
export const createRoom = (): Promise<CreateRoomResponse> => {
    return new Promise((resolve) => {
        socket?.emit('room:create', {}, (response: CreateRoomResponse) => {
            resolve(response);
        });
    });
};

/**
 * Join an existing room
 */
export const joinRoom = (roomCode: string): Promise<JoinRoomResponse> => {
    return new Promise((resolve) => {
        socket?.emit('room:join', { roomCode }, (response: JoinRoomResponse) => {
            resolve(response);
        });
    });
};

/**
 * Leave current room
 */
export const leaveRoom = (): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
        socket?.emit('room:leave', {}, (response: { success: boolean }) => {
            resolve(response);
        });
    });
};

/**
 * Toggle ready status
 */
export const toggleReady = (isReady: boolean): void => {
    socket?.emit('room:ready', { isReady });
};

/**
 * Host: fill a seat with a bot / remove one
 */
export const setRules = (rules: HouseRules): void => {
    socket?.emit('room:setRules', { rules });
};
export const addBot = (): void => {
    socket?.emit('room:addBot', {});
};
export const removeBot = (botId: string): void => {
    socket?.emit('room:removeBot', { botId });
};

/**
 * Start game (host only)
 */
export const startGame = (): void => {
    socket?.emit('room:start', {});
};

// ============================================================================
// GAME ACTION EVENTS
// ============================================================================

/**
 * Roll dice
 */
export const rollDice = (): void => {
    socket?.emit('game:rollDice', {});
};

/**
 * Buy property
 */
export const buyProperty = (): void => {
    socket?.emit('game:buyProperty', {});
};

/**
 * Decline property (start auction)
 */
export const declineProperty = (): void => {
    socket?.emit('game:declineProperty', {});
};

/**
 * Place bid in auction
 */
export const placeBid = (amount: number): void => {
    socket?.emit('game:placeBid', { amount });
};

/**
 * Pass on auction
 */
export const passAuction = (): void => {
    socket?.emit('game:passAuction', {});
};

/**
 * Build house
 */
export const buildHouse = (position: number): void => {
    socket?.emit('game:buildHouse', { position });
};

/**
 * Sell house
 */
export const sellHouse = (position: number): void => {
    socket?.emit('game:sellHouse', { position });
};

/**
 * Mortgage property
 */
export const mortgageProperty = (position: number): void => {
    socket?.emit('game:mortgage', { position });
};

/**
 * Unmortgage property
 */
export const unmortgageProperty = (position: number): void => {
    socket?.emit('game:unmortgage', { position });
};

/**
 * Propose trade
 */
export const proposeTrade = (offer: Omit<TradeOffer, 'active'>): void => {
    socket?.emit('game:proposeTrade', { offer });
};

/**
 * Accept trade
 */
export const acceptTrade = (): void => {
    socket?.emit('game:acceptTrade', {});
};

/**
 * Decline trade
 */
export const declineTrade = (): void => {
    socket?.emit('game:declineTrade', {});
};

/**
 * End turn
 */
export const endTurn = (): void => {
    socket?.emit('game:endTurn', {});
};

/**
 * Pay jail fine
 */
export const payJailFine = (): void => {
    socket?.emit('game:payJailFine', {});
};

/**
 * Use jail card
 */
export const useJailCard = (): void => {
    socket?.emit('game:useJailCard', {});
};

/**
 * Roll for jail
 */
export const rollForJail = (): void => {
    socket?.emit('game:rollForJail', {});
};

/**
 * Attempt payment (bankruptcy)
 */
export const attemptPayment = (): void => {
    socket?.emit('game:attemptPayment', {});
};

/**
 * Declare bankruptcy
 */
export const declareBankruptcy = (): void => {
    socket?.emit('game:declareBankruptcy', {});
};

// ============================================================================
// HOST MIGRATION EVENTS
// ============================================================================

/**
 * Accept host migration
 */
export const acceptHostMigration = (): void => {
    socket?.emit('host:acceptMigration', {});
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Listen for room updates
 */
export const onRoomUpdated = (callback: (room: Room) => void): void => {
    socket?.on('room:updated', callback);
};

/**
 * Listen for player joined
 */
export const onPlayerJoined = (callback: (data: { player: RoomPlayer; room: Room }) => void): void => {
    socket?.on('room:playerJoined', callback);
};

/**
 * Listen for player left
 */
export const onPlayerLeft = (callback: (data: { playerId: string; room: Room }) => void): void => {
    socket?.on('room:playerLeft', callback);
};

/**
 * Listen for room errors
 */
export const onRoomError = (callback: (data: { message: string }) => void): void => {
    socket?.on('room:error', callback);
};

/**
 * Listen for game started
 */
export const onGameStarted = (callback: (data: { gameState: GameState }) => void): void => {
    socket?.on('game:started', callback);
};

/**
 * Listen for game state updates
 */
export const onGameStateUpdate = (callback: (data: { gameState: GameState; events?: GameEvent[]; seq?: number }) => void): void => {
    socket?.on('game:stateUpdate', callback);
};

/**
 * Listen for the acting player's deadline / a stand-in move for an absent player
 */
export const onGameDeadline = (callback: (data: { playerId: string; at: number }) => void): void => {
    socket?.on('game:deadline', callback);
};
export const onGameAutoplayed = (callback: (data: { playerId: string }) => void): void => {
    socket?.on('game:autoplayed', callback);
};

/**
 * Listen for game ended
 */
export const onGameEnded = (callback: (data: { winner: any; finalState: GameState }) => void): void => {
    socket?.on('game:ended', callback);
};

/**
 * Listen for game errors
 */
export const onGameError = (callback: (data: { message: string }) => void): void => {
    socket?.on('game:error', callback);
};

/**
 * Listen for host disconnected
 */
export const onHostDisconnected = (callback: (data: { message: string }) => void): void => {
    socket?.on('host:disconnected', callback);
};

/**
 * Listen for host migration offer
 */
export const onHostMigrationOffer = (callback: (data: { timeout: number }) => void): void => {
    socket?.on('host:offerMigration', callback);
};

/**
 * Listen for host migrated
 */
export const onHostMigrated = (callback: (data: { newHostId: string; newHostName: string }) => void): void => {
    socket?.on('host:migrated', callback);
};

/**
 * Listen for host migration failed
 */
export const onHostMigrationFailed = (callback: (data: { reason: string }) => void): void => {
    socket?.on('host:migrationFailed', callback);
};

/**
 * Remove all event listeners
 */
export const removeAllListeners = (): void => {
    socket?.removeAllListeners();
};

/**
 * Remove specific event listener
 */
export const removeListener = (event: string, callback: (...args: any[]) => void): void => {
    socket?.off(event, callback);
};
