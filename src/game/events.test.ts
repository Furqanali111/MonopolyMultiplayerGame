import { describe, it, expect } from 'vitest';
import { initializeGame, rollTurn, buyProperty, endTurn, startAuction, placeBid, passAuction } from './engine';
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

describe('passedGo', () => {
  const moved = (from: number, to: number, inJail = false) => {
    const g = initializeGame(2, 'easy');
    const at = (position: number, jailed: boolean) => ({ ...g, players: g.players.map((p, i) => (i ? p : { ...p, position, inJail: jailed })) });
    return diffEvents(at(from, false), at(to, inJail)).find(e => e.type === 'move');
  };

  it('is true for a wrap, landing on GO, and a card that wraps a short way', () => {
    expect(moved(38, 3)).toMatchObject({ passedGo: true });
    expect(moved(36, 0)).toMatchObject({ passedGo: true });
    expect(moved(7, 5)).toMatchObject({ passedGo: true }); // Chance to Reading Railroad
  });

  it('is false for Go Back 3 and Go To Jail', () => {
    expect(moved(7, 4)).toMatchObject({ passedGo: false });
    expect(moved(30, 10, true)).toMatchObject({ passedGo: false });
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

describe('auction end', () => {
  it('reports the winning property and the winner paying, in one diff', () => {
    let g = startAuction(initializeGame(2, 'easy'), 6); // you plus 2 AI
    const bidder = () => g.auction!.participants.filter(id => !g.auction!.passedPlayers.includes(id))[g.auction!.currentBidderIndex % (g.auction!.participants.length - g.auction!.passedPlayers.length)];
    g = placeBid(g, bidder(), 50);
    g = passAuction(g, bidder());
    const before = g; // one bidder still has to pass, which ends it
    g = passAuction(g, bidder());
    const ev = diffEvents(before, g);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'auction', status: 'ended', position: 6 }));
    expect(ev.find(e => e.type === 'property')).toMatchObject({ position: 6, ownerId: '0' });
    expect(ev).toContainEqual(expect.objectContaining({ type: 'money', playerId: '0', delta: -50 }));
  });
});
