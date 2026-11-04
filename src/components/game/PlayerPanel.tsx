import React from 'react';
import { Player, GameState } from '@/game/types';
import { getPropertyData, hasMonopoly } from '@/game/engine';
import { BOARD_TILES, PropertyColor } from '@/game/constants';
import { MapPin, Key, AlertCircle, Bot, User, Crown } from 'lucide-react';

interface PlayerPanelProps {
  player: Player;
  gameState: GameState;
  isCurrentPlayer: boolean;
}

const PROPERTY_COLORS: Record<PropertyColor, string> = {
  brown: 'bg-amber-900',
  lightblue: 'bg-sky-400',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-emerald-500',
  blue: 'bg-blue-600',
  railroad: 'bg-slate-600',
  utility: 'bg-amber-500',
};

export const PlayerPanel: React.FC<PlayerPanelProps> = ({ 
  player, 
  gameState,
  isCurrentPlayer 
}) => {
  const playerProperties = gameState.ownedProperties.filter(p => p.ownerId === player.id);
  
  // Group properties by color
  const groupedProperties = playerProperties.reduce((acc, owned) => {
    const property = getPropertyData(owned.position);
    if (property?.color) {
      if (!acc[property.color]) acc[property.color] = [];
      acc[property.color].push(owned);
    }
    return acc;
  }, {} as Record<string, typeof playerProperties>);

  // Calculate net worth
  const netWorth = playerProperties.reduce((total, owned) => {
    const prop = getPropertyData(owned.position);
    if (!prop) return total;
    let value = owned.isMortgaged ? prop.mortgageValue : prop.price;
    if (owned.houses > 0 && prop.houseCost) {
      value += Math.floor((owned.houses * prop.houseCost) / 2);
    }
    return total + value;
  }, player.money);

  return (
    <div 
      className={`
        glass-card p-2 md:p-3 transition-all duration-300
        ${isCurrentPlayer ? 'ring-2 ring-primary/40' : ''}
        ${player.isBankrupt ? 'opacity-40 grayscale' : ''}
      `}
    >
      {/* Header - compact */}
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shadow-md text-white font-bold text-sm"
          style={{ 
            backgroundColor: player.color,
            boxShadow: `0 2px 12px ${player.color}40`
          }}
        >
          {player.name.charAt(0)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display text-sm md:text-base text-foreground truncate font-semibold">
              {player.name}
            </h3>
            {isCurrentPlayer && !player.isBankrupt && (
              <Crown className="w-4 h-4 text-primary animate-glow" />
            )}
          </div>
          
          {player.isBankrupt ? (
            <span className="text-xs text-destructive font-semibold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              BANKRUPT
            </span>
          ) : player.isAI ? (
            <span className="text-xs text-muted-foreground capitalize">
              {player.difficulty} AI
            </span>
          ) : null}
        </div>
      </div>

      {/* Money - single line */}
      <div className="text-lg md:text-xl font-bold text-primary mb-2">
        ${player.money.toLocaleString()}
      </div>

      {/* Status indicators - compact */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2 text-[10px]">
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{BOARD_TILES[player.position].name}</span>
        </div>
        
        {player.inJail && (
          <span className="px-1.5 py-0.5 bg-destructive/20 text-destructive rounded font-semibold">
            Jail {player.jailTurns + 1}/3
          </span>
        )}
        
        {player.getOutOfJailCards > 0 && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-accent/20 text-accent rounded">
            <Key className="w-2.5 h-2.5" />
            {player.getOutOfJailCards}
          </span>
        )}
      </div>

      {/* Properties - ultra compact */}
      {Object.keys(groupedProperties).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(groupedProperties).map(([color, props]) => {
            const isMonopoly = props.length > 0 && hasMonopoly(gameState, player.id, props[0].position);
            const totalHouses = props.reduce((sum, p) => sum + p.houses, 0);
            const hasMortgaged = props.some(p => p.isMortgaged);
            
            return (
              <div 
                key={color} 
                className={`
                  ${PROPERTY_COLORS[color as PropertyColor]}
                  px-1.5 py-0.5 rounded flex items-center gap-0.5
                  ${isMonopoly ? 'ring-1 ring-primary' : ''}
                  ${hasMortgaged ? 'opacity-50' : ''}
                `}
                title={`${color}: ${props.length} properties${totalHouses > 0 ? `, ${totalHouses} houses` : ''}`}
              >
                <span className="text-white text-[10px] font-bold drop-shadow">{props.length}</span>
                {totalHouses > 0 && (
                  <span className="text-white text-[10px] font-bold drop-shadow">+{totalHouses}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
