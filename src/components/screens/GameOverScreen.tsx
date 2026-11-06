import React, { lazy, Suspense, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Player, GameState } from '@/game/types';
import { finalStandings } from '@/game/stats';
import { Button } from '@/components/ui/button';
import { Money, Pawn } from '@/components/game/kit';
import { Shell } from '@/components/screens/Shell';
import { Fallback } from '@/components/game/Fallback';
import { webglAvailable } from '@/lib/webgl';

const WinnerPiece = lazy(() => import('@/components/game/WinnerPiece'));
import { PLAYER_COLORS } from '@/game/constants';
import { onRematch, requestRematch, removeListener, Room, type FinalStanding } from '@/services/socket';
import { toast } from 'sonner';
import { Share2 } from 'lucide-react';

interface GameOverScreenProps {
  gameState: GameState;
  winner: Player;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  /** Online games: where a rematch leads */
  online?: { onRematch: (room: Room) => void };
  /** Server standings with per-player stats (online games) */
  standings?: FinalStanding[];
}

const money = (n: number) => `$${n.toLocaleString()}`;

/** One burst of paper pieces from the top, in the player colours. Falls once, then is gone. */
const Confetti: React.FC = () => {
  const pieces = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({
      x: Math.random() * 100,
      drift: (Math.random() - 0.5) * 18,
      spin: (Math.random() - 0.5) * 900,
      delay: Math.random() * 0.5,
      dur: 2.4 + Math.random() * 1.4,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute -top-3 block h-3 w-1.5 rounded-[1px]"
          style={{ left: `${p.x}%`, background: p.color }}
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: '105dvh', x: `${p.drift}vw`, rotate: p.spin, opacity: [1, 1, 0] }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
};

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ gameState, winner, onPlayAgain, onMainMenu, online, standings: served }) => {
  const reduce = useReducedMotion();
  const standings = served ?? finalStandings(gameState, {});

  // shortcut: shares a text summary; an image card would need canvas drawing
  const share = async () => {
    const text = [
      `${winner.name} won our Monopoly game!`,
      ...standings.map((r, i) => `${i + 1}. ${r.name}: ${r.isBankrupt ? 'bankrupt' : money(r.netWorth)}`),
      window.location.origin,
    ].join('\n');
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('Result copied');
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  useEffect(() => {
    if (!online) return;
    const handler = ({ room }: { room: Room }) => online.onRematch(room);
    onRematch(handler);
    return () => removeListener('room:rematch', handler);
  }, [online]);

  return (
    <Shell onBack={onMainMenu} backLabel="Main menu" width="form">
      {!reduce && <Confetti />}
      <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center gap-4">
          {!reduce && webglAvailable() ? (
            <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`${winner.name}'s piece`}>
              <Fallback fallback={<Pawn color={winner.color} name={winner.name} size={56} />}>
                <Suspense fallback={<Pawn color={winner.color} name={winner.name} size={56} />}>
                  <WinnerPiece index={Math.max(0, gameState.players.findIndex((p) => p.id === winner.id))} color={winner.color} />
                </Suspense>
              </Fallback>
            </div>
          ) : (
            <Pawn color={winner.color} name={winner.name} size={56} />
          )}
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
                  {served && (
                    <p className="text-[12px] text-muted-foreground">
                      {row.turns} turns · {row.doubles} doubles · {row.timesJailed} in jail · paid {money(row.moneyPaid)} · got {money(row.moneyReceived)}
                    </p>
                  )}
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
          <Button size="lg" variant="secondary" className="flex-1" onClick={share}>
            <Share2 /> Share result
          </Button>
          <Button size="lg" variant="secondary" className="flex-1" onClick={onMainMenu}>
            Main menu
          </Button>
        </div>
      </motion.div>
    </Shell>
  );
};
