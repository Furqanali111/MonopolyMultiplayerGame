import { describe, it, expect } from 'vitest';
import { initializeGame } from './engine';
import { shouldAIAcceptTrade, getAIUnmortgage } from './ai';

// The human offers cash for the AI's Mediterranean Avenue (price $60)
const offerCash = (cash: number, difficulty: 'easy' | 'medium') => {
  const base = initializeGame(1, difficulty);
  const [human, bot] = base.players;
  const state = {
    ...base,
    ownedProperties: [{ position: 1, ownerId: bot.id, houses: 0, isMortgaged: false }],
    trade: { fromPlayer: human.id, toPlayer: bot.id, offeredProperties: [], requestedProperties: [1], offeredMoney: cash, requestedMoney: 0, offeredCards: 0, requestedCards: 0, active: true },
  };
  return shouldAIAcceptTrade(state, bot);
};

describe('AI trade answers', () => {
  it('takes a fair cash offer and refuses a lowball, at any difficulty', () => {
    for (const d of ['easy', 'medium'] as const) {
      expect(offerCash(100, d)).toBe(true);
      expect(offerCash(10, d)).toBe(false);
    }
  });
});

describe('AI mortgages', () => {
  it('lifts a mortgage when cash is comfortable, not when it is tight', () => {
    const base = initializeGame(1, 'medium');
    const bot = base.players[1];
    const mk = (money: number) => ({
      ...base,
      players: base.players.map(p => (p.id === bot.id ? { ...p, money } : p)),
      ownedProperties: [{ position: 1, ownerId: bot.id, houses: 0, isMortgaged: true }],
    });
    expect(getAIUnmortgage(mk(900), mk(900).players[1])).toBe(1);
    expect(getAIUnmortgage(mk(320), mk(320).players[1])).toBeNull();
  });
});
