import { AlertTriangle, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { vulnerabilities } from '../data/vulnerabilities';

export function HomePage() {
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
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Vulnerability Catalogue</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Click a vulnerability to see a detailed breakdown and recommended mitigations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vulnerabilities.map((vuln) => (
              <Link
                key={vuln.id}
                to={`/vulnerability/${vuln.id}`}
                className="glass rounded-2xl p-5 border border-white/60 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-md hover:-translate-y-0.5 transition-all group focus-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{vuln.name}</div>
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

                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
