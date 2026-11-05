import React from 'react';
import { ArrowRightLeft, Hammer, Lock, Undo2, Unlock } from 'lucide-react';
import { GameState } from '@/game/types';
import { BOARD_TILES } from '@/game/constants';
import { canBuildHouse, canMortgage, canSellHouse, canUnmortgage, getPropertyData, getPropertyOwner, hasMonopoly } from '@/game/engine';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tilt } from '@/components/game/Tilt';
import { Pawn, PROPERTY_HEX, PROPERTY_LABEL, readableOn } from '@/components/game/kit';

interface DeedDialogProps {
  position: number | null;
  gameState: GameState;
  onClose: () => void;
  /** Set when the viewer can make an offer right now (their turn) */
  onOffer?: (ownerId: string, position: number) => void;
  viewerId?: string;
  /** Why an offer cannot be sent right now; the button is shown but disabled */
  offerBlocked?: string;
  /** Build, sell and mortgage on the viewer's own deeds; `blocked` says why they are off */
  manage?: {
    blocked?: string;
    onBuild: (position: number) => void;
    onSell: (position: number) => void;
    onMortgage: (position: number) => void;
    onUnmortgage: (position: number) => void;
  };
}

// One label per entry of a property's rent list: base rent, then 1 to 4 houses, then a hotel
const RENT_LABELS = ['Rent', 'With 1 house', 'With 2 houses', 'With 3 houses', 'With 4 houses', 'With a hotel'];

