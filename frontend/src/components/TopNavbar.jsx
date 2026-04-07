import { useGameState, useGameDispatch } from '../store/GameContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { getCurrentStompSessionId } from '../websocket/stompClient';

export default function TopNavbar() {
  const { players, isConnected, currentUser } = useGameState();
  const dispatch = useGameDispatch();

  const handleLeave = async () => {
    try {
      if (currentUser?.userId) {
        const sessionId = getCurrentStompSessionId();
        const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
        await fetch(`/api/users/leave/${currentUser.userId}${query}`, { method: 'DELETE' });
      }
    } catch (err) {
      console.error('Leave request failed', err);
    } finally {
      dispatch({ type: 'RESET' });
    }
  };

  return (
    <div className="z-20 flex h-[76px] shrink-0 items-center justify-between gap-4 px-5 py-3 panel-surface dark:border-white/[0.08] dark:bg-slate-950/55">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9 rounded-xl vibrant-gradient shadow-lg shadow-indigo-500/20">
          <AvatarFallback className="bg-transparent">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[22px] font-extrabold tracking-[-0.04em] text-slate-900 dark:text-white">
              Virtual Cosmos
            </h1>
            <Badge variant="secondary" className="rounded-md border-0 bg-slate-900/6 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-700 dark:bg-white/10 dark:text-slate-200">
              Beta
            </Badge>
          </div>
          <p className="hidden text-[12px] font-medium text-slate-500 dark:text-slate-400 md:block">
            Spatial workspace with proximity messaging
          </p>
        </div>
      </div>

      <div className="hidden flex-col items-center lg:flex">
        <span className="text-kicker">World Workspace</span>
        <span className="mt-1 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
          Move, meet, and message nearby teammates
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="flex items-center gap-2.5 rounded-2xl border-slate-200/70 bg-white/75 px-4 py-2 text-slate-700 shadow-sm uppercase tracking-[0.16em] font-bold dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100">
          <div className="relative flex items-center justify-center">
            <div className={`z-10 h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            {isConnected && <div className="absolute h-2.5 w-2.5 rounded-full bg-green-400 opacity-75 animate-ping" />}
          </div>
          {isConnected ? 'Connected' : 'Offline'}
        </Badge>

        <Badge variant="outline" className="flex items-center gap-2.5 rounded-2xl border-indigo-200/60 bg-indigo-500/[0.08] px-4 py-2 text-sm font-mono font-bold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/[0.12] dark:text-indigo-200">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          {players.length}
        </Badge>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLeave}
          className="gap-1.5 rounded-2xl border-red-200/60 bg-red-500/[0.06] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-red-600 shadow-sm transition-all hover:bg-red-500/15 hover:text-red-700 dark:border-red-400/15 dark:bg-red-500/[0.08] dark:text-red-400 dark:hover:bg-red-500/20 dark:hover:text-red-300"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={2.5} />
          Leave
        </Button>

        <ThemeToggle compact />
      </div>
    </div>
  );
}
