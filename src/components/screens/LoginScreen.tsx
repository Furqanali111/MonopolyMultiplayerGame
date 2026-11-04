import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, User, ChevronRight } from 'lucide-react';
import { login } from '@/services/socket';

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

        // Basic validation
        if (username.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }
        if (username.length > 15) {
            setError('Username must be 15 characters or less');
            return;
        }
        const alphanumeric = /^[a-zA-Z0-9_]+$/;
        if (!alphanumeric.test(username)) {
            setError('Username can only contain letters, numbers, and underscores');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await login(username);
            if (response.success && response.userId && response.username) {
                onLoginSuccess(response.userId, response.username);
            } else {
                setError(response.error || 'Failed to login');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-background/50 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

            {/* Back button */}
            <button
                onClick={onBack}
                className="absolute top-8 left-8 p-2 rounded-full hover:bg-white/5 transition-colors group"
            >
                <ArrowLeft className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            <div className="max-w-md w-full animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-block p-3 rounded-2xl bg-primary/10 mb-4 animate-bounce-in">
                        <User className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-3xl font-display gold-text mb-2">Identify Yourself</h2>
                    <p className="text-muted-foreground">Choose a name to represent you in the digital arena</p>
                </div>

                <form onSubmit={handleLogin} className="glass-card p-8 space-y-6 border border-white/10 shadow-2xl">
                    <div className="space-y-2">
                        <label htmlFor="username" className="text-sm font-medium text-muted-foreground ml-1">
                            Guest Username
                        </label>
                        <div className="relative">
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter your name..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                                className="bg-background/50 border-input pl-4 pr-10 py-6 text-lg focus:ring-primary h-14"
                                autoFocus
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/30">
                                {username.length}/15
                            </div>
                        </div>
                        {error && (
                            <p className="text-sm text-destructive mt-2 animate-shake ml-1">
                                {error}
                            </p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading || username.length < 3}
                        className="w-full py-6 text-lg font-bold btn-monopoly flex items-center justify-center gap-2 group h-14"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Continue to Lobby
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground opacity-60">
                        By continuing, you'll join the global servers as a guest.
                        No data is stored after your session ends.
                    </p>
                </form>
            </div>
        </div>
    );
};
