import React, { useState, useEffect, useRef } from 'react';
import { GameState, Player } from '@/game/types';
import { BOARD_TILES, PropertyColor } from '@/game/constants';
import { getPropertyOwner } from '@/game/engine';
import { Home, Car, Zap, HelpCircle, Building2, Landmark, ParkingCircle, AlertTriangle, ArrowRight, Gem } from 'lucide-react';

// Helper to calculate path between two positions on the board
function calculatePath(from: number, to: number): number[] {
  const path: number[] = [];
  let current = from;
  
  // Simple forward movement (handles wrapping around the board)
  while (current !== to) {
    current = (current + 1) % 40;
    path.push(current);
  }
  
  return path;
}

interface GameBoardProps {
  gameState: GameState;
  onTileClick?: (position: number) => void;
  centerContent?: React.ReactNode;
}

const PROPERTY_COLORS: Record<PropertyColor, string> = {
  brown: 'from-amber-900 to-amber-800',
  lightblue: 'from-sky-400 to-cyan-400',
  pink: 'from-pink-500 to-rose-400',
  orange: 'from-orange-500 to-amber-500',
  red: 'from-red-500 to-rose-500',
  yellow: 'from-yellow-400 to-amber-300',
  green: 'from-emerald-500 to-green-500',
  blue: 'from-blue-600 to-indigo-600',
  railroad: 'from-slate-700 to-slate-600',
  utility: 'from-amber-500 to-yellow-400',
};

const PROPERTY_BG: Record<PropertyColor, string> = {
  brown: 'bg-amber-900/30',
  lightblue: 'bg-sky-400/20',
  pink: 'bg-pink-500/20',
  orange: 'bg-orange-500/20',
  red: 'bg-red-500/20',
  yellow: 'bg-yellow-400/20',
  green: 'bg-emerald-500/20',
  blue: 'bg-blue-600/20',
  railroad: 'bg-slate-600/20',
  utility: 'bg-amber-500/20',
};

const getTileIcon = (type: string, position: number) => {
  switch (type) {
    case 'go': return <ArrowRight className="w-7 h-7 md:w-8 md:h-8 text-primary animate-pulse" />;
    case 'jail': return <Building2 className="w-6 h-6 md:w-7 md:h-7 text-slate-400" />;
    case 'free': return <ParkingCircle className="w-6 h-6 md:w-7 md:h-7 text-emerald-400" />;
    case 'gotojail': return <AlertTriangle className="w-6 h-6 md:w-7 md:h-7 text-red-400" />;
    case 'chance': return <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-orange-400" />;
    case 'community': return <Landmark className="w-5 h-5 md:w-6 md:h-6 text-sky-400" />;
    case 'tax': return <Gem className="w-5 h-5 md:w-6 md:h-6 text-rose-400" />;
    case 'luxury': return <Gem className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />;
    case 'railroad': return <Car className="w-5 h-5 md:w-6 md:h-6 text-slate-300" />;
    case 'utility': return position === 12 ? <Zap className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" /> : <Home className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />;
    default: return null;
  }
};

interface TileProps {
  tile: typeof BOARD_TILES[0];
  position: number;
  players: Player[];
  owned?: ReturnType<typeof getPropertyOwner>;
  ownerColor?: string;
  onClick?: () => void;
  orientation: 'top' | 'bottom' | 'left' | 'right' | 'corner';
}

