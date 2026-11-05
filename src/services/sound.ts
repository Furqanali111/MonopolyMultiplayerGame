import { GameState } from '@/game/types';
import { diffEvents } from '@/game/events';
import { isDoubles } from '@/game/engine';

/**
 * Sound effects, synthesized with Web Audio so there are no files to ship or license.
 * Everything is driven by diffing two game states, so single player and online sound the same.
 * Timing follows what is on screen: ticks match the pawn's walk, results land when it arrives.
 */

let ctx: AudioContext | null = null;
let master: AudioNode | null = null;
let muted = false;
try {
  muted = localStorage.getItem('sound-muted') === '1';
} catch {
  /* storage can be blocked; sound simply starts on */
}

export type Bus = 'music' | 'sfx';
const volumes: Record<Bus, number> = { music: 0.35, sfx: 1 };
try {
  (['music', 'sfx'] as Bus[]).forEach((b) => {
    const v = parseFloat(localStorage.getItem(`volume-${b}`) ?? '');
    if (v >= 0 && v <= 1) volumes[b] = v;
  });
} catch {
  /* defaults */
}
const buses: Partial<Record<Bus | 'duck', GainNode>> = {};

export const isMuted = () => muted;
export const getVolume = (bus: Bus) => volumes[bus];
export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem('sound-muted', value ? '1' : '0');
  } catch {
    /* ignore */
  }
  musicSync();
}
export function setVolume(bus: Bus, value: number) {
  volumes[bus] = value;
  try {
    localStorage.setItem(`volume-${bus}`, String(value));
  } catch {
    /* ignore */
  }
  if (ctx) buses[bus]?.gain.setTargetAtTime(value, ctx.currentTime, 0.05);
  if (bus === 'music') musicSync();
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      // Effects share one bus with a compressor so a pile of coins cannot clip
      const sfx = ctx.createGain();
      sfx.gain.value = volumes.sfx;
      const comp = ctx.createDynamicsCompressor();
      const gain = ctx.createGain();
      gain.gain.value = 0.9;
      sfx.connect(comp);
      comp.connect(gain).connect(ctx.destination);
      master = sfx;
      // Music has its own volume and a duck stage that dips it under big cues
      const music = ctx.createGain();
      music.gain.value = volumes.music;
      const duckStage = ctx.createGain();
      music.connect(duckStage).connect(ctx.destination);
      Object.assign(buses, { sfx, music, duck: duckStage });
      loadSamples(ctx);
    }
    if (ctx.state === 'suspended') void ctx.resume(); // browsers allow this after the first click
    return ctx;
  } catch {
    return null;
  }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** One shaped tone: frequency can glide from `f` to `to`. */
function tone(c: AudioContext, at: number, f: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number } = {}) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(f, at);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.18, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/** Filtered noise: clicks, swishes, knocks. `sweepTo` slides the filter for whooshes. */
function noise(c: AudioContext, at: number, dur: number, freq: number, gain = 0.2, opts: { q?: number; sweepTo?: number } = {}) {
  const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = opts.q ?? 1;
  filter.frequency.setValueAtTime(freq, at);
  if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(g).connect(master!);
  src.start(at);
}

/** A struck metal sound (coin, bell): inharmonic partials that ring and fade. */
function metal(c: AudioContext, at: number, base: number, dur: number, gain = 0.08) {
  [1, 2.76, 5.4, 8.93].forEach((ratio, i) => tone(c, at, base * ratio, dur / (1 + i * 0.9), { gain: gain / (1 + i * 0.7) }));
}

/** A low body hit: a sine that drops in pitch. */
const thump = (c: AudioContext, at: number, from: number, to: number, dur: number, gain: number) => tone(c, at, from, dur, { gain, to });

/** A wooden knock: hammer on a post, gavel on a block. */
function knock(c: AudioContext, at: number, gain = 0.4) {
  noise(c, at, 0.035, 1200, gain, { q: 4 });
  thump(c, at, 330, 160, 0.07, gain * 0.7);
}

