import React from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { spring } from '@/lib/motion';

/**
 * A card that turns in on entry and leans toward the pointer while it hovers, like a real card
 * held in the hand. Touch and reduced motion get the plain card.
 */
export const Tilt: React.FC<{ children: React.ReactNode; className?: string; max?: number }> = ({ children, className, max = 7 }) => {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [max, -max]), { stiffness: 180, damping: 18 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-max, max]), { stiffness: 180, damping: 18 });

  const lean = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const rest = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <motion.div
      initial={reduce ? false : { rotateY: 80, y: 24, opacity: 0 }}
      animate={{ rotateY: 0, y: 0, opacity: 1 }}
      transition={spring}
      style={{ transformPerspective: 900 }}
    >
      {/* The entry flip and the hover lean are separate layers so neither fights the other */}
      <motion.div className={className} onPointerMove={lean} onPointerLeave={rest} style={{ rotateX, rotateY, transformPerspective: 900 }}>
        {children}
      </motion.div>
    </motion.div>
  );
};
