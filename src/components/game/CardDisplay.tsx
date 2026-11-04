import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CircleHelp, Landmark } from 'lucide-react';
import { CardData } from '@/game/constants';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CardDisplayProps {
  card: CardData | null;
  onDismiss: () => void;
}

/** A drawn card, built like a playing card: corner indices, centre pip, one line of text. */
export const CardDisplay: React.FC<CardDisplayProps> = ({ card, onDismiss }) => {
  const reduce = useReducedMotion();
  if (!card) return null;

  const isChance = card.type === 'chance';
  const title = isChance ? 'Chance' : 'Community Chest';
  const Icon = isChance ? CircleHelp : Landmark;
  const accent = isChance ? '#F28C38' : '#3D6FD6';
  const ink = isChance ? '#A24A08' : '#2748A8'; // text and icons: AA on the bone card

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-[300px] border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{card.text}</DialogDescription>
        <motion.div
          initial={reduce ? false : { rotateY: 88, y: 24, opacity: 0 }}
          animate={{ rotateY: 0, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          style={{ transformPerspective: 900 }}
          className="relative aspect-[5/7] w-full rounded-[14px] bg-bone p-5 text-background"
        >
          <span aria-hidden className="absolute inset-[7px] rounded-[9px] border" style={{ borderColor: `${accent}66` }} />
          <div className="absolute left-4 top-3.5 flex flex-col items-center leading-none" style={{ color: ink }}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="absolute bottom-3.5 right-4 flex rotate-180 flex-col items-center leading-none" style={{ color: ink }}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="relative flex h-full flex-col items-center justify-center px-3 text-center">
            <p className="text-[12px] font-semibold" style={{ color: ink }}>
              {title}
            </p>
            <Icon className="my-4 h-12 w-12" style={{ color: ink }} strokeWidth={1.5} />
            <p className="text-[17px] font-semibold leading-snug">{card.text}</p>
          </div>
        </motion.div>
        <Button size="lg" onClick={onDismiss} className="mt-3 w-full">
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
};
