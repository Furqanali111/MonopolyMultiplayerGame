import React from 'react';
import { CardData } from '@/game/constants';

interface CardDisplayProps {
  card: CardData | null;
  onDismiss: () => void;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({ card, onDismiss }) => {
  if (!card) return null;

  const isChance = card.type === 'chance';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div 
        className={`
          w-72 p-6 rounded-xl shadow-2xl transform animate-card-flip
          ${isChance ? 'bg-orange-500' : 'bg-blue-500'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-lg p-4 text-center">
          <h3 className="font-display text-xl mb-3">
            {isChance ? '❓ Chance' : '🏛️ Community Chest'}
          </h3>
          <p className="text-gray-800 text-sm leading-relaxed">
            {card.text}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
