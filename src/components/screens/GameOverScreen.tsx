import React from 'react';
import { Player, GameState } from '@/game/types';
import { calculatePlayerNetWorth } from '@/game/engine';
import { Button } from '@/components/ui/button';
import { Building2, Home, Hotel, TrendingUp } from 'lucide-react';


interface GameOverScreenProps {
  gameState: GameState;
  winner: Player;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  gameState,
  winner,
  onPlayAgain,
  onMainMenu
}) => {
  const netWorth = calculatePlayerNetWorth(gameState, winner.id);

  // Calculate winner's statistics
  const winnerProperties = gameState.ownedProperties.filter(p => p.ownerId === winner.id);
  const propertyCount = winnerProperties.length;
  const houseCount = winnerProperties.reduce((sum, p) => sum + (p.houses > 0 && p.houses < 5 ? p.houses : 0), 0);
  const hotelCount = winnerProperties.filter(p => p.houses === 5).length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center animate-bounce-in max-w-3xl">
        {/* Trophy */}
        <div className="text-8xl mb-6">🏆</div>

        <h1 className="font-display text-4xl md:text-6xl gradient-text mb-4">
          WINNER!
        </h1>

        <div
          className="inline-flex items-center gap-3 px-6 py-3 rounded-xl mb-6"
          style={{ backgroundColor: winner.color + '30' }}
        >
          <div
            className="w-8 h-8 rounded-full shadow-lg"
            style={{ backgroundColor: winner.color }}
          />
          <span className="font-display text-2xl text-foreground">
            {winner.name}
          </span>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-xs text-muted-foreground mb-1">Net Worth</div>
            <div className="text-2xl font-bold text-primary">${netWorth}</div>
          </div>

          <div className="glass-card p-4">
            <Building2 className="w-6 h-6 mx-auto mb-2 text-accent" />
            <div className="text-xs text-muted-foreground mb-1">Properties</div>
            <div className="text-2xl font-bold text-foreground">{propertyCount}</div>
          </div>

          <div className="glass-card p-4">
            <Home className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-xs text-muted-foreground mb-1">Houses</div>
            <div className="text-2xl font-bold text-foreground">{houseCount}</div>
          </div>

          <div className="glass-card p-4">
            <Hotel className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-xs text-muted-foreground mb-1">Hotels</div>
            <div className="text-2xl font-bold text-foreground">{hotelCount}</div>
          </div>
        </div>

        {/* Eliminated players */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">Other Players:</p>
          <div className="flex gap-4 justify-center">
            {gameState.players
              .filter(p => p.id !== winner.id)
              .map(player => (
                <div key={player.id} className="text-center opacity-50">
                  <div
                    className="w-6 h-6 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: player.color }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {player.name}
                    <br />
                    <span className="text-destructive">Bankrupt</span>
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={onPlayAgain}
            className="btn-primary"
          >
            Play Again
          </Button>
          <Button
            onClick={onMainMenu}
            variant="secondary"
          >
            Main Menu
          </Button>
        </div>
      </div>
    </div>
  );
};
