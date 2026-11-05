import React from 'react';
import { motion } from 'motion/react';
import { Bot, Key, Lock, Star, WifiOff } from 'lucide-react';
import { Player, GameState } from '@/game/types';
import { getPropertyData, hasMonopoly } from '@/game/engine';
import { BOARD_TILES, PropertyColor } from '@/game/constants';
import { ChipStack } from '@/components/game/ChipStack';
import { Money, Pawn, PROPERTY_HEX, PROPERTY_LABEL } from '@/components/game/kit';
import { cn } from '@/lib/utils';

interface PlayerPanelProps {
  player: Player;
  gameState: GameState;
  isCurrentPlayer: boolean;
  isYou?: boolean;
  offline?: boolean;
  onPropertyClick?: (position: number) => void;
}

/** One seat at the table: chip, cash, and a pip per deed grouped by colour. */
export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  gameState,
  isCurrentPlayer,
  isYou,
  offline,
  onPropertyClick,
}) => {
  const owned = gameState.ownedProperties.filter((p) => p.ownerId === player.id);
  const groups = new Map<PropertyColor, typeof owned>();
  owned.forEach((o) => {
    const color = getPropertyData(o.position)?.color;
    if (color) groups.set(color, [...(groups.get(color) ?? []), o]);
  });

  return (
    <motion.article
      data-seat={player.id}
      layout="position"
      aria-current={isCurrentPlayer ? 'true' : undefined}
      className={cn(
        'relative border bg-card px-3 py-2.5 transition-[color,background-color,border-color,opacity,filter] duration-500',
        isCurrentPlayer ? 'border-gold/60 bg-gold/[0.06]' : 'border-border',
        player.isBankrupt && 'opacity-45 grayscale'
      )}
      style={{ borderRadius: 6 }}
    >
      <div className="flex items-center gap-3">
        <Pawn color={player.color} name={player.name} size={34} dim={player.isBankrupt} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold leading-tight">{player.name}</h3>
            {isYou && <span className="text-[11px] font-medium text-muted-foreground">you</span>}
            {player.isAI && <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Bot" />}
            {offline && <WifiOff className="h-3.5 w-3.5 shrink-0 text-ruby-text" aria-label="Disconnected" />}
          </div>
          <p className="truncate text-[12px] leading-tight text-muted-foreground">
            {player.isBankrupt ? (
              <span className="text-ruby-text">Bankrupt</span>
            ) : (
              <>
                {BOARD_TILES[player.position].name}
                {player.inJail && <span className="text-ruby-text"> · jail {player.jailTurns + 1}/3</span>}
              </>
            )}
          </p>
        </div>
        {!player.isBankrupt && <ChipStack money={player.money} />}
        <div className="text-right">
          <Money value={player.money} className="text-[17px] font-semibold" />
          <div className="mt-0.5 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
            {player.inJail && <Lock className="h-3 w-3 text-ruby-text" aria-label="In jail" />}
            {player.getOutOfJailCards > 0 && (
              <span className="inline-flex items-center gap-0.5" title="Get out of jail free cards">
                <Key className="h-3 w-3" aria-hidden />
                {player.getOutOfJailCards}
              </span>
            )}
          </div>
        </div>
      </div>

      {groups.size > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label={`${player.name}'s properties`}>
          {[...groups.entries()].map(([color, props]) => {
            const set = hasMonopoly(gameState, player.id, props[0].position);
            const houses = props.reduce((n, p) => n + p.houses, 0);
            return (
              <li key={color}>
                <button
                  type="button"
                  onClick={() => onPropertyClick?.(props[0].position)}
                  title={`${PROPERTY_LABEL[color]}: ${props.length}${set ? ', full set' : ''}${houses ? `, ${houses} buildings` : ''}`}
                  className={cn(
                    'flex h-6 items-center gap-1 rounded-[3px] border border-border bg-background pl-1.5 pr-1.5 text-[11px] font-medium tabular-nums transition-colors hover:border-gold/50',
                    props.some((p) => p.isMortgaged) && 'opacity-50'
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: PROPERTY_HEX[color] }} aria-hidden />
                  {props.length}
                  {set && <Star className="h-3 w-3 fill-gold text-gold" aria-label="full set" />}
                  {houses > 0 && <span className="text-muted-foreground">+{houses}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </motion.article>
  );
};
