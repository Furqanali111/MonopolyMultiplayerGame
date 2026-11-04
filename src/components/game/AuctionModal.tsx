import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GameState } from '@/game/types';
import { getPropertyData } from '@/game/engine';
import { PropertyColor } from '@/game/constants';

interface AuctionModalProps {
  gameState: GameState;
  onBid: (amount: number) => void;
  onPass: () => void;
  currentUserId?: string; // ID of the local player viewing this modal
}

const PROPERTY_COLORS: Record<PropertyColor, string> = {
  brown: 'bg-property-brown',
  lightblue: 'bg-property-lightblue',
  pink: 'bg-property-pink',
  orange: 'bg-property-orange',
  red: 'bg-property-red',
  yellow: 'bg-property-yellow',
  green: 'bg-property-green',
  blue: 'bg-property-blue',
  railroad: 'bg-property-railroad',
  utility: 'bg-property-utility',
};

export const AuctionModal: React.FC<AuctionModalProps> = ({
  gameState,
  onBid,
  onPass,
  currentUserId
}) => {
  const { auction, players } = gameState;
  const [bidAmount, setBidAmount] = useState('');

  if (!auction) return null;

  const property = getPropertyData(auction.propertyPosition);
  if (!property) return null;

  // Get the active bidders (those who haven't passed)
  const activeBidders = auction.participants.filter(
    id => !auction.passedPlayers.includes(id)
  );

  // The current bidder is determined by currentBidderIndex
  const currentBidderId = activeBidders.length > 0
    ? activeBidders[auction.currentBidderIndex % activeBidders.length]
    : null;
  const currentPlayer = currentBidderId !== null
    ? players.find(p => p.id === currentBidderId)
    : null;

  // Check if it's THIS player's turn
  // In multiplayer: use passed currentUserId
  // In single-player: find the first non-AI player
  const localUserId = currentUserId || players.find(p => !p.isAI)?.id;
  const isMyTurn = currentBidderId === localUserId;

  const currentBidder = auction.currentBidder !== null
    ? players.find(p => p.id === auction.currentBidder)
    : null;

  const minBid = auction.currentBid + 1;
  const maxBid = currentPlayer?.money || 0;

  const handleBid = () => {
    const amount = parseInt(bidAmount);
    if (amount >= minBid && amount <= maxBid) {
      onBid(amount);
      setBidAmount('');
    }
  };

  const quickBids = [
    auction.currentBid + 10,
    auction.currentBid + 25,
    auction.currentBid + 50,
  ].filter(b => b <= maxBid);

  return (
    <Dialog open={true}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl gold-text text-center">
            🔨 Auction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property card */}
          <div className="bg-secondary/50 rounded-lg p-4 text-center animate-card-flip">
            {property.color && (
              <div className={`h-4 rounded-t ${PROPERTY_COLORS[property.color]} -mx-4 -mt-4 mb-3`} />
            )}
            <h3 className="font-display text-xl text-foreground">{property.name}</h3>
            <p className="text-sm text-muted-foreground">List Price: ${property.price}</p>
          </div>

          {/* Current bid info */}
          <div className="text-center py-3 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground text-sm">Current Bid</p>
            <p className="text-3xl font-bold text-primary">
              ${auction.currentBid}
            </p>
            {currentBidder && (
              <p className="text-sm text-foreground">
                by <span style={{ color: currentBidder.color }}>{currentBidder.name}</span>
              </p>
            )}
          </div>

          {/* Turn Indicator - visible to ALL players */}
          <div className="text-center p-3 bg-primary/10 rounded-lg border-2 border-primary">
            <p className="text-sm text-muted-foreground mb-1">Current Turn:</p>
            <p className="text-lg font-bold" style={{ color: currentPlayer?.color }}>
              {currentPlayer?.name}
              {isMyTurn ? ' (Your Turn!)' : ' is deciding...'}
            </p>
          </div>

          {/* Bidding UI for current player only */}
          {isMyTurn ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Your money: <span className="text-primary font-bold">${currentPlayer?.money || 0}</span>
              </p>

              {/* Quick bids */}
              {quickBids.length > 0 && (
                <div className="flex gap-2 justify-center">
                  {quickBids.map(amount => (
                    <Button
                      key={amount}
                      size="sm"
                      variant="outline"
                      onClick={() => onBid(amount)}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
              )}

              {/* Custom bid */}
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={minBid}
                  max={maxBid}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Min $${minBid}`}
                  className="bg-secondary border-border"
                />
                <Button
                  onClick={handleBid}
                  disabled={!bidAmount || parseInt(bidAmount) < minBid || parseInt(bidAmount) > maxBid}
                  className="btn-monopoly"
                >
                  Bid
                </Button>
              </div>

              <Button
                onClick={onPass}
                variant="secondary"
                className="w-full"
              >
                Pass
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground animate-pulse">
                {currentPlayer?.name || 'Player'} is deciding...
              </p>
            </div>
          )}

          {/* Remaining bidders */}
          <div className="text-xs text-muted-foreground text-center">
            Active bidders: {auction.participants
              .filter(id => !auction.passedPlayers.includes(id))
              .map(id => players.find(p => p.id === id)?.name)
              .join(', ')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
