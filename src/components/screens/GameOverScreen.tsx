import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Player, GameState } from '@/game/types';
import { finalStandings } from '@/game/stats';
import { Button } from '@/components/ui/button';
import { Money, Pawn } from '@/components/game/kit';
import { Shell } from '@/components/screens/Shell';
import { onRematch, requestRematch, removeListener, Room } from '@/services/socket';

interface GameOverScreenProps {
  gameState: GameState;
  winner: Player;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  /** Online games: where a rematch leads */
  online?: { onRematch: (room: Room) => void };
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ gameState, winner, onPlayAgain, onMainMenu, online }) => {
  const reduce = useReducedMotion();
  const standings = finalStandings(gameState, {});

  useEffect(() => {
    if (!online) return;
    const handler = ({ room }: { room: Room }) => online.onRematch(room);
    onRematch(handler);
    return () => removeListener('room:rematch', handler);
  }, [online]);

  return (
    <Shell onBack={onMainMenu} backLabel="Main menu" width="form">
      <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center gap-4">
          <Pawn color={winner.color} name={winner.name} size={56} />
          <h1 className="font-display text-4xl leading-tight">{winner.name} wins</h1>
        </div>

        <ol className="mt-8 divide-y divide-border border-y border-border" aria-label="Final standings">
          {standings.map((row, i) => {
            const player = gameState.players.find((p) => p.id === row.playerId)!;
            return (
              <li key={row.playerId} className="flex min-h-14 items-center gap-3 py-2">
                <span className="w-5 text-[14px] tabular-nums text-muted-foreground">{i + 1}</span>
                <Pawn color={player.color} name={player.name} size={30} dim={row.isBankrupt} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{player.name}</p>
                  <p className="text-[12px] text-muted-foreground">{row.isBankrupt ? 'Bankrupt' : `${row.properties} deed${row.properties === 1 ? '' : 's'}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-muted-foreground">Net worth</p>
                  <Money value={row.netWorth} showDelta={false} className="text-[16px] font-semibold" />
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          {online ? (
            <Button size="lg" className="flex-1" onClick={requestRematch}>
              Rematch
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={onPlayAgain}>
              Play again
            </Button>
          )}
          <Button size="lg" variant="secondary" className="flex-1" onClick={onMainMenu}>
            Main menu
          </Button>
        </div>
      </motion.div>
    </Shell>
  );
};
