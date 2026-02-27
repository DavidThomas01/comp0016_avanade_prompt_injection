import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button className="h-9 w-9 rounded-full glass flex items-center justify-center" aria-label="Toggle theme">
        <span className="h-4 w-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  const toggle = () => {
    if (theme === 'system') {
      setTheme(isDark ? 'light' : 'dark');
    } else {
      setTheme(isDark ? 'light' : 'dark');
    }
  };

  return (
    <button
      onClick={toggle}
      className="relative h-9 w-9 rounded-full glass flex items-center justify-center
                 hover:bg-white/60 dark:hover:bg-white/10
                 transition-all duration-300 focus-ring cursor-pointer"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun
        className={`h-4 w-4 text-orange-500 absolute transition-all duration-500 ease-in-out
          ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`}
      />
      <Moon
        className={`h-4 w-4 text-orange-400 absolute transition-all duration-500 ease-in-out
          ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`}
      />
    </button>
  );
}
