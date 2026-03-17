import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronRight, Code2, Copy, Download, ShieldCheck } from 'lucide-react';

import { mitigations, type CodeLanguage } from '../data/mitigations';
import { Button } from '../components/ui/button';
import { exportMitigationPdf } from '../lib/pdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

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
    if (!selected?.codeBased) return '';
    const impls = selected.implementations ?? {};
    return impls[lang] ?? impls.pseudo ?? '';
  }, [selected, lang]);

  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!codeToShow) return;
    try {
      if (canCopy) {
        await navigator.clipboard.writeText(codeToShow);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // ignore
    }
  };

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportLangs, setExportLangs] = useState<CodeLanguage[]>([]);
  const [exportingPdf, setExportingPdf] = useState(false);

  const availableImplLangs = useMemo(() => {
    if (!selected?.codeBased) return [];
    return (Object.keys(selected.implementations) as CodeLanguage[]).filter(
      (l) => !!selected.implementations[l],
    );
  }, [selected]);

  const allSelected = availableImplLangs.length > 0 && availableImplLangs.every((l) => exportLangs.includes(l));

  const toggleExportLang = (l: CodeLanguage) => {
    setExportLangs((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  };

  const toggleAll = () => {
    setExportLangs(allSelected ? [] : [...availableImplLangs]);
  };

  const openExportDialog = () => {
    setExportLangs(selected?.codeBased ? [...availableImplLangs] : []);
    setExportDialogOpen(true);
  };

  const handleExportPdf = async () => {
    if (!selected) return;
    setExportingPdf(true);
    try {
      const langs = selected.codeBased && exportLangs.length > 0 ? exportLangs : undefined;
      await exportMitigationPdf(selected, langs);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExportingPdf(false);
      setExportDialogOpen(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumbs + Export */}
        <div className="flex items-center justify-between mb-6">
          <nav className="flex items-center space-x-2 text-sm">
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
          {selected && (
            <Button variant="outline" size="sm" onClick={openExportDialog}>
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          )}
        </div>

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
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${
                          m.codeBased
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                            : 'bg-gray-900/5 dark:bg-white/5 text-muted-foreground border-gray-900/10 dark:border-white/10'
                        }`}
                        title={m.codeBased ? 'Code-based' : 'Not code-based'}
                      >
                        {m.codeBased ? 'CODE' : 'NON-CODE'}
                      </span>
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
                  <span
                    className={`shrink-0 whitespace-nowrap text-xs font-semibold px-3 py-1 rounded-full border ${
                      selected.codeBased
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                        : 'bg-gray-900/5 dark:bg-white/5 text-muted-foreground border-gray-900/10 dark:border-white/10'
                    }`}
                  >
                    {selected.codeBased ? 'Code-based' : 'Non code-based'}
                  </span>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="font-medium mb-2">What it does</h3>
                    <div className="space-y-2">
                      {selected.details.map((p, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Strategy</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selected.strategy}</p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Typical flow</h3>
                    <ol className="list-decimal ml-5 space-y-1">
                      {selected.defenseFlow.map((step, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <h3 className="font-medium flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        Implementation
                      </h3>

                      {selected.codeBased ? (
                        <Select
                          value={lang}
                          onValueChange={(v) => setLang(v as CodeLanguage)}
                        >
                          <SelectTrigger
                            size="sm"
                            className="w-auto min-w-[128px] bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 shrink-0"
                            aria-label="Select implementation language"
                          >
                            <SelectValue placeholder="Select language">
                              {LANG_OPTIONS.find(opt => opt.value === lang)?.label ?? 'Select language'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {LANG_OPTIONS.filter(opt => availableImplLangs.includes(opt.value)).map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                    </div>

                    {selected.codeBased ? (
                      codeToShow ? (
                        <div className="relative group">
                          <pre className="bg-gray-950 text-emerald-100 p-5 pr-12 rounded-2xl text-xs whitespace-pre-wrap break-words overflow-auto border border-white/10">
                            <code>{codeToShow}</code>
                          </pre>
                          <button
                            type="button"
                            onClick={onCopy}
                            disabled={!canCopy}
                            title={copied ? 'Copied!' : canCopy ? 'Copy to clipboard' : 'Clipboard not available'}
                            aria-label={copied ? 'Copied' : 'Copy code'}
                            className="absolute top-3 right-3 flex items-center justify-center h-8 w-8 rounded-lg text-emerald-100/70 hover:text-emerald-100 hover:bg-white/10 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No snippet available for this language yet. Try another language.
                        </p>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        This mitigation is primarily model/training/process-level. The app can reference it, but it is not
                        typically implemented as a single runtime code module.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass rounded-3xl border border-white/60 dark:border-white/10 p-6">
                <h2 className="text-xl font-semibold mb-2">Mitigation not found</h2>
                <p className="text-sm text-muted-foreground">Select a mitigation from the list to view its details.</p>
              </div>
            )}
          </div>
        </div>

        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Export Mitigation PDF</DialogTitle>
              <DialogDescription>
                {selected?.codeBased
                  ? 'Choose which implementation languages to include in the exported report.'
                  : 'This mitigation has no code implementations. The report will include all other sections.'}
              </DialogDescription>
            </DialogHeader>

            {selected?.codeBased && availableImplLangs.length > 0 && (
              <div className="space-y-3 py-2">
                <label className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition-colors">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded accent-orange-600"
                  />
                  <span className="text-sm font-medium">All Languages</span>
                </label>
                <div className="border-t border-border" />
                {LANG_OPTIONS.filter((opt) => availableImplLangs.includes(opt.value)).map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={exportLangs.includes(opt.value)}
                      onChange={() => toggleExportLang(opt.value)}
                      className="h-4 w-4 rounded accent-orange-600"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExportPdf}
                disabled={exportingPdf || (selected?.codeBased === true && exportLangs.length === 0)}
                className="bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {exportingPdf ? 'Generating...' : 'Export'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}