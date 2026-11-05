import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { spring } from '@/lib/motion';

const COLORS = ['#14161c', '#3D6FD6', '#3DD68C', '#E5566D', '#f3efe4'];
const PER_CHIP = 150; // dollars each chip stands for, so the $1,500 start is a stack of ten
const MAX = 14;

/** A little stack of chips that grows and shrinks with a player's cash: a read on who is rich without reading numbers. */
export const ChipStack: React.FC<{ money: number }> = ({ money }) => {
  const reduce = useReducedMotion();
  const count = Math.min(MAX, Math.max(0, Math.round(money / PER_CHIP)));

  return (
    <div aria-hidden className="relative h-12 w-8 shrink-0">
      <AnimatePresence initial={false}>
        {Array.from({ length: count }, (_, i) => (
          <motion.span
            key={i}
            className="absolute left-0 block h-[10px] w-full rounded-[50%]"
            style={{
              bottom: i * 3,
              background: COLORS[i % COLORS.length],
              // The edge of the chip below the face, and a dashed rim like a casino chip
              boxShadow: '0 2px 0 rgba(0,0,0,.55), inset 0 0 0 1.5px rgba(255,255,255,.35)',
            }}
            initial={reduce ? false : { y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: -12, opacity: 0, transition: { duration: 0.2 } }}
            transition={spring}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
