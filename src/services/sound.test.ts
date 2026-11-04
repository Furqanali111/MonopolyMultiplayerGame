import { describe, it, expect, vi } from 'vitest';
import { initializeGame } from '@/game/engine';
import { autoStep } from '@/game/autopilot';
import { playChange } from './sound';

// A stand-in for Web Audio that records how many sounds were started
let started = 0;
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
const node = (): any => {
  const n: any = { connect: (to: any) => to ?? n, start: () => started++, stop() {}, frequency: param(), gain: param(), Q: param() };
  return n;
};
class FakeAudio {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = node();
  resume() {}
  createOscillator = node;
  createGain = node;
  createBiquadFilter = node;
  createDynamicsCompressor = node;
  createBufferSource = node;
  createBuffer = (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) });
}

describe('sound', () => {
  it('turns a whole bot game into sounds without throwing', () => {
    vi.stubGlobal('AudioContext', FakeAudio);
    let s = initializeGame(3, 'medium');
    for (let i = 0; i < 1500 && s.players.filter((p) => !p.isBankrupt).length > 1; i++) {
      const next = autoStep(s);
      if (!next) break;
      playChange(s, next, (id) => id === s.players[0].id);
      s = next;
    }
    expect(started).toBeGreaterThan(100);
    vi.unstubAllGlobals();
  });
});
