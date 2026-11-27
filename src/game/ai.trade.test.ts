import { describe, it, expect } from 'vitest';
import { initializeGame } from './engine';
import { shouldAIAcceptTrade, getAITradeOffer, getAIUnmortgage } from './ai';

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

// The human (id 0) pays cash to the bot (id 1); the first two arguments are the tiles each owns
const table = (human: number[], bot: number[], difficulty: 'easy' | 'medium' = 'medium', botMoney = 1500) => {
  const base = initializeGame(1, difficulty);
  return {
    ...base,
    tradeSeed: 0, // no hidden mood
    players: base.players.map((p, i) => (i === 1 ? { ...p, money: botMoney } : p)),
    ownedProperties: [...human.map(position => ({ position, ownerId: '0' })), ...bot.map(position => ({ position, ownerId: '1' }))]
      .map(o => ({ ...o, houses: 0, isMortgaged: false })),
  };
};
const answer = (s: ReturnType<typeof table>, want: number[], cash: number, give: number[] = [], wantCash = 0) =>
  shouldAIAcceptTrade({ ...s, trade: { fromPlayer: '0', toPlayer: '1', offeredProperties: give, requestedProperties: want, offeredMoney: cash, requestedMoney: wantCash, offeredCards: 0, requestedCards: 0, active: true } }, s.players[1]);
// Lowest cash the bot takes
const ask = (s: ReturnType<typeof table>, want: number[]) => {
  let cash = 0;
  while (!answer(s, want, cash)) cash++;
  return cash;
};

describe('AI trade pricing', () => {
  // 31, 32 are $300 greens, 34 is $320. The human has $1500, enough to build after buying (+0.5x)
  it('asks a premium that grows with what the tile is worth to either side', () => {
    expect(ask(table([], [31]), [31])).toBe(390);
    expect(ask(table([32], [31]), [31])).toBe(480); // human collecting
    expect(ask(table([], [31, 32]), [31])).toBe(540); // bot collecting
    expect(ask(table([32, 34], [31]), [31])).toBe(901); // completes: $900, once paying it leaves under $600 to build with
    expect(ask(table([], [31, 32, 34]), [31])).toBe(1200); // breaks the bot's set
    expect(ask(table([1], [3]), [3])).toBe(210); // completes a cheap set and can build: 3.5x of $60
    expect(ask(table([], [31], 'medium', 100), [31])).toBe(332); // broke bot: 1.3 * 0.85
    expect(ask(table([32, 34], [31], 'easy'), [31])).toBe(600);
  });

  it('scales railroads with how many either side owns', () => {
    expect(ask(table([], [5]), [5])).toBe(260);
    expect(ask(table([15, 25, 35], [5]), [5])).toBe(500);
  });

  it('accepts a swap that gives both sides a set at near list price', () => {
    const s = table([32, 34, 1], [31, 3]); // human gives Baltic's partner, takes the third green
    expect(answer(s, [31], 0, [1])).toBe(false);
    expect(answer(s, [31], 289, [1])).toBe(true); // 300 * 1.2 - 60 * 1.2, plus rounding
  });

  it('never profits from selling a tile and buying it straight back', () => {
    for (const money of [1500, 100]) {
      const most = Math.floor(300 * 1.8 * 0.85);
      expect(answer(table([31], [32], 'medium', money), [], 0, [31], most + 1)).toBe(false);
      expect(ask(table([], [31, 32], 'medium', money), [31])).toBeGreaterThanOrEqual(most);
    }
  });

  it('keeps the hidden mood within 15% and the same on every ask', () => {
    const s = { ...table([], [31]), tradeSeed: 0.42 };
    const price = ask(s, [31]);
    expect(price).toBe(ask(s, [31]));
    expect(price).toBeGreaterThanOrEqual(330);
    expect(price).toBeLessThanOrEqual(449);
  });

  it('opens its own offers at a price a bot owner accepts', () => {
    const s = { ...table([32, 34], [31]), tradeSeed: 0.42 };
    const offer = getAITradeOffer(s, s.players[0])!;
    expect(shouldAIAcceptTrade({ ...s, trade: { ...offer, active: true } }, s.players[1])).toBe(true);
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
