import React, { lazy, Suspense, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Bot, Users } from 'lucide-react';
import { initializeSocket, connectSocket } from '@/services/socket';
import { PLAYER_COLORS } from '@/game/constants';
import { Pawn } from '@/components/game/kit';
import { Dice } from '@/components/game/Dice';
import { Fallback } from '@/components/game/Fallback';
import { webglAvailable } from '@/lib/webgl';
import Noise from '@/components/Noise';
import { PRODUCT_DESCRIPTOR, PRODUCT_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

interface HomeScreenProps {
  onStartGame: () => void;
  onCreateRoom: () => void;
}

const PieceShowcase = lazy(() => import('@/components/game/PieceShowcase'));

const NAMES = ['You', 'Alex', 'Jordan', 'Sam', 'Riley', 'Casey'];

/** The table, set for a game: felt, dice, one chip per seat. Authored from the real components. */
const TableArt: React.FC = () => {
  const reduce = useReducedMotion();
  const flatPawns = (
    <div className="absolute inset-x-0 bottom-[10%] flex justify-center gap-[3.2%]">
      {PLAYER_COLORS.map((color, i) => (
        <motion.div
          key={color}
          initial={reduce ? false : { y: 26, opacity: 0, rotate: -8 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.25 + i * 0.07, type: 'spring', stiffness: 260, damping: 20 }}
        >
          <Pawn color={color} name={NAMES[i]} size={44} />
        </motion.div>
      ))}
    </div>
  );
  return (
    <div className="well board relative mx-auto aspect-[5/4] w-full max-w-[520px] overflow-hidden" style={{ borderRadius: 10 }} aria-hidden>
      <Noise opacity={0.14} fps={0} blendMode="soft-light" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="-translate-y-3">
          <Dice values={[4, 3]} isRolling={false} />
        </div>
      </div>
      {!reduce && webglAvailable() ? (
        <div className="absolute inset-x-0 bottom-[2%] h-[48%]">
          <Fallback fallback={flatPawns}>
            <Suspense fallback={null}>
              <PieceShowcase colors={PLAYER_COLORS} />
            </Suspense>
          </Fallback>
        </div>
      ) : (
        flatPawns
      )}
      <div className="absolute inset-x-[8%] top-[10%] flex h-2 overflow-hidden rounded-[2px]">
        {['#8B5A3C', '#7CCBF0', '#E0609E', '#F28C38', '#DB4B4B', '#F2CF45', '#3FAE6A', '#3D6FD6'].map((c) => (
          <span key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStartGame, onCreateRoom }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = initializeSocket();
    setIsConnected(socket.connected);
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    connectSocket();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-end px-4 pt-4">
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground" role="status">
          <span className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-felt-light' : 'bg-ruby')} aria-hidden />
          {isConnected ? 'Servers online' : 'Servers offline'}
        </p>
      </div>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-[clamp(52px,11vw,112px)] leading-[0.95] text-bone"
          >
            {PRODUCT_NAME}
          </motion.h1>
          <p className="mt-3 text-[15px] text-muted-foreground">{PRODUCT_DESCRIPTOR}</p>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted-foreground">
            Roll, buy, build and bankrupt your friends online, or fill the table with bots.
          </p>

          <div className="mt-8 max-w-md space-y-3">
            <button
              type="button"
              onClick={onCreateRoom}
              disabled={!isConnected}
              className="group flex min-h-16 w-full items-center gap-4 rounded-[6px] bg-primary px-4 text-left text-primary-foreground transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Users className="h-6 w-6 shrink-0" />
              <span className="flex-1">
                <span className="block text-[16px] font-semibold">Online multiplayer</span>
                <span className="block text-[13px] opacity-80">Create a room and play with friends online</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
            {!isConnected && <p className="text-[13px] text-ruby-text">Servers are offline, so online rooms are unavailable. Offline play still works.</p>}

            <button
              type="button"
              onClick={onStartGame}
              className="group flex min-h-16 w-full items-center gap-4 rounded-[6px] border border-border px-4 text-left transition-colors hover:border-gold/50 hover:bg-raised"
            >
              <Bot className="h-6 w-6 shrink-0 text-foreground" />
              <span className="flex-1">
                <span className="block text-[16px] font-semibold">Play with AI</span>
                <span className="block text-[13px] text-muted-foreground">Challenge smart computer opponents offline</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        <TableArt />
      </main>
    </div>
  );
};
