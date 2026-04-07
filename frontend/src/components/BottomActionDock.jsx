import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Circle, Compass, ThumbsUp, Settings } from 'lucide-react';

export default function BottomActionDock() {
  const actions = [
    { name: 'Invite', icon: <UserPlus className="h-[18px] w-[18px]" strokeWidth={2.5} /> },
    { name: 'Record', icon: <Circle className="h-[18px] w-[18px] fill-current" strokeWidth={2.5} />, activeColor: 'text-red-500' },
    { name: 'Explore', icon: <Compass className="h-[18px] w-[18px]" strokeWidth={2.5} />, active: true },
    { name: 'React', icon: <ThumbsUp className="h-[18px] w-[18px]" strokeWidth={2.5} /> },
    { name: 'Settings', icon: <Settings className="h-[18px] w-[18px]" strokeWidth={2.5} /> },
  ];

  return (
    <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-[2rem] border border-white/60 bg-white/[0.82] p-3 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur-3xl animate-fade-in dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_24px_60px_-24px_rgba(2,6,23,0.85)]">
      {actions.map((action, i) => (
        <Tooltip key={i} delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant={action.active ? 'secondary' : 'ghost'}
              className={`group h-12 rounded-full px-6 font-semibold transition-all duration-300 hover:-translate-y-1 ${
                action.active
                  ? 'border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm hover:bg-indigo-100/60 dark:border-indigo-400/[0.14] dark:bg-indigo-500/[0.14] dark:text-indigo-100 dark:hover:bg-indigo-500/20'
                  : 'border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-white/6 dark:hover:text-white'
              }`}
            >
              <span className={`mr-2 text-lg transition-transform group-hover:scale-110 ${action.activeColor || ''}`}>
                {action.icon}
              </span>
              <span className="tracking-wide">{action.name}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={12} className="border-slate-800 bg-slate-900 text-white shadow-xl font-medium tracking-wide">
            <p>{action.name} Window</p>
          </TooltipContent>
        </Tooltip>
      ))}

      <div className="mx-1 h-8 w-px bg-slate-200 dark:bg-white/10" />

      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button variant="default" className="h-12 rounded-full border-0 px-6 vibrant-gradient shadow-[0_8px_20px_rgba(168,85,247,0.3)] transition-all hover:shadow-[0_12px_25px_rgba(168,85,247,0.4)] cursor-default focus-visible:ring-0 select-none">
            <Badge variant="secondary" className="mr-1.5 rounded-md border-0 bg-black/20 font-mono tracking-widest text-white hover:bg-black/20">
              WASD
            </Badge>
            <span className="font-display text-sm font-extrabold tracking-wide text-white">To Move</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={12} className="border-slate-800 bg-slate-900 text-white tracking-wide">
          <p>Use your keyboard to explore the workspace</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
