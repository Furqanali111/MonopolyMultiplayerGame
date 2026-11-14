import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from 'motion/react';

interface GameLogProps {
  logs: string[];
  className?: string;
}

/** The running record of the table. The newest line is brightest. */
export const GameLog: React.FC<GameLogProps> = ({ logs, className }) => {
  const endRef = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [logs.length, reduce]);

  const shown = logs.slice(-80);

  return (
    <ol className={cn('space-y-1.5 text-[13px] leading-snug', className)} aria-live="polite" aria-label="Game log">
      {shown.map((line, i) => (
        <li key={logs.length - shown.length + i} className={i === shown.length - 1 ? 'text-foreground' : 'text-muted-foreground'}>
          {line}
        </li>
      ))}
      <li ref={endRef} aria-hidden />
    </ol>
  );
};