const BoardTile: React.FC<TileProps> = ({ 
  tile, 
  position, 
  players, 
  owned, 
  ownerColor, 
  onClick,
  orientation 
}) => {
  const property = tile.property;
  const colorGradient = property?.color ? PROPERTY_COLORS[property.color] : '';
  const colorBg = property?.color ? PROPERTY_BG[property.color] : '';
  
  // Track animated positions for each player
  const [animatedPositions, setAnimatedPositions] = useState<Map<number, number>>(new Map());
  
  // Track which moves we've already animated (player ID + destination position)
  const animatedMovesRef = useRef<Set<string>>(new Set());
  
  // Show players either at their animated position or final position
  const playersOnTile = players.filter(p => {
    if (p.isBankrupt) return false;
    const animPos = animatedPositions.get(p.id);
    return (animPos !== undefined ? animPos : p.position) === position;
  });
  
  const houses = owned?.houses || 0;
  const isMortgaged = owned?.isMortgaged;
  const isCorner = orientation === 'corner';
  
  // Animate players who moved
  useEffect(() => {
    players.forEach(player => {
      // Create unique key for this move
      const moveKey = `${player.id}-${player.previousPosition}-${player.position}`;
      
      // Only animate if: has previousPosition, position changed, not bankrupt, and haven't animated this move yet
      if (player.previousPosition !== undefined && 
          player.previousPosition !== player.position &&
          !player.isBankrupt &&
          !animatedMovesRef.current.has(moveKey)) {
        
        // Mark this move as animated
        animatedMovesRef.current.add(moveKey);
        
        // Calculate path and animate
        const path = calculatePath(player.previousPosition, player.position);
        let step = 0;
        
        const interval = setInterval(() => {
          if (step < path.length) {
            setAnimatedPositions(prev => new Map(prev).set(player.id, path[step]));
            step++;
          } else {
            // Animation complete, remove from animated map
            setAnimatedPositions(prev => {
              const newMap = new Map(prev);
              newMap.delete(player.id);
              return newMap;
            });
            clearInterval(interval);
          }
        }, 120); // 120ms per tile for slower, more visible movement
        
        return () => clearInterval(interval);
      }
    });
  }, [players]);

  // Determine stripe position based on orientation
  const getStripeClass = () => {
    if (!colorGradient) return '';
    switch (orientation) {
      case 'top': return 'bottom-0 left-0 right-0 h-5 md:h-6';
      case 'bottom': return 'top-0 left-0 right-0 h-5 md:h-6';
      case 'left': return 'top-0 bottom-0 right-0 w-5 md:w-6';
      case 'right': return 'top-0 bottom-0 left-0 w-5 md:w-6';
      default: return '';
    }
  };

  const getTileSize = () => {
    if (isCorner) return 'w-20 h-20 md:w-22 md:h-22 lg:w-24 lg:h-24';
    if (orientation === 'left' || orientation === 'right') return 'w-20 h-16 md:w-22 md:h-18 lg:w-24 lg:h-20';
    return 'w-16 h-20 md:w-18 md:h-22 lg:w-20 lg:h-24';
  };

  const getContentPadding = () => {
    if (!colorGradient || isCorner) return '';
    switch (orientation) {
      case 'top': return 'pb-6 md:pb-7';
      case 'bottom': return 'pt-6 md:pt-7';
      case 'left': return 'pr-6 md:pr-7';
      case 'right': return 'pl-6 md:pl-7';
      default: return '';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`
        board-tile ${getTileSize()}
        ${isCorner ? 'corner-tile rounded-2xl' : 'rounded-xl'}
        ${colorBg}
        ${isMortgaged ? 'opacity-40 grayscale' : ''}
        cursor-pointer group
        transition-all hover:scale-105
      `}
    >
      {/* Property color stripe */}
      {colorGradient && !isCorner && (
        <div className={`absolute ${getStripeClass()} bg-gradient-to-br ${colorGradient} opacity-95 border-b border-white/20`} />
      )}

      {/* Owner indicator ring */}
      {ownerColor && (
        <div 
          className="absolute inset-0 rounded-lg ring-4 ring-inset pointer-events-none opacity-80"
          style={{ '--tw-ring-color': ownerColor } as React.CSSProperties}
        />
      )}

      {/* Owner badge - square indicator (distinct from circular player tokens) */}
      {ownerColor && owned && (
        <div 
          className={`
            absolute z-10 w-4 h-4 md:w-5 md:h-5 rounded-sm
            flex items-center justify-center
            text-white font-bold text-[7px] md:text-[8px]
            shadow-md border border-white/50
            ${orientation === 'bottom' ? 'top-0.5 left-0.5' : ''}
            ${orientation === 'top' ? 'bottom-0.5 left-0.5' : ''}
            ${orientation === 'left' ? 'top-0.5 right-0.5' : ''}
            ${orientation === 'right' ? 'top-0.5 left-0.5' : ''}
            ${isCorner ? 'top-0.5 left-0.5' : ''}
          `}
          style={{ 
            backgroundColor: ownerColor,
            boxShadow: `0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`
          }}
        >
          {players.find(p => p.id === owned.ownerId)?.name.charAt(0)}
        </div>
      )}

      {/* Tile content */}
      <div className={`relative h-full flex flex-col items-center justify-center ${getContentPadding()} p-1`}>
        {/* Icon for special tiles */}
        {tile.type !== 'property' && (
          <div className="mb-0.5">
            {getTileIcon(tile.type, position)}
          </div>
        )}
        
        {/* Tile name */}
        <span className={`
          text-center leading-tight text-foreground font-semibold px-0.5
          ${isCorner ? 'text-[9px] md:text-[10px] lg:text-xs' : 'text-[8px] md:text-[9px] lg:text-[10px]'}
        `}>
          {isCorner ? tile.name : tile.name.split(' ').slice(0, 2).join(' ')}
        </span>
        
        {/* Price */}
        {property && !isCorner && (
          <span className="text-[8px] md:text-[9px] lg:text-[10px] text-primary font-bold mt-0.5">
            ${property.price}
          </span>
        )}
      </div>

      {/* Houses/Hotel indicator */}
      {houses > 0 && (
        <div className={`
          absolute flex gap-0.5
          ${orientation === 'bottom' ? 'top-8 md:top-9 lg:top-10 left-1/2 -translate-x-1/2' : ''}
          ${orientation === 'top' ? 'bottom-8 md:bottom-9 lg:bottom-10 left-1/2 -translate-x-1/2' : ''}
          ${orientation === 'left' ? 'right-8 md:right-9 lg:right-10 top-1/2 -translate-y-1/2 flex-col' : ''}
          ${orientation === 'right' ? 'left-8 md:left-9 lg:left-10 top-1/2 -translate-y-1/2 flex-col' : ''}
        `}>
          {houses === 5 ? (
            <div className="w-4 h-4 md:w-5 md:h-5 bg-red-500 rounded-md shadow-lg shadow-red-500/50 border border-red-300" title="Hotel">
              <span className="text-white text-[8px] md:text-[10px] font-bold flex items-center justify-center h-full">H</span>
            </div>
          ) : (
            Array.from({ length: houses }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-500 rounded shadow-sm shadow-emerald-500/50 border border-emerald-300" title="House" />
            ))
          )}
        </div>
      )}

      {/* Player tokens */}
      {playersOnTile.length > 0 && (
        <div className={`
          absolute flex gap-0.5 flex-wrap justify-center items-center
          transition-all duration-100 ease-out
          ${isCorner ? 'bottom-2 left-1/2 -translate-x-1/2' : 'bottom-1.5 left-1/2 -translate-x-1/2'}
        `}>
          {playersOnTile.map(player => (
            <div
              key={player.id}
              className="relative w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded-full player-token animate-token-move flex items-center justify-center font-bold text-white text-xs md:text-sm transition-all duration-100 ease-out"
              style={{ 
                backgroundColor: player.color,
                boxShadow: `0 0 12px ${player.color}, 0 2px 8px rgba(0,0,0,0.4)`,
                border: '2px solid white'
              }}
              title={player.name}
            >
              {player.name.charAt(0)}
            </div>
          ))}
        </div>
      )}

      {/* Hover effect */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-lg" />
    </div>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, onTileClick, centerContent }) => {
  const { players, ownedProperties } = gameState;

  const getOwnerColor = (position: number): string | undefined => {
    const owned = ownedProperties.find(p => p.position === position);
    if (!owned) return undefined;
    const owner = players.find(p => p.id === owned.ownerId);
    return owner?.color;
  };

  const getOwned = (position: number) => ownedProperties.find(p => p.position === position);

  return (
    <div className="relative glass-card p-2 md:p-3 lg:p-4 gradient-border max-w-full">
      <div className="grid grid-cols-11 gap-1 md:gap-1.5 lg:gap-2">
        {/* Top row (positions 20-30, left to right) */}
        {Array.from({ length: 11 }).map((_, i) => {
          const position = 20 + i;
          const tile = BOARD_TILES[position];
          const isCorner = position === 20 || position === 30;
          return (
            <BoardTile
              key={position}
              tile={tile}
              position={position}
              players={players}
              owned={getOwned(position)}
              ownerColor={getOwnerColor(position)}
              onClick={() => onTileClick?.(position)}
              orientation={isCorner ? 'corner' : 'top'}
            />
          );
        })}

        {/* Middle rows */}
        {Array.from({ length: 9 }).map((_, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            {/* Left side (positions 19-11, top to bottom) */}
            {(() => {
              const position = 19 - rowIndex;
              const tile = BOARD_TILES[position];
              return (
                <BoardTile
                  key={position}
                  tile={tile}
                  position={position}
                  players={players}
                  owned={getOwned(position)}
                  ownerColor={getOwnerColor(position)}
                  onClick={() => onTileClick?.(position)}
                  orientation="left"
                />
              );
            })()}

            {/* Center area */}
            {Array.from({ length: 9 }).map((_, colIndex) => (
              <div 
                key={`center-${rowIndex}-${colIndex}`} 
                className="bg-transparent"
              />
            ))}

            {/* Right side (positions 31-39, top to bottom) */}
            {(() => {
              const position = 31 + rowIndex;
              const tile = BOARD_TILES[position];
              return (
                <BoardTile
                  key={position}
                  tile={tile}
                  position={position}
                  players={players}
                  owned={getOwned(position)}
                  ownerColor={getOwnerColor(position)}
                  onClick={() => onTileClick?.(position)}
                  orientation="right"
                />
              );
            })()}
          </React.Fragment>
        ))}

        {/* Bottom row (positions 10-0, left to right) */}
        {Array.from({ length: 11 }).map((_, i) => {
          const position = 10 - i;
          const tile = BOARD_TILES[position];
          const isCorner = position === 10 || position === 0;
          return (
            <BoardTile
              key={position}
              tile={tile}
              position={position}
              players={players}
              owned={getOwned(position)}
              ownerColor={getOwnerColor(position)}
              onClick={() => onTileClick?.(position)}
              orientation={isCorner ? 'corner' : 'bottom'}
            />
          );
        })}
      </div>

      {/* Center content - Logo, Stats, Dice, and Log */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 md:p-6 lg:p-8">
        <div className="text-center w-full max-w-sm pointer-events-auto space-y-2">
          {/* Logo and stats - compact */}
          <div className="glass-panel rounded-xl backdrop-blur-md p-2 md:p-3">
            <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold gradient-text tracking-wide">
              MONOPOLY
            </h2>
            <div className="flex gap-3 mt-1.5 justify-center text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm bg-emerald-400"></div>
                <span className="text-muted-foreground">{gameState.availableHouses} H</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm bg-red-400"></div>
                <span className="text-muted-foreground">{gameState.availableHotels} HT</span>
              </div>
            </div>
          </div>

          {/* Custom center content (dice and log) */}
          {centerContent}
        </div>
      </div>
    </div>
  );
};
