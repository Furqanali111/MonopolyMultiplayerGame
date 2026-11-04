import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GameState, Player, TradeOffer } from '@/game/types';
import { getPropertyData } from '@/game/engine';
import { PropertyColor } from '@/game/constants';

interface TradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameState: GameState;
  currentPlayer: Player;
  onPropose: (offer: Omit<TradeOffer, 'active'>) => void;
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

export const TradeModal: React.FC<TradeModalProps> = ({
  open,
  onOpenChange,
  gameState,
  currentPlayer,
  onPropose,
}) => {
  const { trade, players, ownedProperties } = gameState;

  const [selectedPartner, setSelectedPartner] = useState<number | null>(null);
  const [offeredProperties, setOfferedProperties] = useState<number[]>([]);
  const [requestedProperties, setRequestedProperties] = useState<number[]>([]);
  const [offeredMoney, setOfferedMoney] = useState(0);
  const [requestedMoney, setRequestedMoney] = useState(0);
  const [offeredCards, setOfferedCards] = useState(0);
  const [requestedCards, setRequestedCards] = useState(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedPartner(null);
      setOfferedProperties([]);
      setRequestedProperties([]);
      setOfferedMoney(0);
      setRequestedMoney(0);
      setOfferedCards(0);
      setRequestedCards(0);
    }
  }, [open]);

  // Trade modal is only for proposing trades, not accepting/declining
  // (that's handled in GameScreen as a separate dialog)

  // Trade proposal UI
  const otherPlayers = players.filter(p => !p.isBankrupt && p.id !== currentPlayer.id);
  const myProperties = ownedProperties.filter(p => p.ownerId === currentPlayer.id && !p.isMortgaged && p.houses === 0);
  const partnerProperties = selectedPartner
    ? ownedProperties.filter(p => p.ownerId === selectedPartner && !p.isMortgaged && p.houses === 0)
    : [];
  const selectedPartnerData = selectedPartner ? players.find(p => p.id === selectedPartner) : null;

  const handlePropose = () => {
    if (selectedPartner === null) return;

    onPropose({
      fromPlayer: currentPlayer.id,
      toPlayer: selectedPartner,
      offeredProperties,
      requestedProperties,
      offeredMoney,
      requestedMoney,
      offeredCards,
      requestedCards,
    });
  };

  const toggleProperty = (position: number, isOffering: boolean) => {
    if (isOffering) {
      setOfferedProperties(prev =>
        prev.includes(position)
          ? prev.filter(p => p !== position)
          : [...prev, position]
      );
    } else {
      setRequestedProperties(prev =>
        prev.includes(position)
          ? prev.filter(p => p !== position)
          : [...prev, position]
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl gold-text text-center">
            Propose Trade
          </DialogTitle>
        </DialogHeader>

        {/* Partner selection */}
        {!selectedPartner ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-center">Select a player to trade with:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {otherPlayers.map(player => (
                <Button
                  key={player.id}
                  variant="outline"
                  onClick={() => setSelectedPartner(player.id)}
                  className="flex items-center gap-2"
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: player.color }}
                  />
                  {player.name}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Trading with <span style={{ color: selectedPartnerData?.color }}>{selectedPartnerData?.name}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPartner(null);
                  setOfferedProperties([]);
                  setRequestedProperties([]);
                }}
              >
                Change
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Your offer */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">You Offer:</h4>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Properties:</p>
                  <div className="flex flex-wrap gap-1">
                    {myProperties.map(owned => {
                      const prop = getPropertyData(owned.position);
                      const isSelected = offeredProperties.includes(owned.position);
                      return (
                        <button
                          key={owned.position}
                          onClick={() => toggleProperty(owned.position, true)}
                          className={`
                            px-2 py-1 text-xs rounded transition-all
                            ${isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary/50 text-foreground hover:bg-secondary'}
                          `}
                        >
                          {prop?.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Cash:</span>
                  <Input
                    type="number"
                    min={0}
                    max={currentPlayer.money}
                    value={offeredMoney}
                    onChange={(e) => setOfferedMoney(Math.min(parseInt(e.target.value) || 0, currentPlayer.money))}
                    className="h-8 w-24 text-sm"
                  />
                </div>

                {currentPlayer.getOutOfJailCards > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Jail Cards:</span>
                    <Input
                      type="number"
                      min={0}
                      max={currentPlayer.getOutOfJailCards}
                      value={offeredCards}
                      onChange={(e) => setOfferedCards(Math.min(parseInt(e.target.value) || 0, currentPlayer.getOutOfJailCards))}
                      className="h-8 w-16 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* You request */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">You Request:</h4>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Properties:</p>
                  <div className="flex flex-wrap gap-1">
                    {partnerProperties.map(owned => {
                      const prop = getPropertyData(owned.position);
                      const isSelected = requestedProperties.includes(owned.position);
                      return (
                        <button
                          key={owned.position}
                          onClick={() => toggleProperty(owned.position, false)}
                          className={`
                            px-2 py-1 text-xs rounded transition-all
                            ${isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary/50 text-foreground hover:bg-secondary'}
                          `}
                        >
                          {prop?.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Cash:</span>
                  <Input
                    type="number"
                    min={0}
                    max={selectedPartnerData?.money || 0}
                    value={requestedMoney}
                    onChange={(e) => setRequestedMoney(Math.min(parseInt(e.target.value) || 0, selectedPartnerData?.money || 0))}
                    className="h-8 w-24 text-sm"
                  />
                </div>

                {(selectedPartnerData?.getOutOfJailCards || 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Jail Cards:</span>
                    <Input
                      type="number"
                      min={0}
                      max={selectedPartnerData?.getOutOfJailCards || 0}
                      value={requestedCards}
                      onChange={(e) => setRequestedCards(Math.min(parseInt(e.target.value) || 0, selectedPartnerData?.getOutOfJailCards || 0))}
                      className="h-8 w-16 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-center pt-4">
              <Button
                onClick={handlePropose}
                disabled={offeredProperties.length === 0 && requestedProperties.length === 0 && offeredMoney === 0 && requestedMoney === 0 && offeredCards === 0 && requestedCards === 0}
                className="btn-monopoly"
              >
                Propose Trade
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