export type Sfx =
  | 'dice' | 'clack' | 'sparkle' | 'step' | 'stepLast' | 'go' | 'coinIn' | 'coinOut' | 'tax' | 'pot'
  | 'buy' | 'build' | 'hotel' | 'sell' | 'mortgage' | 'unmortgage'
  | 'cardChance' | 'cardCommunity' | 'jail' | 'unjail' | 'turn' | 'auction' | 'bid' | 'sold'
  | 'trade' | 'tradeYes' | 'tradeNo' | 'win' | 'bankrupt' | 'tap';

const REGISTER = (c: AudioContext, t: number) => {
  noise(c, t, 0.03, 3000, 0.25);
  metal(c, t + 0.07, 1760, 0.5, 0.09);
  metal(c, t + 0.2, 2349, 0.8, 0.09);
};

const PLAYERS: Record<Sfx, (c: AudioContext, t: number) => void> = {
  // Dice rattling in a cup, then settling
  dice: (c, t) => {
    for (let i = 0; i < 10; i++) {
      const at = t + i * 0.055 + rand(0, 0.02);
      const fade = 1 - i / 14;
      noise(c, at, 0.04, rand(1800, 3400), 0.3 * fade, { q: 2 });
      thump(c, at, rand(180, 260), 110, 0.05, 0.14 * fade);
    }
  },
  // The two dice landing
  clack: (c, t) => {
    knock(c, t, 0.45);
    knock(c, t + 0.09, 0.35);
  },
  sparkle: (c, t) => [2093, 2637, 3136].forEach((f, i) => metal(c, t + i * 0.08, f, 0.35, 0.04)),
  step: (c, t) => {
    noise(c, t, 0.02, 1600, 0.08, { q: 3 });
    thump(c, t, 230, 130, 0.05, 0.1);
  },
  stepLast: (c, t) => {
    noise(c, t, 0.03, 1400, 0.16, { q: 3 });
    thump(c, t, 190, 100, 0.08, 0.2);
  },
  // Passing GO: a bright run of coins
  go: (c, t) => [1568, 1760, 1976, 2349, 2637].forEach((f, i) => metal(c, t + i * 0.07, f, 0.3, 0.06)),
  coinIn: (c, t) => {
    metal(c, t, 2200, 0.35, 0.08);
    metal(c, t + 0.06, 2800, 0.45, 0.08);
  },
  coinOut: (c, t) => {
    metal(c, t, 1800, 0.3, 0.07);
    metal(c, t + 0.07, 1350, 0.4, 0.07);
  },
  // Tax: one heavy coin dropped into the pot, with a bounce
  tax: (c, t) => {
    metal(c, t, 1500, 0.5, 0.1);
    thump(c, t, 130, 80, 0.1, 0.18);
    metal(c, t + 0.13, 1500, 0.3, 0.06);
  },
  // Collecting the pot: a slot-machine cascade
  pot: (c, t) => {
    for (let i = 0; i < 14; i++) metal(c, t + i * 0.06 + rand(0, 0.03), rand(1800, 3200), 0.3, 0.05);
    REGISTER(c, t + 0.9);
  },
  // Deed stamped, then the register rings
  buy: (c, t) => {
    thump(c, t, 100, 50, 0.12, 0.5);
    noise(c, t, 0.06, 400, 0.4);
    REGISTER(c, t + 0.12);
  },
  build: (c, t) => {
    knock(c, t);
    knock(c, t + 0.14);
    metal(c, t + 0.3, 1760, 0.4, 0.05);
  },
  hotel: (c, t) => {
    knock(c, t);
    knock(c, t + 0.14);
    knock(c, t + 0.28, 0.5);
    metal(c, t + 0.45, 988, 1, 0.09);
    metal(c, t + 0.45, 1480, 0.8, 0.05);
  },
  sell: (c, t) => {
    knock(c, t);
    PLAYERS.coinOut(c, t + 0.12);
  },
  mortgage: (c, t) => {
    thump(c, t, 80, 40, 0.2, 0.6);
    noise(c, t, 0.08, 300, 0.5);
    tone(c, t, 200, 0.3, { type: 'sawtooth', gain: 0.05, to: 100 });
  },
  // A key in a lock, then a rising note
  unmortgage: (c, t) => {
    noise(c, t, 0.02, 3500, 0.3, { q: 5 });
    noise(c, t + 0.09, 0.02, 3000, 0.3, { q: 5 });
    metal(c, t + 0.18, 880, 0.5, 0.06);
  },
  cardChance: (c, t) => {
    noise(c, t, 0.14, 1200, 0.2, { sweepTo: 5000 });
    metal(c, t + 0.1, 1320, 0.4, 0.05);
  },
  cardCommunity: (c, t) => {
    noise(c, t, 0.14, 900, 0.2, { sweepTo: 3500 });
    metal(c, t + 0.1, 880, 0.45, 0.05);
  },
  // Door slam and a short siren
  jail: (c, t) => {
    thump(c, t, 60, 35, 0.3, 0.8);
    noise(c, t, 0.12, 200, 0.6);
    tone(c, t + 0.2, 700, 0.25, { type: 'square', gain: 0.05, to: 900 });
    tone(c, t + 0.45, 900, 0.25, { type: 'square', gain: 0.05, to: 700 });
  },
  unjail: (c, t) => {
    noise(c, t, 0.02, 3500, 0.3, { q: 5 });
    noise(c, t + 0.08, 0.02, 3000, 0.3, { q: 5 });
    thump(c, t + 0.16, 140, 90, 0.1, 0.25);
  },
  turn: (c, t) => {
    metal(c, t, 880, 1, 0.09);
    metal(c, t, 1320, 0.6, 0.04);
  },
  auction: (c, t) => knock(c, t, 0.5),
  bid: (c, t) => tone(c, t, 1200, 0.05, { type: 'triangle', gain: 0.1 }),
  sold: (c, t) => {
    knock(c, t, 0.5);
    knock(c, t + 0.18, 0.55);
    PLAYERS.coinIn(c, t + 0.4);
  },
  trade: (c, t) => {
    metal(c, t, 1320, 0.4, 0.06);
    metal(c, t + 0.12, 1760, 0.5, 0.06);
  },
  tradeYes: (c, t) => [523, 659, 784].forEach((f, i) => tone(c, t + i * 0.1, f, 0.3, { type: 'triangle', gain: 0.12 })),
  tradeNo: (c, t) => {
    thump(c, t, 150, 90, 0.18, 0.3);
    tone(c, t, 196, 0.2, { gain: 0.08 });
  },
  win: (c, t) => {
    [523, 659, 784].forEach((f, i) => tone(c, t + i * 0.13, f, 0.3, { type: 'triangle', gain: 0.15 }));
    tone(c, t + 0.39, 1047, 0.9, { type: 'triangle', gain: 0.16 });
    [2093, 2637, 3136].forEach((f, i) => metal(c, t + 0.5 + i * 0.1, f, 0.5, 0.04));
  },
  bankrupt: (c, t) => {
    tone(c, t, 220, 0.8, { type: 'sawtooth', gain: 0.1, to: 70 });
    thump(c, t + 0.5, 90, 45, 0.3, 0.4);
  },
  tap: (c, t) => tone(c, t, 1000, 0.03, { type: 'triangle', gain: 0.04 }),
};

