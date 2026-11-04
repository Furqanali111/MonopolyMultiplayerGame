import React, { useState } from 'react';
import { AIDifficulty, DEFAULT_RULES, HouseRules } from '@/game/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Segmented, Shell } from '@/components/screens/Shell';
import { cn } from '@/lib/utils';

interface SetupScreenProps {
  onStartGame: (aiCount: number, difficulty: AIDifficulty, rules: HouseRules) => void;
  onBack: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStartGame, onBack }) => {
  const [aiCount, setAiCount] = useState(2);
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [startingMoney, setStartingMoney] = useState(DEFAULT_RULES.startingMoney);
  const [pot, setPot] = useState(DEFAULT_RULES.freeParkingPot);

  return (
    <Shell onBack={onBack} width="form">
      <h1 className="text-3xl font-semibold leading-tight">Game setup</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">You play against the computer, on this device.</p>

      <div className="mt-8 space-y-7">
        <Field label="Opponents" hint={`${aiCount + 1} players at the table`}>
          <Segmented<number>
            label="Number of opponents"
            value={aiCount}
            onChange={setAiCount}
            options={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))}
          />
        </Field>

        <Field label="Difficulty">
          <Segmented<AIDifficulty>
            label="Opponent difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { value: 'easy' as AIDifficulty, label: 'Easy', sub: 'Plays on instinct' },
              { value: 'medium' as AIDifficulty, label: 'Medium', sub: 'Plays to a plan' },
            ]}
          />
        </Field>

        <Field label="House rules">
          <div className="space-y-3 rounded-[6px] border border-border p-3">
            <label className="flex items-center justify-between gap-3 text-[14px]">
              Starting cash
              <Input
                type="number"
                inputMode="numeric"
                min={500}
                max={10000}
                step={100}
                value={startingMoney}
                onChange={(e) => setStartingMoney(Math.min(10000, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                onBlur={() => setStartingMoney((m) => Math.max(500, m))}
                className="h-10 w-28 text-right"
              />
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-[14px]">
              <input type="checkbox" checked={pot} onChange={(e) => setPot(e.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(var(--gold))]" />
              <span>
                Free Parking pot
                <span className={cn('block text-[12px] text-muted-foreground')}>Taxes go to the middle. Whoever lands on Free Parking collects them.</span>
              </span>
            </label>
          </div>
        </Field>

        <Button size="lg" className="w-full" onClick={() => onStartGame(aiCount, difficulty, { startingMoney: Math.max(500, startingMoney), freeParkingPot: pot })}>
          Start game
        </Button>
      </div>
    </Shell>
  );
};
