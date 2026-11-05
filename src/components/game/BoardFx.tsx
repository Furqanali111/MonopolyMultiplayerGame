import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Gavel } from 'lucide-react';
import { dur, ease, spring } from '@/lib/motion';

export type Fx = { id: number; kind: 'go' | 'jail' | 'sold'; delay: number; label?: string };

/** Short full-board flourish: a gold pulse for GO, falling bars for jail, a gavel for an auction win. Never takes clicks. */
export const BoardFx: React.FC<{ fx: Fx | null; onDone: () => void }> = ({ fx, onDone }) => {
  const reduce = useReducedMotion();
  if (!fx || reduce) return null;

  if (fx.kind === 'sold') {
    return (
      <motion.div
        key={fx.id}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 1, 0] }}
        transition={{ duration: 1.6, delay: fx.delay, times: [0, 0.8, 1] }}
        onAnimationComplete={onDone}
      >
        <motion.div
          className="flex flex-col items-center gap-1 rounded-[6px] border border-gold/60 bg-background/90 px-6 py-3 text-center"
          initial={{ scale: 1.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring, delay: fx.delay }}
        >
          <motion.span
            className="text-gold"
            style={{ originX: 1, originY: 1 }}
            initial={{ rotate: -40 }}
            animate={{ rotate: 0 }}
            transition={{ ...spring, delay: fx.delay + 0.1 }}
          >
            <Gavel className="h-7 w-7" />
          </motion.span>
          <span className="font-display text-2xl leading-none text-gold">Sold</span>
          <span className="text-[13px] tabular-nums text-foreground">{fx.label}</span>
        </motion.div>
      </motion.div>
    );
  }

  if (fx.kind === 'go') {
    return (
      <motion.div
        key={fx.id}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[6px]"
        style={{ background: 'radial-gradient(circle at 50% 50%, hsl(var(--gold) / .5), transparent 65%)' }}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: [0, 1, 0], scale: [0.7, 1.05, 1.15] }}
        transition={{ duration: dur.slow * 1.4, delay: fx.delay, ease: ease.out, times: [0, 0.3, 1] }}
        onAnimationComplete={onDone}
      />
    );
  }

  return (
    <motion.div
      key={fx.id}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 flex justify-evenly overflow-hidden rounded-[6px] bg-destructive/15"
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 1.3, delay: fx.delay, times: [0, 0.7, 1] }}
      onAnimationComplete={onDone}
    >
      {Array.from({ length: 7 }).map((_, i) => (
        <motion.span
          key={i}
          className="h-full w-[1.6%] bg-bone/80"
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          transition={{ delay: fx.delay + i * 0.05, duration: dur.base, ease: ease.out }}
        />
      ))}
    </motion.div>
  );
};
