import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ThemeToggle({ variant = 'dropdown' }: { variant?: 'dropdown' | 'sidebar' | 'profile' }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="w-9 h-9 rounded-lg border border-border bg-background">
        <Sun className="w-4 h-4 opacity-0" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  if (variant === 'sidebar') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className="truncate">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-mono text-xs">
          Switch to {isDark ? 'Light' : 'Dark'} Mode
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'profile') {
    const options = [
      {
        id: 'light',
        name: 'Light Mode',
        desc: 'Clean executive layout with high contrast readability',
        icon: Sun,
        borderColor: 'border-slate-300',
        bgColor: 'bg-amber-500/10'
      },
      {
        id: 'dark',
        name: 'Dark Mode',
        desc: 'Futuristic deep slate interface with vibrant accents',
        icon: Moon,
        borderColor: 'border-slate-700',
        bgColor: 'bg-indigo-500/10'
      },
      {
        id: 'system',
        name: 'System Preference',
        desc: 'Automatically matches your device operating system',
        icon: Laptop,
        borderColor: 'border-border',
        bgColor: 'bg-emerald-500/10'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`relative p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                active
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                  : 'border-border bg-secondary/30 hover:bg-secondary/60'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg border ${opt.borderColor} ${opt.bgColor}`}>
                    <Icon className={`w-4 h-4 ${opt.id === 'light' ? 'text-amber-500' : opt.id === 'dark' ? 'text-indigo-400' : 'text-primary'}`} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{opt.name}</span>
                </div>
                {active && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          );
        })}
      </div>
    );
  }

  // Header Dropdown Trigger Default
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="w-9 h-9 rounded-lg border border-border bg-background hover:bg-secondary/80 transition-all shrink-0"
          aria-label="Select theme"
        >
          {isDark ? (
            <Moon className="w-4 h-4 text-indigo-400 transition-all" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500 transition-all" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 font-sans">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="flex items-center justify-between text-xs cursor-pointer font-medium"
        >
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Light</span>
          </div>
          {theme === 'light' && <Check className="w-3.5 h-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="flex items-center justify-between text-xs cursor-pointer font-medium"
        >
          <div className="flex items-center gap-2">
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dark</span>
          </div>
          {theme === 'dark' && <Check className="w-3.5 h-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="flex items-center justify-between text-xs cursor-pointer font-medium"
        >
          <div className="flex items-center gap-2">
            <Laptop className="w-3.5 h-3.5 text-muted-foreground" />
            <span>System</span>
          </div>
          {theme === 'system' && <Check className="w-3.5 h-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
