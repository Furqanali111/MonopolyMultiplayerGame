import { describe, it, expect, vi, afterEach } from 'vitest';
import { initializeGame } from './engine';
import { autoStep, whoMustAct, owesLateFine } from './autopilot';

// Seeded random so a failure names a seed you can replay.
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

afterEach(() => vi.restoreAllMocks());

describe('owesLateFine', () => {
  const quick = () => {
    const s = initializeGame(2, 'easy', { startingMoney: 1500, freeParkingPot: false, quickGame: true });
    const human = { ...s.players[0], isAI: false };
    return { s: { ...s, players: [human, s.players[1]] }, human };
  };

  it('fines a late human, but not in a normal game or a bot', () => {
    const { s, human } = quick();
    expect(owesLateFine(s, human, false)).toBe(true);
    expect(owesLateFine({ ...s, rules: { ...s.rules!, quickGame: false } }, human, false)).toBe(false);
    expect(owesLateFine(s, { ...human, isAI: true }, false)).toBe(false);
  });

  it('fines a stood-in player again only at the start of a turn', () => {
    const { s, human } = quick();
    expect(owesLateFine(s, human, true)).toBe(true); // turn start: roll phase, no doubles
    expect(owesLateFine({ ...s, turnPhase: 'action' }, human, true)).toBe(false);
    expect(owesLateFine(s, { ...human, doublesCount: 1 }, true)).toBe(false); // re-roll after doubles
  });

  it('never fines during bankruptcy', () => {
    const { s, human } = quick();
    expect(owesLateFine({ ...s, phase: 'bankruptcy' }, human, false)).toBe(false);
  });
});

// Autopilot playing every seat must always make progress and finish the game.
describe('autopilot', () => {
  it('plays full games without stalling', () => {
    for (let seed = 1; seed <= 60; seed++) {
      vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
      let s = initializeGame(3, 'medium');
      let steps = 0;
      while (s.players.filter(p => !p.isBankrupt).length > 1 && steps < 40000) {
        const next = autoStep(s);
        if (!next) throw new Error(`seed ${seed}: stalled in ${s.phase}/${s.turnPhase} for ${whoMustAct(s)?.name}`);
        s = next;
        steps++;
      }
      expect(steps, `seed ${seed} did not finish`).toBeLessThan(40000);
    }
  });
});