// Recorded samples (Kenney, CC0: see public/sounds/CREDITS.md). Each part picks one file at random
// so repeats do not sound identical. Anything not listed here, or not loaded yet, uses the synth above.
interface Part {
  pick: string[];
  at?: number;
  gain?: number;
  rate?: number;
}
const n = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);

const SAMPLED: Partial<Record<Sfx, { parts: Part[]; synth?: (c: AudioContext, t: number) => void }>> = {
  dice: { parts: [{ pick: n('dice-shake-', 3) }] },
  clack: { parts: [{ pick: n('die-throw-', 4) }, { pick: n('dice-throw-', 3), at: 0.08, gain: 0.6 }] },
  step: { parts: [{ pick: n('chip-lay-', 3), gain: 0.5, rate: 1.2 }] },
  stepLast: { parts: [{ pick: n('chips-collide-', 4), gain: 0.6 }] },
  go: { parts: [{ pick: ['handleCoins'] }] },
  coinIn: { parts: [{ pick: n('chips-handle-', 4) }] },
  coinOut: { parts: [{ pick: n('chips-collide-', 4), gain: 0.9 }] },
  tax: { parts: [{ pick: n('chips-stack-', 4) }] },
  pot: { parts: [{ pick: ['handleCoins'] }, { pick: ['handleCoins2'], at: 0.35 }, { pick: n('chips-handle-', 4), at: 0.6 }], synth: (c, t) => REGISTER(c, t + 0.9) },
  buy: { parts: [{ pick: ['bookPlace1', 'bookPlace2'] }], synth: (c, t) => REGISTER(c, t + 0.12) },
  build: { parts: [{ pick: ['chop'], rate: 1.25 }, { pick: ['chop'], at: 0.16, rate: 1.25 }] },
  hotel: { parts: [{ pick: ['chop'], rate: 1.25 }, { pick: ['chop'], at: 0.16, rate: 1.25 }, { pick: ['chop'], at: 0.32, rate: 1.1 }, { pick: ['bong_001'], at: 0.5, rate: 0.7 }] },
  sell: { parts: [{ pick: ['chop'], rate: 1.25 }, { pick: ['handleCoins2'], at: 0.12 }] },
  mortgage: { parts: [{ pick: ['bookClose'] }, { pick: ['metalClick'], at: 0.12 }] },
  unmortgage: { parts: [{ pick: ['metalLatch'] }, { pick: ['pluck_002'], at: 0.2, rate: 1.2 }] },
  cardChance: { parts: [{ pick: ['card-fan-1'] }] },
  cardCommunity: { parts: [{ pick: n('card-slide-', 4) }] },
  jail: {
    parts: [{ pick: ['doorClose_1'] }],
    synth: (c, t) => {
      tone(c, t + 0.25, 700, 0.25, { type: 'square', gain: 0.05, to: 900 });
      tone(c, t + 0.5, 900, 0.25, { type: 'square', gain: 0.05, to: 700 });
    },
  },
  unjail: { parts: [{ pick: ['metalLatch'] }, { pick: ['doorOpen_1'], at: 0.2 }] },
  turn: { parts: [{ pick: ['bong_001'], rate: 0.85 }] },
  auction: { parts: [{ pick: ['chop'], rate: 0.8 }] },
  bid: { parts: [{ pick: ['pluck_001'], rate: 1.4 }] },
  sold: { parts: [{ pick: ['chop'], rate: 0.8 }, { pick: ['chop'], at: 0.2, rate: 0.8 }, { pick: ['handleCoins'], at: 0.4 }] },
  trade: { parts: [{ pick: ['pluck_001'] }, { pick: ['pluck_002'], at: 0.12 }] },
  tradeYes: { parts: [{ pick: ['confirmation_003'] }] },
  tradeNo: { parts: [{ pick: ['error_004'] }] },
  tap: { parts: [{ pick: ['click_001'], gain: 0.35, rate: 1.2 }] },
};

