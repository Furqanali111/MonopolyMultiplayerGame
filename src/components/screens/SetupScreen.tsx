import React, { useState } from 'react';
import { AIDifficulty } from '@/game/types';
import { Button } from '@/components/ui/button';

interface SetupScreenProps {
  onStartGame: (aiCount: number, difficulty: AIDifficulty) => void;
  onBack: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStartGame, onBack }) => {
  const [aiCount, setAiCount] = useState(2);
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="game-card max-w-md w-full animate-bounce-in">
        <h2 className="font-display text-3xl gold-text text-center mb-8">
          Game Setup
        </h2>

        {/* AI Count */}
        <div className="mb-8">
          <label className="block text-foreground font-semibold mb-3">
            Number of AI Players
          </label>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3].map(count => (
              <button
                key={count}
                onClick={() => setAiCount(count)}
                className={`
                  w-16 h-16 rounded-xl font-display text-2xl transition-all
                  ${aiCount === count 
                    ? 'bg-primary text-primary-foreground scale-110 shadow-lg' 
                    : 'bg-secondary text-foreground hover:bg-secondary/80'}
                `}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="text-center text-muted-foreground text-sm mt-2">
            {aiCount + 1} total players
          </p>
        </div>

        {/* Difficulty */}
        <div className="mb-8">
          <label className="block text-foreground font-semibold mb-3">
            AI Difficulty
          </label>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setDifficulty('easy')}
              className={`
                px-6 py-3 rounded-xl transition-all
                ${difficulty === 'easy' 
                  ? 'bg-primary text-primary-foreground scale-105 shadow-lg' 
                  : 'bg-secondary text-foreground hover:bg-secondary/80'}
              `}
            >
              <span className="text-lg">😊</span>
              <p className="text-sm mt-1">Easy</p>
            </button>
            <button
              onClick={() => setDifficulty('medium')}
              className={`
                px-6 py-3 rounded-xl transition-all
                ${difficulty === 'medium' 
                  ? 'bg-primary text-primary-foreground scale-105 shadow-lg' 
                  : 'bg-secondary text-foreground hover:bg-secondary/80'}
              `}
            >
              <span className="text-lg">🧠</span>
              <p className="text-sm mt-1">Medium</p>
            </button>
          </div>
          <p className="text-center text-muted-foreground text-xs mt-2">
            {difficulty === 'easy' 
              ? 'AI makes random decisions' 
              : 'AI uses strategic play'}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onBack}
            variant="secondary"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={() => onStartGame(aiCount, difficulty)}
            className="flex-1 btn-monopoly"
          >
            Start Game
          </Button>
        </div>
      </div>
    </div>
  );
};
