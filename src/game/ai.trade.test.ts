import { describe, it, expect } from 'vitest';
import { initializeGame } from './engine';
import { shouldAIAcceptTrade } from './ai';

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
