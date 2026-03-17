import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { useIsMobile } from './ui/use-mobile';

type NavItem = {
  to: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    isActive: (p) => p === '/' || p.startsWith('/vulnerability/'),
  },
  {
    to: '/testing',
    label: 'Testing',
    isActive: (p) => p.startsWith('/testing'),
  },
  {
    to: '/mitigations',
    label: 'Mitigations',
    isActive: (p) => p === '/mitigations' || p.startsWith('/mitigations/'),
  },
  {
    to: '/prompt-enhancer',
    label: 'Prompt Enhancer',
    isActive: (p) => p.startsWith('/prompt-enhancer'),
  },
];

export function Header() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 dark:border-white/10 bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-white/60 dark:hover:bg-white/10 transition-colors focus-ring"
        >
          <div className="min-h-9 rounded-xl glass flex flex-col items-center justify-start px-2 pb-1">
            <img
              src="/logo_avanade_long.webp"
              alt="Avanade partner"
              className="h-8 w-auto object-contain select-none"
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">
              <span className="gradient-text">Prompt Injection Protection</span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Learn vulnerabilities & defenses
            </div>
          </div>
        </Link>

        {isMobile ? (
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex items-center justify-center h-9 w-9 rounded-xl glass hover:bg-white/80 dark:hover:bg-white/10 transition-colors focus-ring"
              >
                <Menu className="h-5 w-5 text-foreground" />
              </button>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-2 mt-2">
                  {NAV_ITEMS.map((item) => {
                    const active = item.isActive(location.pathname);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setSheetOpen(false)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all focus-ring ${
                          active
                            ? 'bg-orange-600 text-white shadow-sm'
                            : 'text-foreground hover:bg-white/60 dark:hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 rounded-full glass px-1 py-1">
              {NAV_ITEMS.map((item) => {
                const active = item.isActive(location.pathname);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 sm:px-4 py-2 rounded-full text-sm transition-all focus-ring ${
                      active
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <ThemeToggle />
          </div>
        )}
      </div>
    </header>
  );
}
