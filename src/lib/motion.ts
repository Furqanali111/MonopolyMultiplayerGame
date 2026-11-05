// One motion language: use these instead of ad hoc numbers.
export const dur = { fast: 0.15, base: 0.3, slow: 0.6 } as const;
export const ease = { out: [0.16, 1, 0.3, 1], inOut: [0.4, 0, 0.2, 1] } as const;
export const spring = { type: 'spring', stiffness: 420, damping: 18 } as const;

/** Enter animation for a whole screen. Opacity and a small rise, no exit so screens never overlap. */
export const screenIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: dur.base, ease: ease.out },
} as const;
