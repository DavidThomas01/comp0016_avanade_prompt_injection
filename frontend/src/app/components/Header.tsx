import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Sparkles } from 'lucide-react';

type NavItem = {
  to: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

export function Header() {
  const location = useLocation();

  const items: NavItem[] = [
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

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/60 transition-colors focus-ring"
        >
          <div className="h-9 w-9 rounded-xl glass flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-orange-600" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">
              <span className="gradient-text">Prompt Injection Protection</span>
            </div>
            <div className="text-[11px] text-gray-500 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Learn vulnerabilities & defenses
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 rounded-full glass px-1 py-1">
          {items.map((item) => {
            const active = item.isActive(location.pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 sm:px-4 py-2 rounded-full text-sm transition-all focus-ring ${
                  active
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-white/70'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}