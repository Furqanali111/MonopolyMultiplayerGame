import React, { lazy, Suspense, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Fallback } from '@/components/game/Fallback';
import { webglAvailable } from '@/lib/webgl';

const Dice3D = lazy(() => import('@/components/game/Dice3D'));

interface DiceProps {
  values: [number, number] | null;
  isRolling: boolean;
}

// Pip layout on a 3x3 grid
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const Die: React.FC<{ value: number; rolling: boolean; index: number }> = ({ value, rolling, index }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      key={rolling ? 'rolling' : `settled-${value}`}
      initial={rolling || reduce ? false : { scale: 0.82, rotate: index ? 10 : -10, y: -6 }}
      animate={
        rolling && !reduce
          ? { rotate: [0, -14, 12, -8, 6, 0], y: [0, -7, 0, -4, 0], transition: { duration: 0.5, repeat: Infinity } }
          : { scale: 1, rotate: 0, y: 0, transition: { type: 'spring', stiffness: 420, damping: 18 } }
      }
      className="grid grid-cols-3 grid-rows-3 gap-[3px] rounded-[7px] bg-bone p-[7px]"
      style={{
        width: 'clamp(34px,7.4cqw,60px)',
        height: 'clamp(34px,7.4cqw,60px)',
        boxShadow: '0 6px 10px -2px rgba(0,0,0,.6), inset 0 -2px 0 rgba(14,17,22,.14), inset 0 0 0 1px rgba(14,17,22,.12)',
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="grid place-items-center">
          {PIPS[value]?.includes(i) && <span className="block aspect-square w-full max-w-[9px] rounded-full bg-background" />}
        </span>
      ))}
    </motion.div>
  );
};

/** Two dice in the felt tray. While rolling they tumble through random faces. */
export const Dice: React.FC<DiceProps> = ({ values, isRolling }) => {
  const [faces, setFaces] = useState<[number, number]>(values ?? [1, 1]);

  useEffect(() => {
    if (!isRolling) {
      if (values) setFaces(values);
      return;
    }
    const id = setInterval(() => setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]), 70);
    return () => clearInterval(id);
  }, [isRolling, values]);

  const reduce = useReducedMotion();
  const use3d = !reduce && webglAvailable();
  const flat = (
    <>
      <Die value={faces[0]} rolling={isRolling} index={0} />
      <Die value={faces[1]} rolling={isRolling} index={1} />
    </>
  );

  const total = values ? values[0] + values[1] : null;
  const doubles = !!values && values[0] === values[1];

  return (
    <div className="flex flex-col items-center gap-[clamp(4px,1cqw,10px)]">
      <div
        className="flex items-center gap-[clamp(6px,1.4cqw,14px)] rounded-[999px] bg-[hsl(151_62%_9%)] px-[clamp(14px,3cqw,30px)] py-[clamp(8px,1.6cqw,16px)] shadow-[inset_0_6px_14px_rgba(0,0,0,0.5),inset_0_0_0_1px_hsl(var(--gold)/0.22)]"
        role="img" aria-label={values ? `Rolled ${values[0]} and ${values[1]}` : 'Dice'}>
        {use3d ? (
          <Suspense fallback={flat}>
            <Fallback fallback={flat}>
              {/* Same footprint as two flat dice. The canvas is larger and overflows the tray so tumbling dice are not clipped. */}
              <div className="relative" style={{ width: 'calc(2 * clamp(34px,7.4cqw,60px) + clamp(6px,1.4cqw,14px))', height: 'clamp(34px,7.4cqw,60px)' }}>
                <div className="absolute" style={{ inset: '-100% -50%' }}>
                  <Dice3D values={values} rolling={isRolling} />
                </div>
              </div>
            </Fallback>
          </Suspense>
        ) : (
          flat
        )}
      </div>
      <div className="h-[1.4em] text-[clamp(10px,1.6cqw,14px)] tabular-nums text-bone/80" aria-live="polite">
        {!isRolling && total !== null && (
          <>
            {total}
            {doubles && <span className="ml-2 font-semibold text-foreground">Doubles, roll again</span>}
          </>
        )}
      </div>
    </div>
  );
};
