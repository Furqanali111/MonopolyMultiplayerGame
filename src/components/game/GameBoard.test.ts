import { describe, it, expect } from 'vitest';
import { PHONE_NAMES, walkTrack } from './GameBoard';
import { BOARD_TILES } from '@/game/constants';

// Both the flat pawns and the 3D pieces walk by this rule, so a mistake here shows up on both.
describe('walkTrack', () => {
  it('walks tile by tile for a normal move', () => {
    expect(walkTrack(3, 7, false, false)).toEqual([4, 5, 6, 7]);
  });

  it('wraps past GO', () => {
    expect(walkTrack(38, 3, false, false)).toEqual([39, 0, 1, 2, 3]);
  });

  it('slides straight to jail and on long jumps', () => {
    expect(walkTrack(30, 10, true, false)).toEqual([10]);
    expect(walkTrack(7, 39, false, false)).toEqual([39]); // Advance to Boardwalk
  });

  it('does not walk when the player has not moved or reduced motion is on', () => {
    expect(walkTrack(5, 5, false, false)).toEqual([5]);
    expect(walkTrack(3, 7, false, true)).toEqual([7]);
  });
});

// Phone tiles are about 29px wide: a missing or long label breaks them silently.
describe('PHONE_NAMES', () => {
  it('names every deed, railroad and utility in at most 6 characters', () => {
    BOARD_TILES.filter((t) => t.property).forEach((t) => {
      const name = PHONE_NAMES[t.position];
      expect(name, `${t.name} has no phone name`).toBeTruthy();
      expect(name.length, `${t.name}: "${name}" is too long`).toBeLessThanOrEqual(6);
    });
  });
});
