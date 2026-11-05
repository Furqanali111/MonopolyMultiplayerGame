import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CircleHelp, Landmark } from 'lucide-react';
import { ease } from '@/lib/motion';

type Kind = 'chance' | 'community';

const LOOK: Record<Kind, { accent: string; ink: string; label: string; Icon: typeof CircleHelp; tilt: number }> = {
  chance: { accent: '#F28C38', ink: '#A24A08', label: 'Chance', Icon: CircleHelp, tilt: -7 },
  community: { accent: '#3D6FD6', ink: '#2748A8', label: 'Community Chest', Icon: Landmark, tilt: 6 },
};

const FACE = 'absolute inset-0 rounded-[6%] border border-black/40 bg-bone';
const HIDE_BACK = { backfaceVisibility: 'hidden' } as const;

/** The back of a card: what the face-down stack and the flying card show before it turns. */
const Back: React.FC<{ kind: Kind }> = ({ kind }) => {
  const { accent, label, Icon } = LOOK[kind];
  return (
    <>
      <span aria-hidden className="absolute inset-[7%] rounded-[5%] border" style={{ borderColor: `${accent}88` }} />
      <span className="flex h-full flex-col items-center justify-center gap-[6%] text-center" style={{ color: accent }}>
        <Icon style={{ width: '36%', height: 'auto' }} strokeWidth={1.6} />
        <span className="px-1 font-semibold leading-tight" style={{ fontSize: 'clamp(6px,1.25cqw,10px)' }}>
          {label}
        </span>
      </span>
    </>
  );
};

/**
 * The drawn card leaves the stack, climbs, turns over to show its text and lands toward the middle
 * of the felt, just before the card dialog opens. Real 3D: it turns on its own edge in perspective.
 */
const Flight: React.FC<{ kind: Kind; text: string }> = ({ kind, text }) => {
  const { ink, accent, tilt } = LOOK[kind];
  const toCentre = tilt < 0 ? '112%' : '-112%'; // the Chance stack is on the left, Community Chest on the right
  return (
    <motion.div
      className="absolute inset-0 z-10"
      style={{ transformStyle: 'preserve-3d', transformPerspective: 700 }}
      initial={{ x: 0, y: 0, scale: 1, rotateY: 0, rotateZ: 0, opacity: 1 }}
      animate={{
        x: [0, 0, toCentre],
        y: [0, '-45%', '105%'],
        scale: [1, 1.25, 1.75],
        rotateY: [0, 90, 180],
        rotateZ: [0, tilt > 0 ? 6 : -6, 0],
        opacity: [1, 1, 0],
      }}
      transition={{ duration: 0.8, ease: ease.inOut, times: [0, 0.4, 1], opacity: { duration: 0.8, times: [0, 0.8, 1] } }}
    >
      <div className={FACE} style={HIDE_BACK}>
        <Back kind={kind} />
      </div>
      <div className={`${FACE} grid place-items-center p-[10%]`} style={{ ...HIDE_BACK, transform: 'rotateY(180deg)' }}>
        <span aria-hidden className="absolute inset-[7%] rounded-[5%] border" style={{ borderColor: `${accent}88` }} />
        <span className="text-center font-semibold leading-snug text-background" style={{ fontSize: 'clamp(5px,1cqw,8px)', color: ink }}>
          {text}
        </span>
      </div>
    </motion.div>
  );
};

/** A face-down stack. When this is the pile just drawn from, the top card flies out. */
const Deck: React.FC<{ kind: Kind; drawn: number; text?: string }> = ({ kind, drawn, text }) => {
  const reduce = useReducedMotion();
  const { tilt } = LOOK[kind];
  return (
    <div className="relative" style={{ width: 'clamp(30px,8.5cqw,84px)', aspectRatio: '5 / 7', transform: `rotate(${tilt}deg)` }}>
      {[3, 2, 1].map((i) => (
        <span key={i} className="absolute inset-0 rounded-[6%] border border-black/40" style={{ background: '#d9d2c0', transform: `translate(${i * 1.5}px, ${i * 1.5}px)` }} />
      ))}
      <div className={FACE}>
        <Back kind={kind} />
      </div>
      {drawn > 0 && !reduce && text && <Flight key={drawn} kind={kind} text={text} />}
    </div>
  );
};

/** The two draw piles on the felt. `seq` counts cards drawn; `last` says which pile the latest came from. */
export const CardDecks: React.FC<{ seq: number; last?: Kind; text?: string }> = ({ seq, last, text }) => {
  const seenAtMount = React.useRef(seq); // a resumed game must not replay the old draw
  const fresh = seq !== seenAtMount.current;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[13%] flex items-start justify-center gap-[12%]">
      <Deck kind="chance" drawn={fresh && last === 'chance' ? seq : 0} text={text} />
      <Deck kind="community" drawn={fresh && last === 'community' ? seq : 0} text={text} />
    </div>
  );
};
