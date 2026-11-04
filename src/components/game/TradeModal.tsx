import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GameState, Player, PlayerId, TradeOffer } from '@/game/types';
import { getPropertyData } from '@/game/engine';
import { Money, Pawn, PROPERTY_HEX } from '@/components/game/kit';
import { cn } from '@/lib/utils';

interface TradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameState: GameState;
  currentPlayer: Player;
  onPropose: (offer: Omit<TradeOffer, 'active'>) => void;
}

const DeedToggle: React.FC<{ position: number; selected: boolean; onToggle: () => void }> = ({ position, selected, onToggle }) => {
  const prop = getPropertyData(position);
  if (!prop) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-2 rounded-[4px] border px-2 py-2 text-left text-[13px] transition-colors md:py-1.5',
        selected ? 'border-gold bg-gold/10' : 'border-border hover:border-gold/40'
      )}
    >
      <span className="h-4 w-1.5 shrink-0 rounded-[1px]" style={{ background: prop.color ? PROPERTY_HEX[prop.color] : '#6C7584' }} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{prop.name}</span>
      <span className="tabular-nums text-muted-foreground">${prop.price}</span>
    </button>
  );
};

const NumberField: React.FC<{ label: string; value: number; max: number; onChange: (n: number) => void }> = ({ label, value, max, onChange }) => (
  <label className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
    {label}
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      value={value || ''}
      placeholder="0"
      onChange={(e) => onChange(Math.min(Math.max(parseInt(e.target.value, 10) || 0, 0), max))}
      className="h-10 w-28 text-right"
    />
  </label>
);

export const TradeModal: React.FC<TradeModalProps> = ({ open, onOpenChange, gameState, currentPlayer, onPropose }) => {
  const { players, ownedProperties } = gameState;

  const [partnerId, setPartnerId] = useState<PlayerId | null>(null);
  const [offeredProperties, setOfferedProperties] = useState<number[]>([]);
  const [requestedProperties, setRequestedProperties] = useState<number[]>([]);
  const [offeredMoney, setOfferedMoney] = useState(0);
  const [requestedMoney, setRequestedMoney] = useState(0);
  const [offeredCards, setOfferedCards] = useState(0);
  const [requestedCards, setRequestedCards] = useState(0);

  const reset = () => {
    setPartnerId(null);
    setOfferedProperties([]);
    setRequestedProperties([]);
    setOfferedMoney(0);
    setRequestedMoney(0);
    setOfferedCards(0);
    setRequestedCards(0);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const others = players.filter((p) => !p.isBankrupt && p.id !== currentPlayer.id);
  const tradable = (ownerId: PlayerId) => ownedProperties.filter((p) => p.ownerId === ownerId && !p.isMortgaged && p.houses === 0);
  const partner = partnerId ? players.find((p) => p.id === partnerId) : null;

  const toggle = (list: number[], set: (v: number[]) => void, pos: number) =>
    set(list.includes(pos) ? list.filter((p) => p !== pos) : [...list, pos]);

  const empty =
    !offeredProperties.length && !requestedProperties.length && !offeredMoney && !requestedMoney && !offeredCards && !requestedCards;

  const send = () => {
    if (!partner) return;
    onPropose({
      fromPlayer: currentPlayer.id,
      toPlayer: partner.id,
      offeredProperties,
      requestedProperties,
      offeredMoney,
      requestedMoney,
      offeredCards,
      requestedCards,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="text-lg font-semibold">{partner ? `Trade with ${partner.name}` : 'Who do you want to trade with?'}</DialogTitle>
        <DialogDescription className="sr-only">Pick deeds and cash to give and to get, then send the offer.</DialogDescription>

        {!partner ? (
          <ul className="divide-y divide-border border border-border" style={{ borderRadius: 6 }}>
            {others.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setPartnerId(p.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-raised">
                  <Pawn color={p.color} name={p.name} size={30} />
                  <span className="flex-1 font-medium">{p.name}</span>
                  <span className="text-[13px] tabular-nums text-muted-foreground">
                    ${p.money.toLocaleString()} · {tradable(p.id).length} tradable deed{tradable(p.id).length === 1 ? '' : 's'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <section className="space-y-3">
                <h3 className="flex items-center justify-between text-[13px] font-semibold text-muted-foreground">
                  You give <Money value={currentPlayer.money} showDelta={false} className="font-medium text-foreground" />
                </h3>
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {tradable(currentPlayer.id).length === 0 && <p className="text-[13px] text-muted-foreground">No tradable deeds. Buildings and mortgages must be cleared first.</p>}
                  {tradable(currentPlayer.id).map((o) => (
                    <DeedToggle key={o.position} position={o.position} selected={offeredProperties.includes(o.position)} onToggle={() => toggle(offeredProperties, setOfferedProperties, o.position)} />
                  ))}
                </div>
                <NumberField label="Cash" value={offeredMoney} max={currentPlayer.money} onChange={setOfferedMoney} />
                {currentPlayer.getOutOfJailCards > 0 && <NumberField label="Jail cards" value={offeredCards} max={currentPlayer.getOutOfJailCards} onChange={setOfferedCards} />}
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center justify-between text-[13px] font-semibold text-muted-foreground">
                  You get <Money value={partner.money} showDelta={false} className="font-medium text-foreground" />
                </h3>
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {tradable(partner.id).length === 0 && <p className="text-[13px] text-muted-foreground">{partner.name} has no tradable deeds.</p>}
                  {tradable(partner.id).map((o) => (
                    <DeedToggle key={o.position} position={o.position} selected={requestedProperties.includes(o.position)} onToggle={() => toggle(requestedProperties, setRequestedProperties, o.position)} />
                  ))}
                </div>
                <NumberField label="Cash" value={requestedMoney} max={partner.money} onChange={setRequestedMoney} />
                {partner.getOutOfJailCards > 0 && <NumberField label="Jail cards" value={requestedCards} max={partner.getOutOfJailCards} onChange={setRequestedCards} />}
              </section>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="ghost" onClick={() => setPartnerId(null)}>
                <ArrowLeft /> Change player
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 sm:flex-none" disabled={empty} onClick={send}>
                  Send offer
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
