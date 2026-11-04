import React from 'react';
import { GameState, Player } from '@/game/types';
import {
  getPropertyData,
  getPropertyOwner,
  canBuyProperty,
  canBuildHouse,
  canSellHouse,
  canMortgage,
  canUnmortgage,
  BOARD_TILES,
} from '@/game/engine';
import { JAIL_FINE } from '@/game/constants';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Gavel,
  Home,
  Building2,
  ArrowRightLeft,
  Key,
  Dices,
  DollarSign,
  Minus,
  Plus,
  Lock,
  Unlock,
  SkipForward
} from 'lucide-react';

interface ActionPanelProps {
  gameState: GameState;
  player: Player;
  onBuyProperty: () => void;
  onDeclineProperty: () => void;
  onBuildHouse: (position: number) => void;
  onSellHouse: (position: number) => void;
  onMortgage: (position: number) => void;
  onUnmortgage: (position: number) => void;
  onPayJailFine: () => void;
  onUseJailCard: () => void;
  onRollForJail: () => void;
  onEndTurn: () => void;
  onTrade: () => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  gameState,
  player,
  onBuyProperty,
  onDeclineProperty,
  onBuildHouse,
  onSellHouse,
  onMortgage,
  onUnmortgage,
  onPayJailFine,
  onUseJailCard,
  onRollForJail,
  onEndTurn,
  onTrade,
}) => {
  const currentTile = BOARD_TILES[player.position];
  const property = getPropertyData(player.position);
  const owned = getPropertyOwner(gameState, player.position);

  // Get buildable properties
  const playerProperties = gameState.ownedProperties.filter(p => p.ownerId === player.id);
  const buildableProperties = playerProperties.filter(p => canBuildHouse(gameState, player.id, p.position));
  const sellableHouses = playerProperties.filter(p => canSellHouse(gameState, player.id, p.position));
  const mortgageableProperties = playerProperties.filter(p => canMortgage(gameState, player.id, p.position));
  const unmortgageableProperties = playerProperties.filter(p => canUnmortgage(gameState, player.id, p.position));

  if (player.isAI) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-medium">{player.name} is thinking...</p>
        </div>
      </div>
    );
  }

  // Jail actions - check if player is in jail
  if (player.inJail) {
    return (
      <div className="glass-card p-4 space-y-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-display text-lg text-foreground">You're in Jail!</h3>
            <p className="text-sm text-muted-foreground">
              Attempt {player.jailTurns + 1} of 3 to roll doubles
            </p>
            <p className="text-xs text-muted-foreground">
              After 3 failed attempts, you must pay the fine.
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <Button
            onClick={onRollForJail}
            className="btn-primary w-full"
          >
            <Dices className="w-4 h-4 mr-2" />
            Try to Roll Doubles
          </Button>

          {player.money >= JAIL_FINE && (
            <Button
              onClick={onPayJailFine}
              variant="secondary"
              className="w-full"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Pay ${JAIL_FINE} Fine
            </Button>
          )}

          {player.getOutOfJailCards > 0 && (
            <Button
              onClick={onUseJailCard}
              variant="outline"
              className="w-full"
            >
              <Key className="w-4 h-4 mr-2" />
              Use Get Out of Jail Card
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Property purchase decision
  if (gameState.turnPhase === 'action' && property && !owned) {
    const canBuy = canBuyProperty(gameState, player.id, player.position);

    return (
      <div className="glass-card p-4 space-y-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg text-foreground">{property.name}</h3>
            <p className="text-sm text-muted-foreground">
              Unowned • <span className="text-primary font-bold">${property.price}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <Button
            onClick={onBuyProperty}
            disabled={!canBuy}
            className="btn-primary w-full"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Buy Property
          </Button>
          <Button
            onClick={onDeclineProperty}
            variant="secondary"
            className="w-full"
          >
            <Gavel className="w-4 h-4 mr-2" />
            Start Auction
          </Button>
        </div>

        {!canBuy && (
          <p className="text-xs text-destructive text-center">
            Not enough money to purchase
          </p>
        )}
      </div>
    );
  }

  // End turn / property management
  return (
    <div className="glass-card p-4 space-y-4 animate-slide-up">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-lg text-foreground">Actions</h3>
        {gameState.turnPhase === 'endturn' && (
          <Button onClick={onEndTurn} className="btn-primary">
            <SkipForward className="w-4 h-4 mr-2" />
            End Turn
          </Button>
        )}
      </div>

      {/* Building options */}
      {buildableProperties.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Plus className="w-4 h-4" />
            Build Houses
          </div>
          <div className="flex flex-wrap gap-2">
            {buildableProperties.map(owned => {
              const prop = getPropertyData(owned.position)!;
              return (
                <Button
                  key={owned.position}
                  size="sm"
                  variant="outline"
                  onClick={() => onBuildHouse(owned.position)}
                  className="text-xs h-8"
                >
                  <Home className="w-3 h-3 mr-1" />
                  {prop.name.split(' ')[0]} (${prop.houseCost})
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sell houses */}
      {sellableHouses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Minus className="w-4 h-4" />
            Sell Buildings
          </div>
          <div className="flex flex-wrap gap-2">
            {sellableHouses.map(owned => {
              const prop = getPropertyData(owned.position)!;
              return (
                <Button
                  key={owned.position}
                  size="sm"
                  variant="outline"
                  onClick={() => onSellHouse(owned.position)}
                  className="text-xs h-8"
                >
                  {prop.name.split(' ')[0]} (+${Math.floor(prop.houseCost! / 2)})
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mortgage */}
      {mortgageableProperties.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            Mortgage
          </div>
          <div className="flex flex-wrap gap-2">
            {mortgageableProperties.map(owned => {
              const prop = getPropertyData(owned.position)!;
              return (
                <Button
                  key={owned.position}
                  size="sm"
                  variant="outline"
                  onClick={() => onMortgage(owned.position)}
                  className="text-xs h-8"
                >
                  {prop.name.split(' ')[0]} (+${prop.mortgageValue})
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unmortgage */}
      {unmortgageableProperties.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Unlock className="w-4 h-4" />
            Unmortgage
          </div>
          <div className="flex flex-wrap gap-2">
            {unmortgageableProperties.map(owned => {
              const prop = getPropertyData(owned.position)!;
              const cost = Math.floor(prop.mortgageValue * 1.1);
              return (
                <Button
                  key={owned.position}
                  size="sm"
                  variant="outline"
                  onClick={() => onUnmortgage(owned.position)}
                  className="text-xs h-8"
                >
                  {prop.name.split(' ')[0]} (-${cost})
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Trade button */}
      <Button
        onClick={onTrade}
        variant="outline"
        className="w-full"
      >
        <ArrowRightLeft className="w-4 h-4 mr-2" />
        Propose Trade
      </Button>
    </div>
  );
};
