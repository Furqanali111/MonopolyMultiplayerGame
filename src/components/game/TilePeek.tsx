import React from 'react';
import { ChevronRight } from 'lucide-react';
import { BOARD_TILES, INCOME_TAX_AMOUNT, LUXURY_TAX_AMOUNT } from '@/game/constants';
import type { GameState } from '@/game/types';
import { PROPERTY_HEX } from '@/components/game/kit';

const NOTE: Record<string, string> = {
  go: 'Collect $200',
  chance: 'Draw a Chance card',
  community: 'Draw a Community Chest card',
  jail: 'Just visiting, or in jail',
  free: 'Free Parking',
  gotojail: 'Go directly to jail',
  tax: `Pay $${INCOME_TAX_AMOUNT}`,
  luxury: `Pay $${LUXURY_TAX_AMOUNT}`,
};

/**
 * Phone boards are too small to print tile names, so a tap shows the tile here, in the middle of
 * the board. For deeds, tapping the card opens the full deed.
 */
export const TilePeek: React.FC<{ position: number; gameState: GameState; onOpen: () => void }> = ({ position, gameState, onOpen }) => {
  const tile = BOARD_TILES[position];
  const property = tile.property;
  const owned = gameState.ownedProperties.find((o) => o.position === position);
  const owner = owned && gameState.players.find((p) => p.id === owned.ownerId);

  const detail = property
    ? [
        `$${property.price}`,
        owner ? `Owned by ${owner.name}` : 'Unowned',
        owned && owned.houses > 0 ? (owned.houses === 5 ? 'hotel' : `${owned.houses} house${owned.houses > 1 ? 's' : ''}`) : null,
        owned?.isMortgaged ? 'mortgaged' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : NOTE[tile.type];

  const body = (
    <>
      <span className="h-9 w-1.5 shrink-0 rounded-sm" style={{ background: property?.color ? PROPERTY_HEX[property.color] : 'hsl(var(--slate-300))' }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-bone">{tile.name}</span>
        <span className="block truncate text-[12px] text-bone/80">{detail}</span>
      </span>
    </>
  );
  const cls = 'flex min-h-12 w-full max-w-[94%] items-center gap-2.5 rounded-md border border-gold/30 bg-black/50 px-3 py-1.5 text-left';

  return property ? (
    <button type="button" onClick={onOpen} className={cls} aria-label={`${tile.name}. ${detail}. Open the full deed`}>
      {body}
      <ChevronRight className="h-4 w-4 shrink-0 text-bone/60" aria-hidden />
    </button>
  ) : (
    <div className={cls} role="status">
      {body}
    </div>
  );
};
