import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRightLeft, ChevronDown, Dices, Gavel, Hammer, KeyRound, Lock, Unlock, Undo2 } from 'lucide-react';
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
import ClickSpark from '@/components/ClickSpark';
import { CountdownRing, PROPERTY_HEX, Pawn } from '@/components/game/kit';
import { cn } from '@/lib/utils';

interface ActionPanelProps {
  gameState: GameState;
  /** The player whose turn it is */
  player: Player;
  /** True when the person at this screen controls `player` */
  canAct: boolean;
  isRolling: boolean;
  deadlineAt?: number | null;
  deadlineTotal?: number;
  onRoll: () => void;
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

const Primary: React.FC<React.ComponentProps<typeof Button>> = ({ className, ...props }) => (
  <Button size="lg" className={cn('w-full', className)} {...props} />
);

export const ActionPanel: React.FC<ActionPanelProps> = ({
  gameState,
  player,
  canAct,
  isRolling,
  deadlineAt,
  deadlineTotal,
  onRoll,
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
  const property = getPropertyData(player.position);
  const owned = getPropertyOwner(gameState, player.position);
  const mine = gameState.ownedProperties.filter((p) => p.ownerId === player.id);
  const phase = gameState.turnPhase;

  // What the panel is asking of the player, as a heading plus the one primary action
  let heading = '';
  let detail: React.ReactNode = null;
  let primary: React.ReactNode = null;
  let secondary: React.ReactNode = null;

  if (!canAct) {
    heading = gameState.phase === 'auction' ? 'Auction in progress' : `${player.name} is playing`;
    detail = gameState.phase === 'auction' ? 'Bidding is open to everyone.' : phase === 'roll' ? 'Waiting for the roll.' : 'Waiting for their move.';
  } else if (player.inJail && phase === 'injail') {
    heading = 'You are in jail';
    detail = `Attempt ${player.jailTurns + 1} of 3. Roll doubles to leave, or pay your way out.`;
    primary = (
      <Primary onClick={onRollForJail} disabled={isRolling}>
        <Dices /> {isRolling ? 'Rolling…' : 'Roll for doubles'}
      </Primary>
    );
    secondary = (
      <>
        {player.money >= JAIL_FINE && (
          <Button variant="secondary" onClick={onPayJailFine}>
            Pay ${JAIL_FINE}
          </Button>
        )}
        {player.getOutOfJailCards > 0 && (
          <Button variant="secondary" onClick={onUseJailCard}>
            <KeyRound /> Use card
          </Button>
        )}
      </>
    );
  } else if (phase === 'roll') {
    heading = 'Your turn';
    detail = player.doublesCount > 0 ? 'You rolled doubles, so roll again.' : 'Roll the dice to move.';
    primary = (
      <Primary onClick={onRoll} disabled={isRolling}>
        <Dices /> {isRolling ? 'Rolling…' : 'Roll dice'}
      </Primary>
    );
  } else if (phase === 'action' && property && !owned) {
    const affordable = canBuyProperty(gameState, player.id, player.position);
    heading = property.name;
    detail = affordable ? 'Unowned. Buy it, or put it up for auction.' : `Unowned. You need $${property.price - player.money} more to buy it.`;
    primary = (
      <Primary onClick={onBuyProperty} disabled={!affordable}>
        Buy for ${property.price}
      </Primary>
    );
    secondary = (
      <Button variant="secondary" onClick={onDeclineProperty}>
        <Gavel /> Auction
      </Button>
    );
  } else if (phase === 'endturn') {
    // Just sent to jail: the turn is over, and the first jail attempt comes on the next one
    heading = player.inJail ? 'You are in jail' : 'Wrap up your turn';
    detail = player.inJail ? 'Your turn is over. You roll for doubles on your next turn.' : 'Build, trade or manage deeds, then end your turn.';
    primary = <Primary onClick={onEndTurn}>End turn</Primary>;
  } else {
    heading = BOARD_TILES[player.position].name;
    detail = 'Resolving…';
  }

  return (
    <section
      aria-label="Your move"
      className="sticky bottom-0 z-20 border border-border bg-card lg:static"
      style={{ borderRadius: 6, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-start gap-3 px-3.5 pt-3">
        <Pawn color={player.color} name={player.name} size={30} />
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={heading + String(canAct)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="truncate text-[15px] font-semibold leading-tight">{heading}</h2>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <CountdownRing at={deadlineAt ?? null} total={deadlineTotal} />
      </div>

      {canAct && (
        // Buying a deed is the one moment that earns a flourish: a burst of gold chips. The burst lives on
        // this container, which stays mounted while the button below it swaps to "End turn".
        <ClickSpark
          sparkColor={['#E3B341', '#FAD27C', '#F3EFE6']}
          shape="dot"
          sparkCount={12}
          sparkSize={8}
          sparkRadius={46}
          duration={700}
          disabled={!(phase === 'action' && !player.inJail && !!property && !owned)}
          className="block"
        >
          <div className="space-y-2 px-3.5 pb-3 pt-3">
            {primary}
            <div className="flex flex-wrap gap-2 empty:hidden">
              {secondary}
              {phase === 'endturn' && !player.inJail && gameState.phase === 'playing' && (
                <Button variant="secondary" onClick={onTrade}>
                  <ArrowRightLeft /> Trade
                </Button>
              )}
            </div>
          </div>
        </ClickSpark>
      )}

      {canAct && mine.length > 0 && gameState.phase === 'playing' && (
        <details className="group border-t border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 text-[13px] font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            Manage deeds ({mine.length})
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="max-h-64 divide-y divide-border overflow-y-auto border-t border-border">
            {mine.map((o) => {
              const prop = getPropertyData(o.position)!;
              const build = canBuildHouse(gameState, player.id, o.position);
              const sell = canSellHouse(gameState, player.id, o.position);
              const mortgage = canMortgage(gameState, player.id, o.position);
              const unmortgage = canUnmortgage(gameState, player.id, o.position);
              return (
                <li key={o.position} className="flex items-center gap-2 px-3.5 py-2">
                  <span className="h-6 w-1.5 shrink-0 rounded-[1px]" style={{ background: prop.color ? PROPERTY_HEX[prop.color] : '#6C7584' }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-[13px] font-medium', o.isMortgaged && 'text-muted-foreground line-through')}>{prop.name}</p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      {o.houses === 5 ? 'Hotel' : o.houses > 0 ? `${o.houses} house${o.houses > 1 ? 's' : ''}` : o.isMortgaged ? 'Mortgaged' : 'No buildings'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {build && (
                      <Button size="sm" variant="outline" onClick={() => onBuildHouse(o.position)} title={`Build for $${prop.houseCost}`}>
                        <Hammer /> ${prop.houseCost}
                      </Button>
                    )}
                    {sell && (
                      <Button size="sm" variant="ghost" onClick={() => onSellHouse(o.position)} title={`Sell a building for $${Math.floor(prop.houseCost! / 2)}`}>
                        <Undo2 /> ${Math.floor(prop.houseCost! / 2)}
                      </Button>
                    )}
                    {mortgage && (
                      <Button size="sm" variant="ghost" onClick={() => onMortgage(o.position)} title={`Mortgage for $${prop.mortgageValue}`}>
                        <Lock /> ${prop.mortgageValue}
                      </Button>
                    )}
                    {unmortgage && (
                      <Button size="sm" variant="outline" onClick={() => onUnmortgage(o.position)} title="Pay to lift the mortgage">
                        <Unlock /> ${Math.floor(prop.mortgageValue * 1.1)}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
};
