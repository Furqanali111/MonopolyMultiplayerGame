import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login } from '@/services/socket';
import { Shell } from '@/components/screens/Shell';

interface LoginScreenProps {
  onLoginSuccess: (userId: string, username: string) => void;
  onBack: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onBack }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (username.length < 3) return setError('Use at least 3 characters.');
    if (username.length > 15) return setError('Use 15 characters or fewer.');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return setError('Letters, numbers and underscores only.');

    setIsLoading(true);
    setError(null);
    try {
      const response = await login(username);
      if (response.success && response.userId && response.username) {
        onLoginSuccess(response.userId, response.username);
      } else {
        setError(response.error || 'Could not sign you in. Try again.');
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Shell onBack={onBack} width="form">
      <h1 className="font-display text-4xl leading-tight">Pick your name</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Guests only. No account needed.</p>

      <form onSubmit={handleLogin} className="mt-8 space-y-4" noValidate>
        <div className="space-y-2">
          <label htmlFor="username" className="flex items-baseline justify-between text-[14px] font-medium">
            Name
            <span className="text-[12px] font-normal tabular-nums text-muted-foreground">{username.length}/15</span>
          </label>
          <Input
            id="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            disabled={isLoading}
            autoFocus
            autoComplete="nickname"
            maxLength={20}
            placeholder="e.g. Riley"
            aria-invalid={!!error}
            aria-describedby={error ? 'name-error' : undefined}
            className="h-12 text-[17px]"
          />
          {error && (
            <p id="name-error" role="alert" className="text-[13px] text-ruby-text">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isLoading || username.length < 3}>
          {isLoading ? <Loader2 className="animate-spin" /> : 'Continue to lobby'}
        </Button>
      </form>
    </Shell>
  );
};
