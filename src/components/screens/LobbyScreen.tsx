import React, { useState, useEffect } from 'react';
import {
    Users,
    Copy,
    CheckCircle2,
    LogOut,
    Play,
    User as UserIcon,
    Crown,
    Loader2,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    onRoomUpdated,
    onPlayerJoined,
    onPlayerLeft,
    onRoomError,
    onGameStarted,
    Room,
    RoomPlayer,
    removeListener
} from '@/services/socket';
import { toast } from 'sonner';

interface LobbyScreenProps {
    currentUser: { id: string; username: string };
    onBack: () => void;
    onGameStarted: (gameState: any) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
    currentUser,
    onBack,
    onGameStarted: handleGameStartedProp
}) => {
    const [room, setRoom] = useState<Room | null>(null);
    const [roomCodeInput, setRoomCodeInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [view, setView] = useState<'selection' | 'waiting'>('selection');

    useEffect(() => {
        console.log('🔧 LobbyScreen: Setting up event listeners');

        // Listen for room updates
        onRoomUpdated((updatedRoom) => {
            console.log('📝 Room updated:', updatedRoom);
            setRoom(updatedRoom);
        });

        onPlayerJoined(({ player, room: updatedRoom }) => {
            console.log('👋 Player joined:', player);
            setRoom(updatedRoom);
            toast.success(`${player.username} joined the room`);
        });

        onPlayerLeft(({ playerId, room: updatedRoom }) => {
            console.log('👋 Player left:', playerId);
            setRoom(updatedRoom);
            toast.info(`A player left the room`);
        });

        onRoomError(({ message }) => {
            console.log('❌ Room error:', message);
            toast.error(message);
            setIsLoading(false);
        });

        onGameStarted(({ gameState }) => {
            console.log('🎮 LobbyScreen: Game started event received!', gameState);
            console.log('🎮 Calling handleGameStartedProp with:', gameState);
            handleGameStartedProp(gameState);
        });

        console.log('✅ LobbyScreen: All event listeners registered');

        return () => {
            console.log('🧹 LobbyScreen: Cleaning up listeners');
        };
    }, [handleGameStartedProp]);

    const handleCreateRoom = async () => {
        setIsLoading(true);
        try {
            const response = await createRoom();
            setRoom(response.room);
            setView('waiting');
        } catch (error) {
            toast.error('Failed to create room');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinRoom = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!roomCodeInput.trim()) {
            toast.error('Please enter a room code');
            return;
        }

        setIsLoading(true);
        try {
            const response = await joinRoom(roomCodeInput.trim().toUpperCase());
            if (response.success && response.room) {
                setRoom(response.room);
                setView('waiting');
            } else {
                toast.error(response.error || 'Failed to join room');
            }
        } catch (error) {
            toast.error('Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveRoom = async () => {
        try {
            await leaveRoom();
            setRoom(null);
            setView('selection');
        } catch (error) {
            toast.error('Error leaving room');
        }
    };

    const handleToggleReady = () => {
        if (!room) return;
        const player = room.players.find(p => p.id === currentUser.id);
        if (player) {
            toggleReady(!player.isReady);
        }
    };

    const handleStartGame = () => {
        console.log('🚀 LobbyScreen: Start Game button clicked');
        startGame();
    };

    const copyRoomCode = () => {
        if (room?.code) {
            navigator.clipboard.writeText(room.code);
            setIsCopied(true);
            toast.success('Room code copied to clipboard');
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const isHost = room?.hostId === currentUser.id;
    const currentPlayer = room?.players.find(p => p.id === currentUser.id);
    const readyCount = room?.players.filter(p => p.isReady || p.isHost).length || 0;
    const canStart = isHost && (room?.players.length || 0) >= 2 && readyCount >= (room?.players.length || 0);

    if (view === 'selection') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-background/50 relative overflow-hidden">
                <div className="absolute top-1/4 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -left-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

                <button
                    onClick={onBack}
                    className="absolute top-8 left-8 p-2 rounded-full hover:bg-white/5 transition-colors group"
                >
                    <ArrowLeft className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    {/* Create Room */}
                    <div className="glass-card p-10 flex flex-col items-center text-center gap-6 border border-white/10 hover:border-primary/30 transition-all group">
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-display gold-text mb-2">Host a Room</h2>
                            <p className="text-muted-foreground">Create a private room and invite your friends to play</p>
                        </div>
                        <Button
                            onClick={handleCreateRoom}
                            disabled={isLoading}
                            className="w-full py-6 text-lg font-bold btn-monopoly h-14"
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Create Private Room'}
                        </Button>
                    </div>

                    {/* Join Room */}
                    <div className="glass-card p-10 flex flex-col items-center text-center gap-6 border border-white/10 hover:border-accent/30 transition-all group">
                        <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ChevronRight className="w-10 h-10 text-accent" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-display text-accent mb-2">Join a Room</h2>
                            <p className="text-muted-foreground">Enter a room code shared by your friend</p>
                        </div>
                        <form onSubmit={handleJoinRoom} className="w-full space-y-4">
                            <Input
                                placeholder="ENTER ROOM CODE"
                                value={roomCodeInput}
                                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                                className="text-center font-mono text-xl tracking-widest h-14 bg-background/50 border-white/10"
                            />
                            <Button
                                type="submit"
                                disabled={isLoading || !roomCodeInput}
                                variant="secondary"
                                className="w-full py-6 text-lg font-bold h-14 bg-accent hover:bg-accent/90 text-accent-foreground"
                            >
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Join Room'}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col p-8 bg-gradient-to-b from-background to-background/50">
            <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12 animate-fade-in">

                {/* Left Column: Room Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6 border border-white/10">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">Room Status</h3>
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <p className="text-xs text-muted-foreground mb-1 uppercase">Room Code</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-mono font-bold tracking-tighter text-foreground">{room?.code}</span>
                                    <button
                                        onClick={copyRoomCode}
                                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        {isCopied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-2">
                                <span className="text-sm text-muted-foreground">Players</span>
                                <span className="text-sm font-bold text-foreground">{room?.players.length} / 6</span>
                            </div>

                            <div className="flex items-center justify-between px-2">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <span className="text-sm font-bold text-green-500 animate-pulse">Waiting for Players...</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button
                            onClick={handleToggleReady}
                            variant={currentPlayer?.isReady ? "outline" : "default"}
                            className={`w-full py-6 text-lg font-bold h-14 transition-all ${currentPlayer?.isReady ? 'border-primary/50 text-primary' : 'btn-monopoly'}`}
                        >
                            {currentPlayer?.isReady ? (
                                <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> I'm Ready</span>
                            ) : (
                                "Mark as Ready"
                            )}
                        </Button>

                        {isHost && (
                            <Button
                                onClick={handleStartGame}
                                disabled={!canStart}
                                className="w-full py-6 text-lg font-bold h-14 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20 disabled:opacity-50"
                            >
                                <Play className="w-5 h-5 mr-2" /> Start Game
                            </Button>
                        )}

                        {!canStart && isHost && (
                            <p className="text-xs text-center text-muted-foreground px-4">
                                Wait for at least 2 players and everyone to be ready
                            </p>
                        )}

                        <Button
                            onClick={handleLeaveRoom}
                            variant="ghost"
                            className="w-full py-4 text-muted-foreground hover:text-destructive transition-colors"
                        >
                            <LogOut className="w-4 h-4 mr-2" /> Leave Room
                        </Button>
                    </div>
                </div>

                {/* Right Column: Player List */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-8 border border-white/10 min-h-[400px]">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-display gold-text">Participants</h2>
                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-muted-foreground">
                                Official Rules Applied
                            </div>
                        </div>

                        <div className="space-y-4">
                            {room?.players.map((player) => (
                                <div
                                    key={player.id}
                                    className={`
                    p-6 rounded-2xl border transition-all flex items-center justify-between
                    ${player.id === currentUser.id ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/5'}
                  `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-inner"
                                                style={{ backgroundColor: `${player.color}20`, color: player.color }}
                                            >
                                                {player.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div
                                                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg">{player.username}</span>
                                                {player.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                                                {player.id === currentUser.id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold uppercase tracking-tighter">You</span>}
                                            </div>
                                            <span className="text-xs text-muted-foreground">{player.isHost ? 'Room Manager' : 'Challenger'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {player.isReady || player.isHost ? (
                                            <div className="flex items-center gap-2 text-green-500 font-medium text-sm">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>{player.isHost ? 'Ready (Host)' : 'Ready'}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Thinking...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Empty Slots */}
                            {Array.from({ length: 6 - (room?.players.length || 0) }).map((_, i) => (
                                <div
                                    key={`empty-${i}`}
                                    className="p-6 rounded-2xl border border-dashed border-white/5 bg-transparent flex items-center justify-center opacity-30"
                                >
                                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Empty Seat</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