/** The title deed for any tile, opened by tapping it on the board. */
export const DeedDialog: React.FC<DeedDialogProps> = ({ position, gameState, onClose, onOffer, viewerId, offerBlocked, manage }) => {
  if (position === null) return null;
  const tile = BOARD_TILES[position];
  const property = getPropertyData(position);
  const owned = getPropertyOwner(gameState, position);
  const owner = owned && gameState.players.find((p) => p.id === owned.ownerId);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[340px] border-0 bg-transparent p-0 shadow-none sm:p-0">
        <DialogTitle className="sr-only">{tile.name}</DialogTitle>
        <DialogDescription className="sr-only">Title deed and rent schedule</DialogDescription>

        <Tilt className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_28px_70px_-24px_rgba(0,0,0,0.85)]">
        <div
          className="px-5 pb-3 pt-5"
          style={{ background: property?.color ? PROPERTY_HEX[property.color] : 'hsl(var(--ink-raised))', color: property?.color ? readableOn(PROPERTY_HEX[property.color]) : undefined }}
        >
          <h2 className="text-xl font-semibold leading-tight">{tile.name}</h2>
          <p className="mt-0.5 text-[13px]">{property?.color ? PROPERTY_LABEL[property.color] : 'Board space'}</p>
        </div>

        <div className="space-y-4 px-5 pb-5">
          {property ? (
            <>
              <dl className="divide-y divide-border text-[14px] tabular-nums">
                {property.rent.map((amount, i) => {
                  const label =
                    property.type === 'property'
                      ? RENT_LABELS[i]
                      : property.type === 'railroad'
                        ? `${i + 1} railroad${i ? 's' : ''} owned`
                        : i === 0
                          ? '4× the dice, one utility'
                          : '10× the dice, both';
                  return (
                    <React.Fragment key={i}>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium">${amount}</dd>
                      </div>
                      {i === 0 && property.type === 'property' && (
                        <div className="flex justify-between py-1.5">
                          <dt className="text-muted-foreground">Full set, no houses</dt>
                          <dd className="font-medium">${amount * 2}</dd>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </dl>
              <dl className="space-y-1 text-[13px] tabular-nums text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Price</dt>
                  <dd className="text-foreground">${property.price}</dd>
                </div>
                {property.houseCost && (
                  <div className="flex justify-between">
                    <dt>Each house or hotel</dt>
                    <dd className="text-foreground">${property.houseCost}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt>Mortgage value</dt>
                  <dd className="text-foreground">${property.mortgageValue}</dd>
                </div>
              </dl>
              <div className="flex items-center gap-2 border-t border-border pt-3 text-[13px]">
                {owner ? (
                  <>
                    <Pawn color={owner.color} name={owner.name} size={22} />
                    <span>
                      Owned by <span className="font-semibold">{owner.name}</span>
                      {owned?.isMortgaged && <span className="text-ruby-text"> · mortgaged</span>}
                      {owned && owned.houses > 0 && <span className="text-muted-foreground"> · {owned.houses === 5 ? 'hotel' : `${owned.houses} house${owned.houses > 1 ? 's' : ''}`}</span>}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Unowned</span>
                )}
              </div>
            </>
          ) : (
            <p className="text-[14px] text-muted-foreground">
              {tile.type === 'tax' && 'Pay $200 when you land here.'}
              {tile.type === 'luxury' && 'Pay $100 when you land here.'}
              {tile.type === 'go' && 'Collect $200 each time you land on or pass this space.'}
              {tile.type === 'jail' && 'Just visiting, unless you were sent here.'}
              {tile.type === 'gotojail' && 'Go directly to jail. Do not pass GO.'}
              {tile.type === 'free' &&
                (gameState.rules?.freeParkingPot ? `Collect the pot, currently $${(gameState.freeParkingPot ?? 0).toLocaleString()}.` : 'Nothing happens here.')}
              {(tile.type === 'chance' || tile.type === 'community') && 'Draw a card and follow it.'}
            </p>
          )}
          {manage && owned && owner && owner.id === viewerId && property && (() => {
            const can = !manage.blocked;
            const build = can && canBuildHouse(gameState, owner.id, owned.position);
            const sell = can && canSellHouse(gameState, owner.id, owned.position);
            const mortgage = can && canMortgage(gameState, owner.id, owned.position);
            const unmortgage = can && canUnmortgage(gameState, owner.id, owned.position);
            const why =
              manage.blocked ??
              (property.type !== 'property' || build
                ? undefined
                : owned.houses === 5
                  ? 'Fully built.'
                  : !hasMonopoly(gameState, owner.id, owned.position)
                    ? 'Own the whole colour set to build.'
                    : 'To build you need the cash, no mortgage in the set, and an even number of houses across it.');
            return (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  {build && (
                    <Button className="flex-1" onClick={() => manage.onBuild(owned.position)}>
                      <Hammer /> {owned.houses === 4 ? 'Build hotel' : 'Build house'} ${property.houseCost}
                    </Button>
                  )}
                  {sell && (
                    <Button variant="outline" className="flex-1" onClick={() => manage.onSell(owned.position)}>
                      <Undo2 /> Sell ${Math.floor(property.houseCost! / 2)}
                    </Button>
                  )}
                  {mortgage && (
                    <Button variant="outline" className="flex-1" onClick={() => manage.onMortgage(owned.position)}>
                      <Lock /> Mortgage ${property.mortgageValue}
                    </Button>
                  )}
                  {unmortgage && (
                    <Button variant="outline" className="flex-1" onClick={() => manage.onUnmortgage(owned.position)}>
                      <Unlock /> Unmortgage ${Math.floor(property.mortgageValue * 1.1)}
                    </Button>
                  )}
                </div>
                {why && <p className="text-center text-[12px] text-muted-foreground">{why}</p>}
              </div>
            );
          })()}
          {onOffer && owned && owner && owner.id !== viewerId && !owned.isMortgaged && owned.houses === 0 && (
            <div>
              <Button className="w-full" disabled={!!offerBlocked} onClick={() => onOffer(owner.id, owned.position)}>
                <ArrowRightLeft /> Make an offer to {owner.name}
              </Button>
              {offerBlocked && <p className="mt-1.5 text-center text-[12px] text-muted-foreground">{offerBlocked}</p>}
            </div>
          )}
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
        </Tilt>
      </DialogContent>
    </Dialog>
  );
};
