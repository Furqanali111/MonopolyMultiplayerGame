import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';
import type { PropertyColor } from '@/game/constants';
import { cn } from '@/lib/utils';

// Board group colours, tuned for the dark ground (same values as the --property-* tokens)
export const PROPERTY_HEX: Record<PropertyColor, string> = {
  brown: '#8B5A3C',
  lightblue: '#7CCBF0',
  pink: '#E0609E',
  orange: '#F28C38',
  red: '#DB4B4B',
  yellow: '#F2CF45',
  green: '#3FAE6A',
  blue: '#3D6FD6',
  railroad: '#6C7584',
  utility: '#9CA5B4',
};

export const PROPERTY_LABEL: Record<PropertyColor, string> = {
  brown: 'Brown',
  lightblue: 'Light blue',
  pink: 'Pink',
  orange: 'Orange',
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  railroad: 'Railroad',
  utility: 'Utility',
};

/** Dark ink on light fills, bone on dark fills. */
export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.5 ? '#0E1116' : '#F3EFE6';
}

/**
 * A player as a casino chip: solid colour, dashed edge, and their initial.
 * The initial is what tells players apart, so colour is never the only signal.
 */
export const Pawn: React.FC<{
  color: string;
  name: string;
  size?: number;
  className?: string;
  dim?: boolean;
}> = ({ color, name, size = 28, className, dim }) => (
  <span
    aria-hidden
    className={cn('relative inline-grid shrink-0 place-items-center rounded-full font-semibold leading-none', className)}
    style={{
      width: size,
      height: size,
      background: color,
      color: readableOn(color),
      fontSize: Math.max(9, size * 0.42),
      opacity: dim ? 0.4 : 1,
      boxShadow: '0 1px 0 rgba(0,0,0,.6), 0 3px 6px -2px rgba(0,0,0,.7), inset 0 0 0 1.5px rgba(14,17,22,.55)',
    }}
  >
    <span
      className="absolute inset-[2px] rounded-full"
      style={{ border: `${Math.max(1.5, size * 0.07)}px dashed ${readableOn(color)}`, opacity: 0.55 }}
    />
    <span className="relative">{name.charAt(0).toUpperCase()}</span>
  </span>
);

/**
 * Cash. Counts to the new value and floats the change above it, so money
 * moving is something you see rather than a number that silently differs.
 */
export const Money: React.FC<{ value: number; className?: string; showDelta?: boolean }> = ({
  value,
  className,
  showDelta = true,
}) => {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const [delta, setDelta] = useState<{ id: number; amount: number } | null>(null);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    const from = previous.current;
    previous.current = value;
    if (showDelta) setDelta({ id: Date.now(), amount: value - from });
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduce, showDelta]);

  useEffect(() => {
    if (!delta) return;
    const t = setTimeout(() => setDelta(null), 1600);
    return () => clearTimeout(t);
  }, [delta]);

  return (
    <span className={cn('relative inline-block tabular-nums', className)}>
      ${shown.toLocaleString()}
      <AnimatePresence>
        {delta && delta.amount !== 0 && (
          <motion.span
            key={delta.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: -16 }}
            exit={{ opacity: 0, y: -22 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'pointer-events-none absolute -top-1 right-0 z-10 whitespace-nowrap text-[11px] font-semibold',
              delta.amount > 0 ? 'text-felt-light' : 'text-ruby-text'
            )}
          >
            {delta.amount > 0 ? '+' : '−'}${Math.abs(delta.amount).toLocaleString()}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

/** A ring that drains toward a deadline, with the seconds left in the middle. */
export const CountdownRing: React.FC<{ at: number | null; total?: number; size?: number; className?: string }> = ({
  at,
  total = 90,
  size = 34,
  className,
}) => {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!at) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((at - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [at]);

  if (!at) return null;
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(1, left / total);
  const urgent = left <= 10;

  return (
    <span
      role="timer"
      aria-label={`${left} seconds left`}
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={2.5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={urgent ? 'hsl(var(--ruby-text))' : 'hsl(var(--gold))'}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 250ms linear, stroke 200ms' }}
        />
      </svg>
      <span className={cn('absolute text-[10px] font-semibold tabular-nums', urgent ? 'text-ruby-text' : 'text-foreground')}>
        {left}
      </span>
    </span>
  );
};

/** Section label used inside panels. Sentence case, no eyebrow styling. */
export const PanelTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn('text-[13px] font-semibold text-muted-foreground', className)} {...props} />
);
