import { describe, it, expect } from 'vitest';
import { initializeGame, rollTurn, buyProperty, endTurn } from './engine';
import { diffEvents } from './events';

describe('diffEvents', () => {
  it('describes a roll onto a taxed tile', () => {
    const g = initializeGame(2, 'easy');
    const ev = diffEvents(g, rollTurn(g, [1, 3])); // Income Tax (4)
    expect(ev.find(e => e.type === 'dice')).toMatchObject({ playerId: '0', dice: [1, 3] });
    expect(ev.find(e => e.type === 'move')).toMatchObject({ from: 0, to: 4, passedGo: false });
    expect(ev.find(e => e.type === 'money')).toMatchObject({ delta: -200 });
  });

  it('describes a purchase and a turn change', () => {
    const g = initializeGame(2, 'easy');
    const bought = buyProperty(g, '0', 6);
    expect(diffEvents(g, bought)).toContainEqual({ type: 'property', position: 6, ownerId: '0', houses: 0, isMortgaged: false });
    expect(diffEvents(bought, endTurn(bought))).toContainEqual({ type: 'turn', playerId: '1' });
  });

  it('is empty when nothing changed', () => {
    const g = initializeGame(2, 'easy');
    expect(diffEvents(g, { ...g })).toEqual([]);
  });
});

describe('card events', () => {
  it('reports a drawn card even though the card resolves in the same step', () => {
    const g = initializeGame(2, 'easy');
    g.players[0].position = 5; // 5 + 2 = 7 is a Chance tile
    const next = rollTurn(g, [1, 1]);
    expect(next.cardSeq).toBe(1);
    expect(diffEvents(g, next).some(e => e.type === 'card')).toBe(true);
  });
});
