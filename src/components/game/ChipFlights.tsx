import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Player } from '@/game/types';
import { readableOn } from '@/components/game/kit';

interface Point {
  x: number;
  y: number;
}
interface Flight {
  id: number;
  from: Point;
  to: Point;
  color: string;
  delay: number;
}

const centreOf = (el: Element | null): Point | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/**
 * Money moving is shown, not just counted: a few chips leave the payer and land with
 * the receiver (a rent payment), or travel between a seat and the felt (bank, tax, GO).
 * It watches every player's cash, so it works the same for single player and online.
 */
export const ChipFlights: React.FC<{ players: Player[] }> = ({ players }) => {
  const reduce = useReducedMotion();
  const previous = useRef(new Map<string, number>());
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    const deltas = players.map((p) => ({ p, d: previous.current.has(p.id) ? p.money - previous.current.get(p.id)! : 0 }));
    previous.current = new Map(players.map((p) => [p.id, p.money]));
    if (reduce) return;

    const well = centreOf(document.querySelector('.well'));
    const seat = (id: string) => centreOf(document.querySelector(`[data-seat="${id}"]`));
    const losers = deltas.filter((x) => x.d < 0);
    const winners = deltas.filter((x) => x.d > 0);
    const made: Flight[] = [];

    const send = (from: Point | null, to: Point | null, amount: number, color: string) => {
      if (!from || !to) return;
      const count = Math.min(5, Math.max(1, Math.round(amount / 100)));
      for (let i = 0; i < count; i++) made.push({ id: Math.random(), from, to, color, delay: i * 0.07 });
    };

    // Paid straight to another player (rent, trade cash), otherwise to the felt
    losers.forEach((l) => {
      const payee = winners.find((w) => w.d === -l.d);
      send(seat(l.p.id), payee ? seat(payee.p.id) : well, -l.d, l.p.color);
    });
    // Cash from the bank (GO, cards) rises out of the felt
    winners.forEach((w) => {
      if (!losers.some((l) => l.d === -w.d)) send(well, seat(w.p.id), w.d, w.p.color);
    });

    // Each chip removes itself when its own animation ends (see onAnimationComplete below),
    // so a re-render in the middle of a flight can never strand it in state.
    if (made.length) setFlights((f) => [...f, ...made]);
  }, [players, reduce]);

  if (!flights.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden>
      {flights.map((f) => (
        <motion.span
          key={f.id}
          initial={{ x: f.from.x - 9, y: f.from.y - 9, opacity: 0, scale: 0.6 }}
          animate={{ x: f.to.x - 9, y: f.to.y - 9, opacity: [0, 1, 1, 0], scale: [0.6, 1.05, 1, 0.8] }}
          transition={{ delay: f.delay, duration: 0.8, ease: [0.4, 0, 0.2, 1], times: [0, 0.15, 0.8, 1] }}
          onAnimationComplete={() => setFlights((all) => all.filter((x) => x.id !== f.id))}
          className="absolute left-0 top-0 block h-[18px] w-[18px] rounded-full"
          style={{
            background: f.color,
            border: `2px dashed ${readableOn(f.color)}`,
            boxShadow: '0 2px 4px rgba(0,0,0,.6), inset 0 0 0 1px rgba(14,17,22,.5)',
          }}
        />
      ))}
    </div>
  );
};
