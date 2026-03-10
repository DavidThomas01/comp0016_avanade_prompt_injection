import { useMemo, useState } from 'react';
import { AlertTriangle, Sparkles, ArrowRight, Shield, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { vulnerabilities } from '../data/vulnerabilities';

const IMPACT_FILTERS = ['all', 'high', 'medium', 'low'] as const;
type ImpactFilter = (typeof IMPACT_FILTERS)[number];

const IMPACT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  high:   { bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-500/20' },
  medium: { bg: 'bg-yellow-500/10 dark:bg-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-500/20' },
  low:    { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20' },
};

export function HomePage() {
  const [query, setQuery] = useState('');
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return vulnerabilities.filter((vuln) => {
      if (impactFilter !== 'all' && vuln.impactLevel !== impactFilter) return false;
      if (!q) return true;
      return (
        vuln.name.toLowerCase().includes(q) ||
        vuln.description.toLowerCase().includes(q) ||
        vuln.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [query, impactFilter]);

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="glass-strong rounded-3xl p-7 sm:p-10 border border-white/60 dark:border-white/10 shadow-sm mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                Practical prompt-injection security
              </div>

              <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
                <span className="gradient-text">Understand</span> Prompt Injection
              </h1>

              <p className="mt-3 text-muted-foreground leading-relaxed">
                Prompt injection is a critical security vulnerability in AI systems where malicious users craft inputs
                designed to manipulate the model&apos;s behavior, bypass safety measures, or extract sensitive information.
              </p>

              <p className="mt-3 text-muted-foreground leading-relaxed">
                Explore the vulnerability catalogue below to learn attack vectors and the mitigation strategies that
                reduce risk in real systems.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/testing"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-600 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all focus-ring"
                >
                  Try Testing
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/mitigations"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/80 dark:hover:bg-white/10 transition-all focus-ring"
                >
                  Browse Mitigations
                  <ArrowRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              <div className="glass rounded-2xl p-4">
                <div className="h-9 w-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center mb-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-sm font-semibold">Attack catalogue</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Realistic examples and failure modes.
                </div>
              </div>
              <div className="glass rounded-2xl p-4">
                <div className="h-9 w-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center mb-3">
                  <Shield className="h-5 w-5 text-orange-700 dark:text-orange-400" />
                </div>
                <div className="text-sm font-semibold">Defense stack</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Practical mitigations and guardrails.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Catalogue */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-semibold">Vulnerability Catalogue</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Click a vulnerability to see a detailed breakdown and recommended mitigations.
              </p>
            </div>
          </div>

          {/* Search + filter row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vulnerabilities..."
                className="w-full pl-9 pr-9 py-2 rounded-xl glass border border-white/60 dark:border-white/10 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-xl glass px-1 py-1">
              {IMPACT_FILTERS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setImpactFilter(level)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    impactFilter === level
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">No vulnerabilities match your search.</p>
              <button
                type="button"
                onClick={() => { setQuery(''); setImpactFilter('all'); }}
                className="mt-3 text-xs text-orange-600 dark:text-orange-400 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            >
              {filtered.map((vuln) => {
                const impact = IMPACT_COLORS[vuln.impactLevel];
                return (
                  <motion.div
                    key={vuln.id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <Link
                      to={`/vulnerability/${vuln.id}`}
                      className="block h-full glass rounded-2xl p-5 border border-white/60 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-md hover:-translate-y-0.5 transition-all group focus-ring"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
                              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{vuln.name}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${impact.bg} ${impact.text} ${impact.border} uppercase`}>
                                {vuln.impactLevel}
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                            {vuln.description}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {vuln.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[11px] px-2 py-1 rounded-full bg-gray-900/5 dark:bg-white/5 text-muted-foreground border border-gray-900/10 dark:border-white/10"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors mt-1 shrink-0" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
