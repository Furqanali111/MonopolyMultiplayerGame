import { describe, it, expect } from 'vitest';
import { initializeGame } from './engine';
import { autoStep, whoMustAct } from './autopilot';

// Autopilot playing every seat must always make progress and never throw.
describe('autopilot', () => {
  it('plays full games without stalling', () => {
    for (let g = 0; g < 60; g++) {
      let s = initializeGame(3, 'medium');
      let steps = 0;
      while (s.phase !== 'gameover' && steps < 5000) {
        const next = autoStep(s);
        if (!next) throw new Error(`stalled in ${s.phase}/${s.turnPhase} for ${whoMustAct(s)?.name}`);
        s = next;
        // end the game by elimination, or call it after enough turns
        if (s.players.filter(p => !p.isBankrupt).length === 1) break;
        steps++;
      }
      expect(steps).toBeLessThan(5000);
    }
  });
});