const buffers = new Map<string, AudioBuffer>();
let loadingStarted = false;

function loadSamples(c: AudioContext) {
  if (loadingStarted) return;
  loadingStarted = true;
  const files = new Set(Object.values(SAMPLED).flatMap((s) => s!.parts.flatMap((p) => p.pick)));
  files.forEach(async (file) => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}sounds/${file}.mp3`);
      buffers.set(file, await c.decodeAudioData(await res.arrayBuffer()));
    } catch {
      /* a missing or undecodable file just leaves that sound on the synth */
    }
  });
}

function sample(c: AudioContext, at: number, part: Part, pitch = 1) {
  const loaded = part.pick.filter((f) => buffers.has(f));
  const buffer = buffers.get(loaded[Math.floor(Math.random() * loaded.length)]);
  if (!buffer) return;
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = (part.rate ?? 1) * pitch * rand(0.96, 1.04);
  const g = c.createGain();
  g.gain.value = part.gain ?? 1;
  src.connect(g).connect(master!);
  src.start(at);
}

/** Cues big enough that the music should step back for a moment */
const DUCKS = new Set<Sfx>(['clack', 'go', 'pot', 'hotel', 'cardChance', 'cardCommunity', 'jail', 'sold', 'win', 'bankrupt']);

function duck(at: number, seconds = 1.3) {
  const g = buses.duck?.gain;
  if (!g) return;
  g.cancelScheduledValues(at);
  g.setTargetAtTime(0.3, at, 0.05);
  g.setTargetAtTime(1, at + seconds, 0.5);
}

/**
 * Play a sound now, or `delay` seconds from now. `pitch` scales recorded samples only;
 * shortcut: the synth fallback ignores it, fine while the samples ship with the game.
 */
export function play(name: Sfx, delay = 0, pitch = 1) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + delay;
  if (DUCKS.has(name)) duck(t);
  const recorded = SAMPLED[name];
  if (recorded && recorded.parts.every((p) => p.pick.some((f) => buffers.has(f)))) {
    recorded.parts.forEach((p) => sample(c, t + (p.at ?? 0), p, pitch));
    recorded.synth?.(c, t);
  } else {
    PLAYERS[name](c, t);
  }
}

/**
 * Background music, generated: a slow four chord loop (Am7, Fmaj7, Cmaj7, G6) with a soft pad,
 * a bass note and a few sparse plucks. No file to license. shortcut: swap for a recorded loop if
 * this ever sounds too thin; keep startMusic/stopMusic as the interface.
 */
const CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]];
const BAR_SECONDS = 4;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
let musicWanted = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicNext = 0;
let musicBar = 0;
const musicVoices = new Set<OscillatorNode>();

/** One soft voice on the music bus: slow fade in, fade out. */
function voice(c: AudioContext, at: number, f: number, dur: number, peak: number, attack: number, type: OscillatorType = 'sine') {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.linearRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(buses.music!);
  o.start(at);
  o.stop(at + dur + 0.05);
  musicVoices.add(o);
  o.onended = () => musicVoices.delete(o);
}

function musicBarAt(c: AudioContext, at: number, bar: number) {
  const chord = CHORDS[bar % CHORDS.length];
  chord.forEach((m, i) => voice(c, at + i * 0.05, hz(m), BAR_SECONDS + 1, 0.05, 1.4, 'triangle'));
  voice(c, at, hz(chord[0] - 24), BAR_SECONDS, 0.12, 0.3);
  for (let beat = 0; beat < 4; beat++) {
    if (Math.random() < 0.55) voice(c, at + beat + rand(0, 0.12), hz(chord[Math.floor(Math.random() * chord.length)] + 12), 1.4, 0.06, 0.02);
  }
}

function musicTick() {
  const c = ctx;
  if (!c || !buses.music) return;
  while (musicNext < c.currentTime + 2) {
    musicBarAt(c, Math.max(musicNext, c.currentTime), musicBar++);
    musicNext += BAR_SECONDS;
  }
}

/** Play only when wanted, not muted, audible, and the tab is on screen. */
function musicSync() {
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  const should = musicWanted && !muted && volumes.music > 0 && !hidden;
  if (should && !musicTimer) {
    const c = audio();
    if (!c) return;
    musicNext = c.currentTime + 0.1;
    musicBar = 0;
    musicTick();
    musicTimer = setInterval(musicTick, 500);
  } else if (!should && musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
    musicVoices.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already ended */
      }
    });
    musicVoices.clear();
  }
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', musicSync);

export const startMusic = () => {
  musicWanted = true;
  musicSync();
};
export const stopMusic = () => {
  musicWanted = false;
  musicSync();
};

let rattledAt = 0;
/** Call on the roll click so the rattle starts at once; the result then only adds the landing. */
export function rollSound() {
  rattledAt = Date.now();
  play('dice');
}

const STEP_SECONDS = 0.11; // matches the pawn's walk speed on the board
const CARD_OPENS = 0.6; // GameScreen opens the card this long after the state arrives

/** Turn one state change into sounds. `isMine` says whether a player id is the person at this screen. */
export function playChange(prev: GameState, next: GameState, isMine: (id: string) => boolean) {
  if (muted || prev === next) return;
  const events = diffEvents(prev, next);
  if (!events.length) return;

  const moveEvent = events.find((e) => e.type === 'move' && next.players.find((p) => p.id === e.playerId)?.position === e.to);
  const move = moveEvent && moveEvent.type === 'move' ? moveEvent : null;
  const steps = move ? (move.to - move.from + 40) % 40 : 0;
  const walked = steps > 0 && steps <= 12;
  // Where the result of the move lands: when the pawn gets there
  const arrive = walked ? steps * STEP_SECONDS : move ? 0.4 : 0;

  // Dice: the rattle already played on the click for your own roll; everyone else's plays now
  const dice = next.lastDiceRoll && events.some((e) => e.type === 'dice') ? next.lastDiceRoll : null;
  if (dice) {
    if (Date.now() - rattledAt > 2500) play('dice');
    play('clack', Date.now() - rattledAt > 2500 ? 0.5 : 0);
    if (isDoubles(dice)) play('sparkle', 0.65);
  }
  // Each hop is a little higher than the last, so a long walk sounds like it is climbing
  if (walked) for (let i = 1; i <= steps; i++) play(i === steps ? 'stepLast' : 'step', i * STEP_SECONDS - 0.06, 1 + i * 0.025);

  const money = events.filter((e) => e.type === 'money');
  const passedGo = !!move?.passedGo;
  if (passedGo) play('go', walked ? (40 - move!.from) * STEP_SECONDS : 0.2);

  const potBefore = prev.freeParkingPot ?? 0;
  const potAfter = next.freeParkingPot ?? 0;
  const auctionEnded = events.some((e) => e.type === 'auction' && e.status === 'ended');

  let property: Sfx | null = null;
  for (const e of events) {
    if (e.type !== 'property') continue;
    const a = prev.ownedProperties.find((o) => o.position === e.position);
    if (!a) property = auctionEnded ? 'sold' : 'buy';
    else if (e.ownerId && e.ownerId !== a.ownerId) property = 'trade';
    else if (e.isMortgaged !== a.isMortgaged) property = e.isMortgaged ? 'mortgage' : 'unmortgage';
    else if (e.houses > a.houses) property = e.houses === 5 ? 'hotel' : 'build';
    else if (e.houses < a.houses) property = 'sell';
  }
  if (property && property !== 'trade') play(property, arrive);

  // Money: one sound per change, and none under a property sound or the GO run that already say it
  if (money.length && !property) {
    const goOnly = passedGo && money.every((e) => e.type === 'money' && e.delta === 200);
    if (potAfter > potBefore) play('tax', arrive);
    else if (potAfter < potBefore) play('pot', arrive);
    else if (!goOnly) {
      const mine = money.reduce((n, e) => (e.type === 'money' && isMine(e.playerId) ? n + e.delta : n), 0);
      const anyGain = money.some((e) => e.type === 'money' && e.delta > 0);
      play(mine > 0 || (mine === 0 && anyGain) ? 'coinIn' : 'coinOut', arrive);
    }
  }

  if (events.some((e) => e.type === 'card') && next.lastCard) play(next.lastCard.type === 'chance' ? 'cardChance' : 'cardCommunity', CARD_OPENS);
  if (events.some((e) => e.type === 'jail' && e.inJail)) play('jail', arrive);
  if (events.some((e) => e.type === 'jail' && !e.inJail)) play('unjail');
  if (events.some((e) => e.type === 'bankrupt')) play('bankrupt', arrive);

  if (events.some((e) => e.type === 'auction' && e.status === 'started')) play('auction', arrive);
  if (prev.auction && next.auction && next.auction.currentBid > prev.auction.currentBid) play('bid');

  if (events.some((e) => e.type === 'trade' && e.status === 'proposed')) play('trade');
  if (events.some((e) => e.type === 'trade' && e.status === 'resolved')) {
    const moved = events.some((e) => e.type === 'property' || e.type === 'money');
    play(moved ? 'tradeYes' : 'tradeNo');
  }

  if (next.phase === 'gameover' && prev.phase !== 'gameover') play('win', 0.3);
  else if (events.some((e) => e.type === 'turn' && isMine(e.playerId))) play('turn', 0.3);
}
