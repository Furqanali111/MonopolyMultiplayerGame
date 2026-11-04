import { GameEvent } from './events';
import { GameState, PlayerId } from './types';
import { calculatePlayerNetWorth } from './engine';

export interface PlayerStats {
  turns: number;
  doubles: number;
  timesJailed: number;
  moneyReceived: number;
  moneyPaid: number;
}

export type StatsTable = Record<PlayerId, PlayerStats>;

const blank = (): PlayerStats => ({ turns: 0, doubles: 0, timesJailed: 0, moneyReceived: 0, moneyPaid: 0 });

/** Fold one update's events into the running totals. */
export function addEventsToStats(stats: StatsTable, events: GameEvent[]): StatsTable {
  for (const e of events) {
    if (e.type === 'turn') (stats[e.playerId] ??= blank()).turns++;
    else if (e.type === 'dice' && e.dice[0] === e.dice[1]) (stats[e.playerId] ??= blank()).doubles++;
    else if (e.type === 'jail' && e.inJail) (stats[e.playerId] ??= blank()).timesJailed++;
    else if (e.type === 'money') {
      const s = (stats[e.playerId] ??= blank());
      if (e.delta > 0) s.moneyReceived += e.delta;
      else s.moneyPaid += -e.delta;
    }
  }
  return stats;
}

/** Final standings: richest first, with the running totals attached. */
export function finalStandings(state: GameState, stats: StatsTable) {
  return state.players
    .map(p => ({
      playerId: p.id,
      name: p.name,
      isBankrupt: p.isBankrupt,
      netWorth: p.isBankrupt ? 0 : calculatePlayerNetWorth(state, p.id),
      properties: state.ownedProperties.filter(o => o.ownerId === p.id).length,
      ...(stats[p.id] ?? blank()),
    }))
    .sort((a, b) => b.netWorth - a.netWorth);
}
