import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Code2, Copy, ShieldCheck } from 'lucide-react';

import { mitigations } from '../data/mitigations';

type CodeLanguage = 'pseudo' | 'python' | 'java';

const LANG_OPTIONS: Array<{ value: CodeLanguage; label: string }> = [
  { value: 'pseudo', label: 'Pseudo-code' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
];

function isValidLang(x: string | null): x is CodeLanguage {
  return x === 'pseudo' || x === 'python' || x === 'java';
}

export function MitigationsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const selected = useMemo(() => {
    if (!id) return mitigations[0] ?? null;
    return mitigations.find(m => m.id === id) ?? null;
  }, [id]);

  const selectedId = selected?.id ?? null;

  const [lang, setLang] = useState<CodeLanguage>(() => {
    try {
      const saved = localStorage.getItem('mitigation_code_lang');
      return isValidLang(saved) ? saved : 'pseudo';
    } catch {
      return 'pseudo';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mitigation_code_lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const codeToShow = useMemo(() => {
    return selected?.implementation ?? '';
  }, [selected]);

  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;

  const onCopy = async () => {
    if (!codeToShow) return;
    try {
      if (canCopy) await navigator.clipboard.writeText(codeToShow);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm mb-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors focus-ring">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground font-medium">Mitigations</span>
          {selected ? (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{selected.name}</span>
            </>
          ) : null}
        </nav>

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            Defense techniques & implementations
          </div>
          <h1 className="mt-3 text-3xl font-semibold">
            <span className="gradient-text">Mitigations</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Browse mitigation techniques and view reference implementations in different languages.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: list */}
          <div className="glass-strong rounded-3xl border border-white/60 dark:border-white/10">
            <div className="px-5 pt-5 pb-4 border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 rounded-t-3xl">
              <div className="font-semibold">All Mitigations</div>
              <div className="text-xs text-muted-foreground mt-1">Click one to view details</div>
            </div>

            <div className="p-4">
              {mitigations.map(m => {
                const active = m.id === selectedId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => navigate(`/mitigations/${m.id}`)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all mb-3 focus-ring ${
                      active
                        ? 'border-orange-500/40 bg-orange-500/10 dark:bg-orange-500/15'
                        : 'border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground">{m.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {m.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: details */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="glass-strong rounded-3xl border border-white/60 dark:border-white/10 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold text-foreground">{selected.name}</h2>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{selected.description}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="font-medium mb-2">Strategy</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selected.strategy}</p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Typical flow</h3>
                    <ol className="list-decimal ml-5 space-y-1">
                      {selected.defenseFlow.map((step: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-medium flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        Implementation
                      </h3>

                      {selected.implementation && (
                        <button
                          type="button"
                          onClick={onCopy}
                          disabled={!codeToShow || !canCopy}
                          className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full border transition-all focus-ring ${
                            !codeToShow || !canCopy
                              ? 'text-muted-foreground border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 cursor-not-allowed'
                              : 'text-foreground border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                          }`}
                          title={canCopy ? 'Copy to clipboard' : 'Clipboard not available'}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </button>
                      )}
                    </div>

                    {codeToShow ? (
                      <pre className="bg-gray-950 text-emerald-100 p-5 rounded-2xl text-xs whitespace-pre-wrap break-words overflow-auto border border-white/10">
                        <code>{codeToShow}</code>
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No implementation example available yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-strong rounded-3xl border border-white/60 dark:border-white/10 p-8 flex items-center justify-center min-h-96">
                <p className="text-muted-foreground">Select a mitigation to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
