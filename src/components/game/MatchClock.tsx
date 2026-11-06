import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Countdown to a quick game's end. The server owns the real clock; this only displays it. */
export const MatchClock: React.FC<{ endsAt: number }> = ({ endsAt }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const text = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <span
      className={cn('flex items-center gap-1 text-[13px] font-semibold tabular-nums', left <= 60 && 'text-ruby-text')}
      role="timer"
      aria-label={`${text} left in the match`}
    >
      <Timer className="h-4 w-4" aria-hidden /> {text}
    </span>
  );
};
