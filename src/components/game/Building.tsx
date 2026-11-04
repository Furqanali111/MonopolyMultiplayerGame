import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const FLOOR = 3.7; // height of one floor in the 20 x 20 drawing
const GREEN = '#3DD68C';
const RUBY = '#E5566D';
const GOLD = '#E3B341';
const INK = '#0E1116';

const SIZE = { width: 'clamp(11px,3cqw,28px)', height: 'clamp(11px,3cqw,28px)' };

/**
 * One building per tile that grows with the house count: house 1 is the ground floor,
 * each house after that adds a floor and lifts the roof, and a hotel replaces it with
 * a taller block. `animate` is false while the board first draws, so a game that is
 * loaded or joined shows its buildings at once and only new construction plays out.
 */
export const Building: React.FC<{ houses: number; animate: boolean }> = ({ houses, animate }) => {
  const reduce = useReducedMotion();
  const play = animate && !reduce;
  const spring = { type: 'spring' as const, stiffness: 380, damping: 22 };

  if (houses >= 5) {
    return (
      <svg viewBox="0 0 20 20" style={SIZE} aria-hidden>
        <motion.g
          initial={play ? { opacity: 0, scale: 0.6, y: 4 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
        >
          <rect x="2.6" y="5.4" width="14.8" height="13.6" rx="0.6" fill={RUBY} stroke={INK} strokeWidth="0.7" />
          <rect x="2.6" y="5.4" width="14.8" height="2.2" fill={GOLD} stroke={INK} strokeWidth="0.7" />
          <path d="M10 5.4V1.4l3 1.2-3 1.2" fill={GOLD} stroke={INK} strokeWidth="0.6" strokeLinejoin="round" />
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <rect key={`${row}${col}`} x={4.6 + col * 4.2} y={8.6 + row * 3} width="2.2" height="1.7" fill={INK} opacity="0.75" />
            ))
          )}
          <rect x="8.7" y="15.9" width="2.6" height="3.1" fill={INK} opacity="0.85" />
        </motion.g>
      </svg>
    );
  }

  const roofY = 19 - houses * FLOOR;

  return (
    <svg viewBox="0 0 20 20" style={SIZE} aria-hidden>
      {Array.from({ length: houses }).map((_, i) => (
        <motion.g
          key={i}
          initial={play && i === houses - 1 ? { opacity: 0, scaleY: 0.2 } : false}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={spring}
          style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
        >
          <rect x="4" y={19 - (i + 1) * FLOOR} width="12" height={FLOOR} rx="0.4" fill={GREEN} stroke={INK} strokeWidth="0.7" />
          {i === 0 ? (
            <rect x="8.8" y={19 - 2.5} width="2.4" height="2.5" fill={INK} opacity="0.85" />
          ) : (
            <rect x="8.6" y={19 - (i + 1) * FLOOR + 1} width="2.8" height="1.5" fill={INK} opacity="0.75" />
          )}
        </motion.g>
      ))}
      <motion.g initial={play ? { y: roofY - 6, opacity: 0 } : false} animate={{ y: roofY, opacity: 1 }} transition={spring}>
        <path d="M2.4 0 10 -3.6 17.6 0Z" fill={RUBY} stroke={INK} strokeWidth="0.7" strokeLinejoin="round" />
      </motion.g>
      {play && (
        // A small puff of dust at the foot each time a floor goes up
        <g key={houses}>
          {[4.2, 15.8].map((x) => (
            <motion.circle
              key={x}
              cx={x}
              cy={18.4}
              r={1.1}
              fill="#F3EFE6"
              initial={{ opacity: 0.7, scale: 0.4 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          ))}
        </g>
      )}
    </svg>
  );
};
