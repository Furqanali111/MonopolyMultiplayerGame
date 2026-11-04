import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GameState } from '@/game/types';
import { getPropertyData } from '@/game/engine';
import { Pawn, PROPERTY_HEX } from '@/components/game/kit';

interface TradeOfferDialogProps {
  gameState: GameState;
  /** True when the person at this screen is the one who has to answer */
  canRespond: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const Side: React.FC<{ title: string; properties: number[]; money: number; cards: number }> = ({ title, properties, money, cards }) => {
  const nothing = !properties.length && !money && !cards;
  return (
    <section className="space-y-2">
      <h3 className="text-[13px] font-semibold text-muted-foreground">{title}</h3>
      {nothing && <p className="text-[14px] text-muted-foreground">Nothing</p>}
      <ul className="space-y-1.5">
        {properties.map((pos) => {
          const prop = getPropertyData(pos);
          return (
            <li key={pos} className="flex items-center gap-2 text-[14px]">
              <span className="h-4 w-1.5 shrink-0 rounded-[1px]" style={{ background: prop?.color ? PROPERTY_HEX[prop.color] : '#6C7584' }} aria-hidden />
              {prop?.name}
            </li>
          );
        })}
        {money > 0 && <li className="text-[14px] font-semibold tabular-nums">${money.toLocaleString()} cash</li>}
        {cards > 0 && <li className="text-[14px]">{cards} jail card{cards > 1 ? 's' : ''}</li>}
      </ul>
    </section>
  );
};

/** An open offer. Everyone sees it; only the person it was made to can answer. */
export const TradeOfferDialog: React.FC<TradeOfferDialogProps> = ({ gameState, canRespond, onAccept, onDecline }) => {
  const trade = gameState.trade;
  if (!trade || !trade.active) return null;
  const from = gameState.players.find((p) => p.id === trade.fromPlayer);
  const to = gameState.players.find((p) => p.id === trade.toPlayer);
  if (!from || !to) return null;

  return (
    <Dialog open>
      <DialogContent className="max-w-xl [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
          <Pawn color={from.color} name={from.name} size={26} />
          {from.name} offers a trade to {to.name}
        </DialogTitle>
        <DialogDescription className="sr-only">Review what each side gives, then accept or decline.</DialogDescription>

        <div className="grid gap-4 border-y border-border py-4 sm:grid-cols-2">
          <Side title={`${from.name} gives`} properties={trade.offeredProperties} money={trade.offeredMoney} cards={trade.offeredCards} />
          <Side title={`${to.name} gives`} properties={trade.requestedProperties} money={trade.requestedMoney} cards={trade.requestedCards} />
        </div>

        {canRespond ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onDecline}>
              Decline
            </Button>
            <Button className="flex-1" onClick={onAccept}>
              Accept trade
            </Button>
          </div>
        ) : (
          <p className="text-[14px] text-muted-foreground" aria-live="polite">
            Waiting for <span className="font-semibold text-foreground">{to.name}</span> to answer.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
