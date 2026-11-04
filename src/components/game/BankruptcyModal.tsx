import React from 'react';
import { GameState, BankruptcyState } from '@/game/types';
import { getPropertyData, canSellHouse, canMortgage, calculateLiquidAssets } from '@/game/engine';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Money, Pawn, PROPERTY_HEX } from '@/components/game/kit';

interface BankruptcyModalProps {
  gameState: GameState;
  bankruptcyState: BankruptcyState;
  /** True when the person at this screen is the one who owes */
  canAct: boolean;
  onSellHouse: (position: number) => void;
  onMortgage: (position: number) => void;
  onAttemptPayment: () => void;
  onDeclareBankruptcy: () => void;
}

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({
  gameState,
  bankruptcyState,
  canAct,
  onSellHouse,
  onMortgage,
  onAttemptPayment,
  onDeclareBankruptcy,
}) => {
  const player = gameState.players.find((p) => p.id === bankruptcyState.playerId);
  if (!player) return null;
  const creditor = bankruptcyState.creditorId !== null ? gameState.players.find((p) => p.id === bankruptcyState.creditorId) : null;

  const mine = gameState.ownedProperties.filter((p) => p.ownerId === player.id);
  const sellable = mine.filter((p) => canSellHouse(gameState, player.id, p.position));
  const mortgageable = mine.filter((p) => canMortgage(gameState, player.id, p.position));
  const liquid = calculateLiquidAssets(gameState, player.id);
  const canAfford = player.money >= bankruptcyState.amountOwed;
  const shortfall = Math.max(0, bankruptcyState.amountOwed - player.money);

  return (
    <Dialog open>
      <DialogContent className="max-w-lg [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
          <Pawn color={player.color} name={player.name} size={26} />
          {canAct ? 'You owe more than you have' : `${player.name} is raising cash`}
        </DialogTitle>
        <DialogDescription className="text-[14px] text-muted-foreground">
          ${bankruptcyState.amountOwed.toLocaleString()} for {bankruptcyState.reason.toLowerCase()}
          {creditor ? `, owed to ${creditor.name}` : ', owed to the bank'}.
        </DialogDescription>

        <dl className="grid grid-cols-3 divide-x divide-border border border-border text-center" style={{ borderRadius: 6 }}>
          <div className="px-2 py-2.5">
            <dt className="text-[12px] text-muted-foreground">Cash</dt>
            <dd className="text-[17px] font-semibold"><Money value={player.money} showDelta={false} /></dd>
          </div>
          <div className="px-2 py-2.5">
            <dt className="text-[12px] text-muted-foreground">Can raise</dt>
            <dd className="text-[17px] font-semibold tabular-nums">${liquid.toLocaleString()}</dd>
          </div>
          <div className="px-2 py-2.5">
            <dt className="text-[12px] text-muted-foreground">Short by</dt>
            <dd className={`text-[17px] font-semibold tabular-nums ${shortfall ? 'text-ruby-text' : 'text-felt-light'}`}>${shortfall.toLocaleString()}</dd>
          </div>
        </dl>

        {canAct && !canAfford && (
          <div className="space-y-3">
            {sellable.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-[13px] font-semibold text-muted-foreground">Sell buildings</h3>
                <div className="flex flex-wrap gap-2">
                  {sellable.map((o) => {
                    const prop = getPropertyData(o.position)!;
                    return (
                      <Button key={o.position} size="sm" variant="outline" onClick={() => onSellHouse(o.position)}>
                        <span className="h-3 w-1.5 rounded-[1px]" style={{ background: prop.color ? PROPERTY_HEX[prop.color] : '#6C7584' }} aria-hidden />
                        {prop.name} +${Math.floor(prop.houseCost! / 2)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            {mortgageable.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-[13px] font-semibold text-muted-foreground">Mortgage deeds</h3>
                <div className="flex flex-wrap gap-2">
                  {mortgageable.map((o) => {
                    const prop = getPropertyData(o.position)!;
                    return (
                      <Button key={o.position} size="sm" variant="outline" onClick={() => onMortgage(o.position)}>
                        <span className="h-3 w-1.5 rounded-[1px]" style={{ background: prop.color ? PROPERTY_HEX[prop.color] : '#6C7584' }} aria-hidden />
                        {prop.name} +${prop.mortgageValue}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            {sellable.length === 0 && mortgageable.length === 0 && <p className="text-[14px] text-muted-foreground">Nothing left to sell or mortgage.</p>}
          </div>
        )}

        {canAct ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="flex-1" disabled={!canAfford} onClick={onAttemptPayment}>
              {canAfford ? `Pay $${bankruptcyState.amountOwed.toLocaleString()}` : 'Raise more cash to pay'}
            </Button>
            <Button size="lg" variant="destructive" className="flex-1" onClick={onDeclareBankruptcy}>
              Declare bankruptcy
            </Button>
          </div>
        ) : (
          <p className="text-[14px] text-muted-foreground" aria-live="polite">The table continues once they pay or go bankrupt.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
