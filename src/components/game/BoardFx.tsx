import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { dur, ease } from '@/lib/motion';

export type Fx = { id: number; kind: 'go' | 'jail'; delay: number };

/** Short full-board flourish: a gold pulse for passing GO, falling bars for jail. Sits over the board, never takes clicks. */
export const BoardFx: React.FC<{ fx: Fx | null; onDone: () => void }> = ({ fx, onDone }) => {
  const reduce = useReducedMotion();
  if (!fx || reduce) return null;

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
