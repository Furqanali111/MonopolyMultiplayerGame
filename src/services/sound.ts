import { GameState } from '@/game/types';
import { diffEvents } from '@/game/events';

/**
 * Sound effects, synthesized with Web Audio so there are no files to ship or license.
 * Everything is driven by diffing two game states, so single player and online sound the same.
 */

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem('sound-muted') === '1';
} catch {
  /* storage can be blocked; sound simply starts on */
}

export const isMuted = () => muted;
export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem('sound-muted', value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume(); // browsers allow this after the first click
    return ctx;
  } catch {
    return null;
  }
}

/** One shaped tone: frequency can glide from `f` to `to`. */
function tone(c: AudioContext, at: number, f: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number } = {}) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(f, at);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, at + dur);
  const peak = opts.gain ?? 0.18;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/** A short burst of filtered noise: dice rattle, card flip, hammer knock. */
function noise(c: AudioContext, at: number, dur: number, freq: number, gain = 0.2) {
  const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(at);
}

export type Sfx =
  | 'dice' | 'step' | 'coinIn' | 'coinOut' | 'buy' | 'build' | 'sell' | 'mortgage' | 'unmortgage'
  | 'card' | 'jail' | 'turn' | 'auction' | 'trade' | 'win' | 'bankrupt';

const PLAYERS: Record<Sfx, (c: AudioContext, t: number) => void> = {
  dice: (c, t) => {
    for (let i = 0; i < 7; i++) noise(c, t + i * 0.07 + Math.random() * 0.02, 0.05, 1800 + Math.random() * 1500, 0.22);
  },
  step: (c, t) => tone(c, t, 520, 0.05, { type: 'triangle', gain: 0.08 }),
  coinIn: (c, t) => {
    tone(c, t, 1318, 0.09, { type: 'square', gain: 0.07 });
    tone(c, t + 0.07, 1760, 0.22, { type: 'square', gain: 0.07 });
  },
  coinOut: (c, t) => {
    tone(c, t, 1100, 0.09, { type: 'square', gain: 0.06 });
    tone(c, t + 0.08, 700, 0.2, { type: 'square', gain: 0.06 });
  },
  buy: (c, t) => {
    noise(c, t, 0.05, 300, 0.4); // the stamp
    tone(c, t + 0.05, 988, 0.12, { type: 'triangle', gain: 0.16 });
    tone(c, t + 0.13, 1480, 0.35, { type: 'triangle', gain: 0.16 });
  },
  build: (c, t) => {
    noise(c, t, 0.04, 900, 0.5);
    noise(c, t + 0.11, 0.04, 900, 0.5);
    tone(c, t + 0.22, 660, 0.18, { type: 'triangle', gain: 0.12 });
  },
  sell: (c, t) => {
    tone(c, t, 880, 0.12, { type: 'triangle', gain: 0.14, to: 500 });
    noise(c, t + 0.1, 0.05, 700, 0.3);
  },
  mortgage: (c, t) => {
    tone(c, t, 440, 0.3, { type: 'sawtooth', gain: 0.07, to: 220 });
    noise(c, t + 0.28, 0.05, 250, 0.35);
  },
  unmortgage: (c, t) => {
    tone(c, t, 330, 0.12, { type: 'triangle', gain: 0.14 });
    tone(c, t + 0.1, 495, 0.12, { type: 'triangle', gain: 0.14 });
    tone(c, t + 0.2, 660, 0.3, { type: 'triangle', gain: 0.14 });
  },
  card: (c, t) => {
    noise(c, t, 0.12, 4200, 0.18);
    tone(c, t + 0.09, 740, 0.1, { type: 'sine', gain: 0.1 });
  },
  jail: (c, t) => {
    tone(c, t, 196, 0.5, { type: 'square', gain: 0.1 });
    tone(c, t, 207, 0.5, { type: 'square', gain: 0.1 });
    noise(c, t, 0.08, 1200, 0.4);
  },
  turn: (c, t) => {
    tone(c, t, 880, 0.35, { type: 'sine', gain: 0.14 });
    tone(c, t, 1320, 0.35, { type: 'sine', gain: 0.07 });
  },
  auction: (c, t) => {
    noise(c, t, 0.05, 500, 0.5);
    noise(c, t + 0.16, 0.05, 500, 0.5);
    noise(c, t + 0.32, 0.07, 450, 0.6);
  },
  trade: (c, t) => {
    tone(c, t, 784, 0.12, { type: 'sine', gain: 0.14 });
    tone(c, t + 0.12, 988, 0.25, { type: 'sine', gain: 0.14 });
  },
  win: (c, t) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, t + i * 0.13, f, 0.35, { type: 'triangle', gain: 0.16 }));
  },
  bankrupt: (c, t) => {
    tone(c, t, 220, 0.6, { type: 'sawtooth', gain: 0.1, to: 80 });
  },
};

