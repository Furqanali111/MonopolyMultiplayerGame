import React from 'react';
import { Sparkles } from 'lucide-react';

interface DiceProps {
  values: [number, number] | null;
  isRolling: boolean;
  onRoll: () => void;
  disabled?: boolean;
}

const DiceFace: React.FC<{ value: number; isRolling: boolean }> = ({ value, isRolling }) => {
  const dots = getDotPositions(value);

  return (
    <div 
      className={`
        dice-face
        ${isRolling ? 'animate-dice-roll' : ''}
      `}
    >
      {dots.map((pos, i) => (
        <div
          key={i}
          className="dice-dot"
          style={{ top: pos.top, left: pos.left }}
        />
      ))}
    </div>
  );
};

function getDotPositions(value: number): { top: string; left: string }[] {
  const center = { top: 'calc(50% - 5px)', left: 'calc(50% - 5px)' };
  const topLeft = { top: 'calc(25% - 5px)', left: 'calc(25% - 5px)' };
  const topRight = { top: 'calc(25% - 5px)', left: 'calc(75% - 5px)' };
  const bottomLeft = { top: 'calc(75% - 5px)', left: 'calc(25% - 5px)' };
  const bottomRight = { top: 'calc(75% - 5px)', left: 'calc(75% - 5px)' };
  const midLeft = { top: 'calc(50% - 5px)', left: 'calc(25% - 5px)' };
  const midRight = { top: 'calc(50% - 5px)', left: 'calc(75% - 5px)' };

  const positions: Record<number, { top: string; left: string }[]> = {
    1: [center],
    2: [topLeft, bottomRight],
    3: [topLeft, center, bottomRight],
    4: [topLeft, topRight, bottomLeft, bottomRight],
    5: [topLeft, topRight, center, bottomLeft, bottomRight],
    6: [topLeft, topRight, midLeft, midRight, bottomLeft, bottomRight],
  };

  return positions[value] || [];
}

export const Dice: React.FC<DiceProps> = ({ values, isRolling, onRoll, disabled }) => {
  const displayValues = values || [1, 1];
  const isDoubles = values && values[0] === values[1];
  const total = values ? values[0] + values[1] : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Compact dice container */}
      <div className="flex gap-2">
        <div className="dice-face-sm">
          <div 
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${isRolling ? 'animate-dice-roll' : ''}`}
            style={{
              background: 'linear-gradient(145deg, hsl(0 0% 95%), hsl(0 0% 85%))',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.8)'
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              {getDotPositions(displayValues[0]).map((pos, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-slate-800"
                  style={{ top: pos.top, left: pos.left }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="dice-face-sm">
          <div 
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${isRolling ? 'animate-dice-roll' : ''}`}
            style={{
              background: 'linear-gradient(145deg, hsl(0 0% 95%), hsl(0 0% 85%))',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.8)'
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              {getDotPositions(displayValues[1]).map((pos, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-slate-800"
                  style={{ top: pos.top, left: pos.left }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Compact result */}
      {values && (
        <div className="text-center">
          <span className="text-xl md:text-2xl font-bold text-primary">{total}</span>
          {isDoubles && (
            <p className="text-[10px] text-accent font-semibold flex items-center gap-1 justify-center mt-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              Doubles!
            </p>
          )}
        </div>
      )}

      {/* Compact button */}
      <button
        onClick={onRoll}
        disabled={disabled || isRolling}
        className="btn-primary w-full text-xs h-7 px-3"
      >
        {isRolling ? 'Rolling...' : 'Roll'}
      </button>
    </div>
  );
};
