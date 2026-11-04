import React, { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import type { ChatMessage } from '@/services/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  messages: ChatMessage[];
  selfId?: string;
  onSend: (text: string) => void;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, selfId, onSend, className }) => {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    onSend(clean);
    setText('');
  };

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2 text-[13px] leading-snug" aria-live="polite" aria-label="Chat">
        {messages.length === 0 && <li className="text-muted-foreground">No messages yet. Say something to the table.</li>}
        {messages.map((m) => (
          <li key={`${m.at}-${m.from}`}>
            <span className={cn('font-semibold', 'text-foreground')}>{m.username}</span>{' '}
            <span className="break-words text-foreground/90">{m.text}</span>
          </li>
        ))}
        <li ref={endRef} aria-hidden />
      </ul>
      <form onSubmit={submit} className="flex gap-2 border-t border-border pt-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder="Message the table"
          aria-label="Message"
          className="h-10"
        />
        <Button type="submit" variant="secondary" size="icon" aria-label="Send message" disabled={!text.trim()}>
          <SendHorizontal />
        </Button>
      </form>
    </div>
  );
};
