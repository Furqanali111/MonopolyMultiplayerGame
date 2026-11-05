import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CircleHelp, Landmark } from 'lucide-react';
import { dur, ease } from '@/lib/motion';

type Kind = 'chance' | 'community';

const LOOK: Record<Kind, { accent: string; label: string; Icon: typeof CircleHelp; tilt: number }> = {
  chance: { accent: '#F28C38', label: 'Chance', Icon: CircleHelp, tilt: -7 },
  community: { accent: '#3D6FD6', label: 'Community Chest', Icon: Landmark, tilt: 6 },
};

/** A face-down stack. The top card lifts and settles back when this deck is the one just drawn from. */
const Deck: React.FC<{ kind: Kind; drawn: number }> = ({ kind, drawn }) => {
  const reduce = useReducedMotion();
  const { accent, label, Icon, tilt } = LOOK[kind];
  const face = 'absolute inset-0 rounded-[6%] border border-black/40';

  return (
    <div className="relative" style={{ width: 'clamp(40px,9.5cqw,84px)', aspectRatio: '5 / 7', transform: `rotate(${tilt}deg)` }}>
      {[3, 2, 1].map((i) => (
        <span key={i} className={face} style={{ background: '#d9d2c0', transform: `translate(${i * 1.5}px, ${i * 1.5}px)` }} />
      ))}
      <motion.div
        // Re-keyed on each draw so the lift replays; the first render stays still
        key={drawn}
        className={`${face} grid place-items-center bg-bone`}
        initial={drawn && !reduce ? { y: 0, rotate: 0, scale: 1 } : false}
        animate={drawn && !reduce ? { y: [0, '-26%', 0], rotate: [0, tilt > 0 ? 8 : -8, 0], scale: [1, 1.1, 1] } : undefined}
        transition={{ duration: dur.slow + 0.2, ease: ease.inOut }}
      >
        <span aria-hidden className="absolute inset-[7%] rounded-[5%] border" style={{ borderColor: `${accent}88` }} />
        <span className="flex flex-col items-center gap-[6%] text-center" style={{ color: accent }}>
          <Icon style={{ width: '36%', height: 'auto' }} strokeWidth={1.6} />
          <span className="px-1 font-semibold leading-tight" style={{ fontSize: 'clamp(6px,1.25cqw,10px)' }}>
            {label}
          </span>
        </span>
      </motion.div>
    </div>
  );
};

/** The two draw piles on the felt. `seq` counts cards drawn; `last` says which pile the latest came from. */
export const CardDecks: React.FC<{ seq: number; last?: Kind }> = ({ seq, last }) => {
  const seenAtMount = React.useRef(seq); // a resumed game must not replay the old draw
  const fresh = seq !== seenAtMount.current;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[16%] flex items-start justify-center gap-[12%]">
      <Deck kind="chance" drawn={fresh && last === 'chance' ? seq : 0} />
      <Deck kind="community" drawn={fresh && last === 'community' ? seq : 0} />
    </div>
  );
};
