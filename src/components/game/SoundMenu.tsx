import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Bus, getVolume, isMuted, play, setMuted, setVolume } from '@/services/sound';

const ROWS: { bus: Bus; label: string }[] = [
  { bus: 'music', label: 'Music' },
  { bus: 'sfx', label: 'Effects' },
];

/** Header button that opens the sound mixer: one mute switch and a slider per bus. */
export const SoundMenu: React.FC<{ className?: string }> = ({ className }) => {
  const [muted, setMutedState] = useState(isMuted());
  const [levels, setLevels] = useState({ music: getVolume('music'), sfx: getVolume('sfx') });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label="Sound settings">
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="sound-on" className="text-[13px] font-medium">
            Sound
          </label>
          <Switch
            id="sound-on"
            checked={!muted}
            onCheckedChange={(on) => {
              setMuted(!on);
              setMutedState(!on);
            }}
          />
        </div>
        {ROWS.map(({ bus, label }) => (
          <div key={bus} className="space-y-2">
            <div className="flex justify-between text-[12px] text-muted-foreground">
              <span id={`vol-${bus}`}>{label}</span>
              <span className="tabular-nums">{Math.round(levels[bus] * 100)}%</span>
            </div>
            <Slider
              aria-labelledby={`vol-${bus}`}
              disabled={muted}
              min={0}
              max={1}
              step={0.05}
              value={[levels[bus]]}
              onValueChange={([v]) => {
                setVolume(bus, v);
                setLevels((l) => ({ ...l, [bus]: v }));
              }}
              // Let people hear the effects level they just picked
              onValueCommit={() => bus === 'sfx' && play('coinIn')}
            />
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};