/** Play a sound now, or `delay` seconds from now. */
export function play(name: Sfx, delay = 0) {
  const c = audio();
  if (!c) return;
  PLAYERS[name](c, c.currentTime + delay);
}

const STEP_SECONDS = 0.11; // matches the pawn's walk speed on the board

/** Turn one state change into sounds. `isMine` says whether a player id is the person at this screen. */
export function playChange(prev: GameState, next: GameState, isMine: (id: string) => boolean) {
  if (muted || prev === next) return;
  const events = diffEvents(prev, next);
  if (!events.length) return;

  const move = events.find((e) => e.type === 'move' && next.players.find((p) => p.id === e.playerId)?.position === e.to);
  const steps = move && move.type === 'move' ? (move.to - move.from + 40) % 40 : 0;
  const walked = steps > 0 && steps <= 12;

  const hasDice = events.some((e) => e.type === 'dice');
  const rattle = hasDice ? 0.5 : 0;
  // Land the result after the roll has rattled and the pawn has walked there
  const afterMove = rattle + (walked ? steps * STEP_SECONDS : move ? 0.4 : 0);

  if (hasDice) play('dice');
  if (walked) for (let i = 1; i <= steps; i++) play('step', rattle + i * STEP_SECONDS - 0.06);

  let property: Sfx | null = null;
  for (const e of events) {
    if (e.type !== 'property') continue;
    const a = prev.ownedProperties.find((o) => o.position === e.position);
    if (!a) property = 'buy';
    else if (e.ownerId && e.ownerId !== a.ownerId) property = 'trade';
    else if (e.isMortgaged !== a.isMortgaged) property = e.isMortgaged ? 'mortgage' : 'unmortgage';
    else if (e.houses > a.houses) property = 'build';
    else if (e.houses < a.houses) property = 'sell';
  }
  if (property) play(property, afterMove);

  // One coin sound per change, and not under a property sound that already says "money moved"
  const money = events.filter((e) => e.type === 'money');
  if (money.length && !property) {
    const myDelta = money.reduce((n, e) => (e.type === 'money' && isMine(e.playerId) ? n + e.delta : n), 0);
    const anyoneGained = money.some((e) => e.type === 'money' && e.delta > 0);
    play(myDelta > 0 || (myDelta === 0 && anyoneGained) ? 'coinIn' : 'coinOut', afterMove);
  }

  if (events.some((e) => e.type === 'card')) play('card', afterMove);
  if (events.some((e) => e.type === 'jail' && e.inJail)) play('jail', afterMove);
  if (events.some((e) => e.type === 'bankrupt')) play('bankrupt', afterMove);
  if (events.some((e) => e.type === 'auction' && e.status === 'started')) play('auction', afterMove);
  if (events.some((e) => e.type === 'trade' && e.status === 'proposed')) play('trade');
  if (next.phase === 'gameover' && prev.phase !== 'gameover') play('win', 0.3);
  else if (events.some((e) => e.type === 'turn' && isMine(e.playerId))) play('turn', 0.3);
}
