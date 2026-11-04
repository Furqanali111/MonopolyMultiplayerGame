import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GameLogProps {
  logs: string[];
}

export const GameLog: React.FC<GameLogProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="space-y-0.5">
      {logs.map((log, index) => (
        <p 
          key={index} 
          className="text-[10px] md:text-xs text-muted-foreground leading-tight"
        >
          {log}
        </p>
      ))}
      <div ref={endRef} />
    </div>
  );
};
