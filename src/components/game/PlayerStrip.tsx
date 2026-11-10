import React from 'react';
import { Player } from '@/game/types';
import { Money, Pawn } from '@/components/game/kit';
import { cn } from '@/lib/utils';

/** Phones: everyone's cash on one line, always in view. Tapping it opens the full player cards. */
export const PlayerStrip: React.FC<{ players: Player[]; currentId?: string; onOpen: () => void }> = ({ players, currentId, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    aria-label={`Cash: ${players.map((p) => `${p.name} $${p.money}`).join(', ')}. Open player details`}
    // Five or six players wrap onto a second row instead of shrinking the numbers
    className="grid min-h-11 w-full shrink-0 grid-cols-[repeat(auto-fit,minmax(5.25rem,1fr))] gap-1 rounded-[6px] border border-border bg-card p-1"
  >
    {players.map((p) => (
      <span
        key={p.id}
        // Money flying between players lands here (see ChipFlights)
        data-seat={p.id}
        className={cn(
          'flex items-center justify-center gap-1.5 rounded-[4px] px-1 py-1',
          p.id === currentId && 'bg-gold/[0.08] ring-1 ring-gold/60',
          p.isBankrupt && 'opacity-45 grayscale'
        )}
      >
        <Pawn color={p.color} name={p.name} size={22} dim={p.isBankrupt} />
        <Money value={p.money} className="text-[13px] font-semibold" />
      </span>
    ))}
  </button>
);
