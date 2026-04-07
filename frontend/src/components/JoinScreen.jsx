import { useState } from 'react';
import { useGameDispatch } from '../store/GameContext';
import { AVATAR_COLORS } from '../types/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../theme/ThemeProvider';

export default function JoinScreen() {
  const [username, setUsername] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useGameDispatch();
  const { isDark } = useTheme();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), avatarColor: selectedColor }),
      });

      if (!response.ok) throw new Error('Failed to join');
      const data = await response.json();
      dispatch({ type: 'SET_CURRENT_USER', payload: data });
    } catch (err) {
      setError('Could not join. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  const initials = (username.trim().slice(0, 2) || 'VC').toUpperCase();

  return (
    <div className="fixed inset-0 overflow-hidden font-sans">
      {/* Background layer */}
      <div className={`absolute inset-0 transition-colors duration-300 ${
        isDark
          ? 'bg-[#050a14]'
          : 'bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20'
      }`} />

      {/* Soft ambient orbs */}
      <div className={`absolute -left-20 top-[10%] h-[500px] w-[500px] rounded-full blur-[180px] ${
        isDark ? 'bg-indigo-600/12' : 'bg-indigo-200/60'
      }`} />
      <div className={`absolute -right-20 bottom-[5%] h-[400px] w-[400px] rounded-full blur-[160px] ${
        isDark ? 'bg-violet-500/10' : 'bg-pink-200/40'
      }`} />

      {/* Theme toggle */}
      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle compact />
      </div>

      {/* Centered login form — no card wrapper */}
      <div className="relative z-10 flex min-h-full items-center justify-center px-6">
        <div className="w-full max-w-sm animate-fade-in">
          <form onSubmit={handleJoin}>

            {/* Logo + heading */}
            <div className="mb-10 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl vibrant-gradient shadow-lg shadow-indigo-500/25">
                <Sparkles className="h-6 w-6 text-white" strokeWidth={2.4} />
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Virtual Cosmos
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Enter the spatial workspace
              </p>
            </div>

            {/* Display name */}
            <div className="space-y-2">
              <label
                htmlFor="join-username"
                className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400"
              >
                Display name
              </label>
              <Input
                id="join-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="What should we call you?"
                maxLength={20}
                autoFocus
                className={`h-12 rounded-xl border px-4 text-sm font-medium transition-colors ${
                  isDark
                    ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-indigo-400'
                    : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-400'
                }`}
              />
            </div>

            {/* Avatar color */}
            <div className="mt-6 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Pick your color
              </label>
              <div className="flex flex-wrap gap-2.5">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Select ${color}`}
                    className={`h-9 w-9 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                      selectedColor === color
                        ? 'scale-110 border-white shadow-lg ring-2 ring-indigo-400/60 dark:ring-indigo-300/50'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview strip */}
            <div className={`mt-6 flex items-center gap-3 rounded-xl px-3 py-2.5 ${
              isDark ? 'bg-white/[0.04]' : 'bg-slate-50'
            }`}>
              <Avatar
                className="h-8 w-8 rounded-full shadow-sm"
                style={{ background: selectedColor }}
              >
                <AvatarFallback className="bg-transparent text-[10px] font-bold uppercase text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                {username.trim() || 'Your display name'}
              </span>
              <Badge className="ml-auto shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Ready
              </Badge>
            </div>

            {/* Error */}
            {error && (
              <Alert
                variant="destructive"
                className="mt-4 rounded-xl border-red-500/20 bg-red-500/8"
              >
                <AlertDescription className="text-sm font-medium text-red-600 dark:text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="group mt-8 h-12 w-full rounded-xl vibrant-gradient text-sm font-display font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 active:translate-y-0 disabled:opacity-60"
            >
              {isLoading ? 'Connecting…' : 'Enter Workspace'}
              {!isLoading && (
                <ArrowRight
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                  strokeWidth={2.5}
                />
              )}
            </Button>

            <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
              No account needed — just pick a name and go
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
