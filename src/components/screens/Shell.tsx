import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRODUCT_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

interface ShellProps {
  children: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
  className?: string;
  /** Narrow centred column (forms) or full width (lobby, results) */
  width?: 'form' | 'wide';
}

/** The frame every pre-game screen sits in: back control, wordmark, content. */
export const Shell: React.FC<ShellProps> = ({ children, onBack, backLabel = 'Back', right, className, width = 'wide' }) => (
  <div className="flex min-h-dvh flex-col bg-background">
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground">
            <ArrowLeft /> {backLabel}
          </Button>
        )}
        <span className="font-display text-lg leading-none text-gold">{PRODUCT_NAME}</span>
        <div className="ml-auto">{right}</div>
      </div>
    </header>
    <main className={cn('mx-auto w-full flex-1 px-4 py-8 md:py-12', width === 'form' ? 'max-w-md' : 'max-w-6xl', className)}>{children}</main>
  </div>
);

/** A label + control pair used across forms. */
export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="space-y-2">
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[14px] font-medium">{label}</span>
      {hint && <span className="text-[12px] text-muted-foreground">{hint}</span>}
    </div>
    {children}
  </div>
);

/** A segmented choice: a row of mutually exclusive buttons. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; sub?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex min-h-12 flex-col items-center justify-center rounded-[6px] border px-3 py-2 text-[14px] font-medium transition-colors',
            o.value === value ? 'border-gold bg-gold/10 text-foreground' : 'border-border text-muted-foreground hover:border-gold/40 hover:text-foreground'
          )}
        >
          {o.label}
          {o.sub && <span className="text-[11px] font-normal text-muted-foreground">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}
