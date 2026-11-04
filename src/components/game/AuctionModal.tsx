import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GameState } from '@/game/types';
import { getPropertyData } from '@/game/engine';
import { Money, Pawn, PROPERTY_HEX, readableOn } from '@/components/game/kit';
import { cn } from '@/lib/utils';

interface AuctionModalProps {
  gameState: GameState;
  onBid: (amount: number) => void;
  onPass: () => void;
  currentUserId?: string; // the local player in multiplayer
}

export const AuctionModal: React.FC<AuctionModalProps> = ({ gameState, onBid, onPass, currentUserId }) => {
  const { auction, players } = gameState;
  const [bidAmount, setBidAmount] = useState('');

  if (!auction) return null;
  const property = getPropertyData(auction.propertyPosition);
  if (!property) return null;

  const active = auction.participants.filter((id) => !auction.passedPlayers.includes(id));
  const turnId = active.length > 0 ? active[auction.currentBidderIndex % active.length] : null;
  const turnPlayer = players.find((p) => p.id === turnId);
  const localId = currentUserId || players.find((p) => !p.isAI)?.id;
  const isMyTurn = turnId !== null && turnId === localId;
  const highBidder = auction.currentBidder !== null ? players.find((p) => p.id === auction.currentBidder) : null;

  const minBid = auction.currentBid + 1;
  const maxBid = turnPlayer?.money ?? 0;
  const parsed = parseInt(bidAmount, 10);
  const valid = parsed >= minBid && parsed <= maxBid;
  const quick = [10, 25, 50].map((n) => auction.currentBid + n).filter((b) => b <= maxBid);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onBid(parsed);
    setBidAmount('');
  };

  return (
    <Dialog open>
      <DialogContent className="max-w-[420px] overflow-hidden p-0 [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogDescription className="sr-only">Auction for {property.name}</DialogDescription>

        <div className="px-5 pb-3 pt-5" style={{ background: property.color ? PROPERTY_HEX[property.color] : undefined, color: property.color ? readableOn(PROPERTY_HEX[property.color]) : undefined }}>
          <DialogTitle className="text-xl font-semibold leading-tight">{property.name}</DialogTitle>
          <p className="mt-0.5 text-[13px] tabular-nums">Auction. List price ${property.price}</p>
        </div>

        <div className="space-y-4 px-5 pb-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] text-muted-foreground">{highBidder ? 'Highest bid' : 'No bids yet'}</p>
              <Money value={auction.currentBid} className="text-4xl font-semibold" />
            </div>
            {highBidder && (
              <div className="flex items-center gap-2 pb-1 text-[13px]">
                <Pawn color={highBidder.color} name={highBidder.name} size={24} />
                <span className="font-medium">{highBidder.name}</span>
              </div>
            )}
          </div>

          <ul className="flex flex-wrap gap-2" aria-label="Bidders">
            {auction.participants.map((id) => {
              const p = players.find((x) => x.id === id);
              if (!p) return null;
              const out = auction.passedPlayers.includes(id);
              return (
                <li key={id} className={cn('flex items-center gap-1.5 rounded-[4px] border px-2 py-1 text-[12px]', id === turnId ? 'border-gold/70' : 'border-border', out && 'opacity-40')}>
                  {id === turnId && (
                    <motion.span className="h-1.5 w-1.5 rounded-full bg-gold" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} aria-hidden />
                  )}
                  <Pawn color={p.color} name={p.name} size={18} />
                  <span className={out ? 'line-through' : ''}>{p.name}</span>
                </li>
              );
            })}
          </ul>

          {isMyTurn ? (
            <form onSubmit={submit} className="space-y-3">
              <p className="text-[13px] text-muted-foreground">
                You have <span className="font-semibold tabular-nums text-foreground">${maxBid.toLocaleString()}</span>. Bid at least ${minBid}.
              </p>
              {quick.length > 0 && (
                <div className="flex gap-2">
                  {quick.map((amount) => (
                    <Button key={amount} type="button" variant="secondary" className="flex-1" onClick={() => onBid(amount)}>
                      ${amount}
                    </Button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input type="number" inputMode="numeric" min={minBid} max={maxBid} value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder={`$${minBid} or more`} aria-label="Your bid" />
                <Button type="submit" disabled={!valid} className="px-6">
                  Bid
                </Button>
              </div>
              <Button type="button" variant="ghost" className="w-full" onClick={onPass}>
                Pass
              </Button>
            </form>
          ) : (
            <p className="py-2 text-[14px] text-muted-foreground" aria-live="polite">
              Waiting for <span className="font-semibold text-foreground">{turnPlayer?.name ?? 'the next bidder'}</span> to bid or pass.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
