import { MoonStar, SunMedium } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '../theme/ThemeProvider';

export default function ThemeToggle({ compact = false, className }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const Icon = isDark ? SunMedium : MoonStar;

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? 'icon' : 'sm'}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={cn(
        'rounded-full border-white/15 bg-white/60 text-slate-700 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.55)] backdrop-blur-xl hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900',
        compact ? 'size-11' : 'h-10 px-4',
        className,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={2.2} />
      {!compact && (
        <span className="ml-2 text-xs font-semibold uppercase tracking-[0.12em]">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </Button>
  );
}
