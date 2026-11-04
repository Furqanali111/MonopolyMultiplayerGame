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
 * Money moving is shown, not just counted: chips leave the payer and land with the receiver
 * (rent, cards), or travel between a seat and the felt (bank), or the Free Parking tile (pot).
 * It watches every player's cash and the pot, so it works the same for single player and online.
 */
export const ChipFlights: React.FC<{ players: Player[]; pot: number }> = ({ players, pot }) => {
  const reduce = useReducedMotion();
  const previous = useRef(new Map<string, number>());
  const previousPot = useRef(pot);
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    const deltas = players.map((p) => ({ p, d: previous.current.has(p.id) ? p.money - previous.current.get(p.id)! : 0 }));
    const potDelta = pot - previousPot.current;
    previous.current = new Map(players.map((p) => [p.id, p.money]));
    previousPot.current = pot;
    if (reduce) return;

    const well = centreOf(document.querySelector('.well'));
    const potTile = centreOf(document.querySelector('[data-tile="20"]')) ?? well;
    const seat = (id: string) => centreOf(document.querySelector(`[data-seat="${id}"]`));
    const losers = deltas.filter((x) => x.d < 0).map((x) => ({ ...x, left: -x.d }));
    const winners = deltas.filter((x) => x.d > 0).map((x) => ({ ...x, left: x.d }));
    const made: Flight[] = [];
    let at = 0; // start time of the next group, so several payments read one after another

    const send = (from: Point | null, to: Point | null, amount: number, color: string) => {
      if (!from || !to || amount <= 0) return;
      const count = Math.min(8, Math.max(2, Math.round(amount / 50)));
      for (let i = 0; i < count; i++) made.push({ id: Math.random(), from, to, color, delay: at + i * 0.09 });
      at += 0.35;
    };

    // Tax into the pot: the payer's chips land on Free Parking
    if (potDelta > 0) {
      const payer = losers.find((l) => l.left >= potDelta) ?? losers[0];
      if (payer) {
        send(seat(payer.p.id), potTile, potDelta, payer.p.color);
        payer.left -= potDelta;
      }
    }
    // Pot collected: chips rise out of Free Parking to whoever landed there
    if (potDelta < 0) {
      const taker = winners.find((w) => w.left >= -potDelta) ?? winners[0];
      if (taker) {
        send(potTile, seat(taker.p.id), -potDelta, taker.p.color);
        taker.left += potDelta;
      }
    }

    // Player to player (rent, trades, "pay each player"): spread each payer's chips over the receivers
    const owed = losers.reduce((n, l) => n + Math.max(0, l.left), 0);
    const due = winners.reduce((n, w) => n + Math.max(0, w.left), 0);
    if (owed > 0 && owed === due) {
      losers.forEach((l) => winners.forEach((w) => send(seat(l.p.id), seat(w.p.id), (l.left * w.left) / due, l.p.color)));
    } else {
      // Otherwise it is the bank: tax, fines, GO, card payouts
      losers.forEach((l) => send(seat(l.p.id), well, l.left, l.p.color));
      winners.forEach((w) => send(well, seat(w.p.id), w.left, w.p.color));
    }

    // Each chip removes itself when its own animation ends (see onAnimationComplete below),
    // so a re-render in the middle of a flight can never strand it in state.
    if (made.length) setFlights((f) => [...f, ...made]);
  }, [players, pot, reduce]);

  if (!flights.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden>
      {flights.map((f) => (
        <motion.span
          key={f.id}
          initial={{ x: f.from.x - 11, y: f.from.y - 11, opacity: 0, scale: 0.6 }}
          animate={{ x: f.to.x - 11, y: f.to.y - 11, opacity: [0, 1, 1, 0], scale: [0.6, 1.05, 1, 0.8] }}
          transition={{ delay: f.delay, duration: 1.1, ease: [0.4, 0, 0.2, 1], times: [0, 0.15, 0.8, 1] }}
          onAnimationComplete={() => setFlights((all) => all.filter((x) => x.id !== f.id))}
          className="absolute left-0 top-0 block h-[22px] w-[22px] rounded-full"
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
