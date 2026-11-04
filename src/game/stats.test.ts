import { describe, it, expect } from 'vitest';
import { initializeGame, rollTurn, endTurn, buyProperty } from './engine';
import { diffEvents } from './events';
import { addEventsToStats, finalStandings, StatsTable } from './stats';

describe('stats', () => {
  it('accumulates turns, doubles and money flow from events', () => {
    const stats: StatsTable = {};
    let g = initializeGame(2, 'easy');
    let next = rollTurn(g, [2, 2]); // doubles onto Income Tax
    addEventsToStats(stats, diffEvents(g, next));
    g = next; next = endTurn({ ...g, turnPhase: 'endturn' });
    addEventsToStats(stats, diffEvents(g, next));
    expect(stats['0']).toMatchObject({ doubles: 1, moneyPaid: 200 });
    expect(stats['1'].turns).toBe(1);
  });

  it('ranks by net worth and counts properties', () => {
    let g = initializeGame(2, 'easy');
    g = buyProperty(g, '1', 39); // Boardwalk, $400
    const [first, second] = finalStandings(g, {});
    expect(first.playerId).not.toBe(second.playerId);
    expect(second.netWorth).toBeLessThanOrEqual(first.netWorth);
    expect(g.ownedProperties.length).toBe(1);
  });
});
