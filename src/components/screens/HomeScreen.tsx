import React, { useEffect, useState } from 'react';
import { initializeSocket, connectSocket } from '@/services/socket';
import { Users, Cpu, MonitorPlay } from 'lucide-react';

interface HomeScreenProps {
  onStartGame: () => void;
  onCreateRoom: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStartGame, onCreateRoom }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize and connect to Socket.IO
    const socket = initializeSocket();

    // Check initial connection status
    setIsConnected(socket.connected);

    const onConnect = () => {
      console.log('HomeScreen: Socket connected');
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log('HomeScreen: Socket disconnected');
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    connectSocket();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-background/50">
      {/* Connection Status Badge */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/50 backdrop-blur-sm border border-border shadow-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-medium text-muted-foreground">
            {isConnected ? 'Servers Online' : 'Servers Offline'}
          </span>
        </div>
      </div>

      {/* Logo */}
      <div className="text-center mb-12 animate-bounce-in">
        <div className="inline-block p-3 rounded-2xl bg-primary/10 mb-4">
          <MonitorPlay className="w-12 h-12 text-primary" />
        </div>
        <h1 className="font-display text-6xl md:text-8xl gold-text tracking-wider mb-2">
          MONOPOLY
        </h1>
        <p className="text-muted-foreground text-lg tracking-[0.3em] font-light">
          MASTER EDITION
        </p>
      </div>

      {/* Game Mode Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl animate-fade-in">
        {/* Single Player Option */}
        <button
          onClick={onStartGame}
          className="glass-card p-8 flex flex-col items-center gap-4 transition-all hover:scale-[1.02] hover:bg-primary/5 border border-white/10 group"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Cpu className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-foreground mb-1">Play with AI</h3>
            <p className="text-sm text-muted-foreground">
              Challenge smart computer opponents offline
            </p>
          </div>
          <div className="mt-2 px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all">
            Start Offline
          </div>
        </button>

        {/* Multiplayer Option */}
        <button
          onClick={onCreateRoom}
          disabled={!isConnected}
          className={`
            glass-card p-8 flex flex-col items-center gap-4 transition-all border border-white/10 group
            ${isConnected
              ? 'hover:scale-[1.02] hover:bg-accent/5 cursor-pointer text-foreground'
              : 'opacity-50 cursor-not-allowed'}
          `}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isConnected ? 'bg-accent/10 group-hover:bg-accent/20' : 'bg-muted'}`}>
            <Users className={`w-8 h-8 ${isConnected ? 'text-accent' : 'text-muted-foreground'}`} />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold mb-1">Online Multiplayer</h3>
            <p className="text-sm text-muted-foreground">
              Create a room and play with friends online
            </p>
          </div>
          <div className={`
            mt-2 px-6 py-2 rounded-full text-sm font-bold shadow-lg transition-all
            ${isConnected
              ? 'bg-accent text-accent-foreground shadow-accent/20 group-hover:shadow-accent/40'
              : 'bg-muted text-muted-foreground shadow-none'}
          `}>
            {isConnected ? 'Create Room' : 'Coming Soon'}
          </div>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-muted-foreground text-sm max-w-md animate-fade-in opacity-80">
        <p className="mb-2">
          A premium digital Monopoly experience with full official rules.
        </p>
        <p className="text-xs font-medium uppercase tracking-widest text-primary/60">
          Built for Global Competition
        </p>
      </div>
    </div>
  );
};
