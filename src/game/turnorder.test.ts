import { describe, it, expect, vi, afterEach } from 'vitest';
import { initializeGame, isDoubles } from './engine';
import { autoStep } from './autopilot';

afterEach(() => vi.restoreAllMocks());

// A player may only roll again straight after a roll if that roll was doubles.
describe('turn order', () => {
  it('never gives a second roll without doubles', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let x = seed;
      vi.spyOn(Math, 'random').mockImplementation(() => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296));
      let s = initializeGame(3, 'medium');
      for (let i = 0; i < 6000 && s.players.filter(p => !p.isBankrupt).length > 1; i++) {
        if (s.phase === 'playing' && s.turnPhase === 'roll' && s.lastDiceRoll) {
          expect(isDoubles(s.lastDiceRoll), `seed ${seed} step ${i}: rolled again after ${s.lastDiceRoll}`).toBe(true);
        }
        const next = autoStep(s);
        if (!next) break;
        s = next;
      }
    }
  });
});
