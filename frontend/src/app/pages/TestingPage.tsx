import { useEffect, useMemo, useState } from 'react';
import {
  Info,
  Plus,
  Play,
  Send,
  Trash2,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Sparkles,
  Folder,
  FlaskConical,
} from 'lucide-react';

import { mitigations } from '../data/mitigations';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

/**
 * Backend-driven types (match /api responses)
 */
type TestSuite = {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ModelConfig =
  | { mode: 'existing'; provider: string; modelId: string }
  | { mode: 'custom'; provider: string; apiKey: string };

type Test = {
  id: string;
  suiteId: string;
  name: string;
  prompt?: string;
  expectedBehavior?: string;
  requiredMitigations: string[];
  modelConfig?: ModelConfig;
  createdAt?: string;
  updatedAt?: string;
};

type Run = {
  id: string;
  testId: string;
  suiteId: string;
  promptUsed: string;
  activeMitigations: string[];
  modelResponse: string;
  passed: boolean;
  createdAt?: string;
};

/**
 * API base (Vite)
 * - add frontend/.env: VITE_API_BASE=http://localhost:8080/api
 */
const API_BASE: string =
  (import.meta as any)?.env?.VITE_API_BASE ?? 'http://localhost:8080/api';

const AI_MODELS = [
  { id: 'gpt-5', label: 'GPT-5' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'claude-3.5', label: 'Claude 3.5' },
  { id: 'gemini-1.5', label: 'Gemini 1.5' },
];

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

export function TestingPage() {
  /* ---------------- State ---------------- */

  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  const [expandedSuiteIds, setExpandedSuiteIds] = useState<Set<string>>(new Set());

  const [promptOverride, setPromptOverride] = useState('');
  const [runResult, setRunResult] = useState<Run | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* ---------------- Load from backend ---------------- */

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      const suitesData = await apiGet<TestSuite[]>('/suites');
      setSuites(suitesData);

      const testsPairs = await Promise.all(
        suitesData.map(async s => {
          const suiteTests = await apiGet<Test[]>(
            `/tests?suiteId=${encodeURIComponent(s.id)}`
          );
          return suiteTests;
        })
      );

      const flatTests = testsPairs.flat();
      setTests(flatTests);

      // Keep selection stable if possible
      setSelectedTest(prev => {
        if (!prev) return flatTests[0] ?? null;
        const stillThere = flatTests.find(t => t.id === prev.id);
        return stillThere ?? (flatTests[0] ?? null);
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll().catch(err => {
      console.error(err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Derived ---------------- */

  const suiteIdToTests = useMemo(() => {
    const map = new Map<string, Test[]>();
    for (const t of tests) {
      const arr = map.get(t.suiteId) ?? [];
      arr.push(t);
      map.set(t.suiteId, arr);
    }
    return map;
  }, [tests]);

  const selectedMitigationSet = useMemo(() => {
    return new Set(selectedTest?.requiredMitigations ?? []);
  }, [selectedTest]);

  const activeMitigationCount = selectedTest?.requiredMitigations?.length ?? 0;
  const totalMitigations = mitigations.length;
  const mitigationPct = totalMitigations > 0 ? Math.round((activeMitigationCount / totalMitigations) * 100) : 0;

  /* ---------------- Create Suite Modal ---------------- */

  const [isCreateSuiteOpen, setIsCreateSuiteOpen] = useState(false);
  const [newSuiteName, setNewSuiteName] = useState('');
  const [newSuiteDescription, setNewSuiteDescription] = useState('');

  const canCreateSuite = newSuiteName.trim().length > 0;

  const createSuite = async () => {
    if (!canCreateSuite) return;

    const created = await apiPost<TestSuite>('/suites', {
      name: newSuiteName.trim(),
      description: newSuiteDescription.trim() || undefined,
    });

    setSuites(prev => [...prev, created]);
    setExpandedSuiteIds(prev => new Set(prev).add(created.id));

    setIsCreateSuiteOpen(false);
    setNewSuiteName('');
    setNewSuiteDescription('');

    // also load tests for it (none) without refetching everything
    setTests(prev => prev);
  };

  /* ---------------- Add Test Modal ---------------- */

  type AddTestTab = 'existing' | 'custom';
  const [isAddTestOpen, setIsAddTestOpen] = useState(false);
  const [targetSuiteId, setTargetSuiteId] = useState<string | null>(null);

  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestMitigations, setNewTestMitigations] = useState<string[]>([]);
  const [addTestTab, setAddTestTab] = useState<AddTestTab>('existing');

  const [newTestModelId, setNewTestModelId] = useState(AI_MODELS[0]?.id ?? 'gpt-5');
  const [newTestApiKey, setNewTestApiKey] = useState('');

  const canCreateTest =
    !!targetSuiteId &&
    newTestTitle.trim().length > 0 &&
    (addTestTab === 'existing' || newTestApiKey.trim().length > 0);

  const openAddTestModal = (suiteId: string) => {
    setTargetSuiteId(suiteId);
    setIsAddTestOpen(true);

    setNewTestTitle('');
    setNewTestMitigations([]);
    setAddTestTab('existing');
    setNewTestModelId(AI_MODELS[0]?.id ?? 'gpt-5');
    setNewTestApiKey('');
  };

  const toggleNewTestMitigation = (id: string) => {
    setNewTestMitigations(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const createTestFromModal = async () => {
    if (!canCreateTest || !targetSuiteId) return;

    const modelConfig: ModelConfig =
      addTestTab === 'existing'
        ? { mode: 'existing', provider: 'openai', modelId: newTestModelId }
        : { mode: 'custom', provider: 'custom', apiKey: newTestApiKey.trim() };

    const created = await apiPost<Test>('/tests', {
      suiteId: targetSuiteId,
      name: newTestTitle.trim(),
      requiredMitigations: newTestMitigations, // can be []
      modelConfig,
    });

    setTests(prev => [...prev, created]);
    setSelectedTest(created);
    setRunResult(null);
    setPromptOverride('');

    setIsAddTestOpen(false);
    setTargetSuiteId(null);
  };

  /* ---------------- Run Current Test ---------------- */

  const runSelectedTest = async () => {
    if (!selectedTest) return;

    setIsLoading(true);
    try {
      const run = await apiPost<Run>('/runs', {
        testId: selectedTest.id,
        promptOverride: promptOverride.trim().length > 0 ? promptOverride.trim() : undefined,
        activeMitigations: selectedTest.requiredMitigations ?? [],
        modelConfigOverride: null,
      });

      setRunResult(run);
    } catch (e) {
      console.error(e);
      // keep UI simple for now; backend already returns JSON/text error
      alert('Run failed. Check backend logs / Network tab for details.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------- Save Current Test ---------------- */

  // Save Current Test persists a new test record to the backend.
  // Current behavior: it saves the prompt override (if provided) as the test prompt.
  const canSaveCurrentTest = !!selectedTest && promptOverride.trim().length > 0 && !isLoading;

  const saveCurrentTest = async () => {
    if (!selectedTest) return;

    const prompt = promptOverride.trim();
    if (prompt.length === 0) return;

    setIsLoading(true);
    try {
      const created = await apiPost<Test>('/tests', {
        suiteId: selectedTest.suiteId,
        name: selectedTest.name,
        prompt,
        requiredMitigations: selectedTest.requiredMitigations ?? [],
        modelConfig:
          selectedTest.modelConfig ?? { mode: 'existing', provider: 'openai', modelId: 'gpt-5' },
      });

      setTests(prev => [...prev, created]);
      setSelectedTest(created);
      setRunResult(null);
      setPromptOverride('');
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------- Delete Test ---------------- */
  const deleteTest = async (id: string) => {
    // Optimistic UI: remove locally first, then confirm with backend
    const prevTests = tests;
    setTests(prev => prev.filter(t => t.id !== id));
    setSelectedTest(prev => (prev?.id === id ? null : prev));

    try {
      await apiDelete(`/tests/${encodeURIComponent(id)}`);
    } catch (e) {
      // rollback
      setTests(prevTests);
      console.error(e);
      alert('Delete failed. The backend did not remove the test.');
      return;
    }

    // If we deleted the selected test, pick a sensible new selection
    setSelectedTest(prev => {
      if (prev && prev.id !== id) return prev;
      const remaining = prevTests.filter(t => t.id !== id);
      return remaining[0] ?? null;
    });
  };

  /* ---------------- Delete Suite ---------------- */
  const deleteSuite = async (suite: TestSuite) => {
    const ok = window.confirm(
      `Delete suite "${suite.name}"?\n\nThis will also delete all tests and runs inside it.`
    );
    if (!ok) return;

    // Optimistic UI: remove suite + its tests locally first, then confirm with backend.
    const prevSuites = suites;
    const prevTests = tests;
    const prevExpanded = expandedSuiteIds;

    const suiteId = suite.id;
    const remainingSuites = prevSuites.filter(s => s.id !== suiteId);
    const remainingTests = prevTests.filter(t => t.suiteId !== suiteId);

    setSuites(remainingSuites);
    setTests(remainingTests);

    // Remove from expanded set
    setExpandedSuiteIds(prev => {
      const next = new Set(prev);
      next.delete(suiteId);
      return next;
    });

    // Clear selection if it belonged to that suite
    setSelectedTest(prev => {
      if (!prev) return prev;
      return prev.suiteId === suiteId ? null : prev;
    });

    // Clear run/prompt if selection got cleared
    setRunResult(prev => {
      // If we cleared selected test (suite deleted), run result is irrelevant
      // but we can't read selectedTest synchronously; safe to clear always.
      return null;
    });
    setPromptOverride('');

    try {
      await apiDelete(`/suites/${encodeURIComponent(suiteId)}?confirm=true`);
    } catch (e) {
      // rollback everything
      setSuites(prevSuites);
      setTests(prevTests);
      setExpandedSuiteIds(prevExpanded);
      console.error(e);
      alert('Delete suite failed. The backend did not remove the suite.');
      return;
    }

    // If selected is null now, pick a sensible fallback
    setSelectedTest(prev => {
      if (prev) return prev;
      return remainingTests[0] ?? null;
    });
  };

  /* ---------------- UI helpers ---------------- */

  const toggleExpandedSuite = (suiteId: string) => {
    setExpandedSuiteIds(prev => {
      const next = new Set(prev);
      if (next.has(suiteId)) next.delete(suiteId);
      else next.add(suiteId);
      return next;
    });
  };

  const selectedModelLabel =
    selectedTest?.modelConfig?.mode === 'existing'
      ? selectedTest.modelConfig.modelId
      : selectedTest?.modelConfig?.mode === 'custom'
      ? 'custom'
      : '—';

  /* ---------------- Render ---------------- */

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-gray-700">
            <FlaskConical className="h-3.5 w-3.5 text-orange-600" />
            Backend-driven test runner
          </div>
          <h1 className="mt-3 text-3xl font-semibold">
            <span className="gradient-text">Testing</span>
          </h1>
          <p className="text-gray-700 mt-2">
            Create suites and tests, select mitigations, and run prompts against the backend runner.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ---------------- Left: Suites & Tests ---------------- */}
          <div className="glass-strong rounded-3xl border border-white/60 overflow-hidden">
            <div className="p-4 border-b border-white/60 bg-white/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    <Folder className="h-4 w-4 text-orange-600" />
                    Test Suites
                  </h2>
                  <div className="text-xs text-gray-600 mt-1">Folders & tests (persisted)</div>
                </div>

                <div className="text-[11px] px-3 py-1 rounded-full bg-white/60 border border-white/60 text-gray-700">
                  {isLoading ? 'Loading…' : `${suites.length} suites`}
                </div>
              </div>

              {/* Primary actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => runSelectedTest()}
                  disabled={!selectedTest || isLoading}
                  className={`py-2.5 rounded-2xl flex items-center justify-center gap-2 border transition-all focus-ring ${
                    selectedTest && !isLoading
                      ? 'bg-gray-900 text-white border-gray-900 hover:shadow-md hover:-translate-y-0.5'
                      : 'bg-white/40 text-gray-400 border-white/60 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span className="text-sm font-semibold">Run</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await saveCurrentTest();
                    } catch (e) {
                      console.error(e);
                      alert('Save failed. Check backend logs / Network tab.');
                    }
                  }}
                  disabled={!canSaveCurrentTest}
                  className={`py-2.5 rounded-2xl flex items-center justify-center gap-2 border transition-all focus-ring ${
                    canSaveCurrentTest
                      ? 'bg-white/60 text-gray-900 border-white/60 hover:bg-white/80 hover:shadow-sm'
                      : 'bg-white/40 text-gray-400 border-white/60 cursor-not-allowed'
                  }`}
                  title={canSaveCurrentTest ? 'Persist current test to backend' : 'Add a prompt override first'}
                >
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-semibold">Save</span>
                </button>
              </div>
            </div>

            <div className="p-3 space-y-3">
              {suites.map(suite => {
                const suiteTests = suiteIdToTests.get(suite.id) ?? [];
                const isExpanded = expandedSuiteIds.has(suite.id);

                return (
                  <div
                    key={suite.id}
                    className="rounded-3xl border border-white/60 bg-white/40 overflow-hidden"
                  >
                    <div className="p-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpandedSuite(suite.id)}
                        className="flex items-center gap-2 text-left min-w-0 focus-ring rounded-2xl px-2 py-1 hover:bg-white/60 transition-colors"
                        title="Expand/collapse"
                      >
                        <ChevronDown
                          className={`h-4 w-4 text-gray-500 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 truncate">
                            {suite.name}
                          </div>
                          <div className="text-[11px] text-gray-600">
                            {suiteTests.length} test{suiteTests.length === 1 ? '' : 's'}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="p-2 rounded-full hover:bg-white/60 transition-colors focus-ring text-gray-600"
                          title="Suite details"
                          onClick={() => {
                            alert(suite.description || 'No description');
                          }}
                        >
                          <Info className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openAddTestModal(suite.id)}
                          className="p-2 rounded-full hover:bg-white/60 transition-colors focus-ring text-gray-700"
                          title="Add test"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            deleteSuite(suite);
                          }}
                          className="p-2 rounded-full hover:bg-white/60 transition-colors focus-ring text-gray-500 hover:text-red-700"
                          title="Delete suite (backend)"
                          aria-label="Delete suite"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-3">
                        {suiteTests.length === 0 ? (
                          <div className="text-xs text-gray-600 px-3 py-4 rounded-2xl bg-white/50 border border-white/60">
                            No tests yet. Click “+” to add one.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {suiteTests.map(test => {
                              const active = selectedTest?.id === test.id;

                              return (
                                <div
                                  key={test.id}
                                  onClick={() => {
                                    setSelectedTest(test);
                                    setRunResult(null);
                                  }}
                                  className={`group p-3 rounded-2xl cursor-pointer border transition-all ${
                                    active
                                      ? 'border-orange-500/40 bg-orange-500/10'
                                      : 'border-white/60 bg-white/50 hover:bg-white/70 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="font-semibold text-sm text-gray-900 truncate">
                                        {test.name}
                                      </div>
                                      <div className="text-[11px] text-gray-600 mt-1">
                                        {test.requiredMitigations?.length ?? 0} active mitigations
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        deleteTest(test.id);
                                      }}
                                      className="p-2 rounded-full hover:bg-white/60 transition-colors focus-ring text-gray-500 hover:text-gray-900"
                                      title="Delete (backend)"
                                      aria-label="Delete test"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setIsCreateSuiteOpen(true)}
                className="w-full py-3 rounded-3xl border border-dashed border-white/60 bg-white/30 hover:bg-white/50 hover:shadow-sm transition-all flex items-center justify-center gap-2 text-gray-700 focus-ring"
                title="Create new folder"
                aria-label="Create folder"
              >
                <Plus className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold">Create suite</span>
              </button>
            </div>
          </div>

          {/* ---------------- Middle: Mitigations ---------------- */}
          <div className="glass-strong rounded-3xl border border-white/60 overflow-hidden">
            <div className="p-4 border-b border-white/60 bg-white/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Mitigations</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Highlighted mitigations match the selected test.
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-gray-600">Active</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {activeMitigationCount} / {totalMitigations}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                  <span>Coverage</span>
                  <span>{mitigationPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/60 border border-white/60 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${mitigationPct}%`,
                      background:
                        'linear-gradient(90deg, rgba(249,115,22,1) 0%, rgba(236,72,153,1) 100%)',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {mitigations.map(m => {
                const active = selectedMitigationSet.has(m.id);
                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      active
                        ? 'border-green-500/25 bg-green-500/10'
                        : 'border-white/60 bg-white/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-gray-900">{m.name}</div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${
                          active
                            ? 'bg-green-500/10 text-green-700 border-green-500/20'
                            : 'bg-gray-900/5 text-gray-700 border-gray-900/10'
                        }`}
                      >
                        {active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-700 mt-2 leading-relaxed">
                      {m.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---------------- Right: Run & Prompt ---------------- */}
          <div className="glass-strong rounded-3xl border border-white/60 overflow-hidden">
            <div className="p-4 border-b border-white/60 bg-white/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">
                    {selectedTest?.name ?? 'Select a test'}
                  </h2>
                  <div className="text-xs text-gray-600 mt-1">
                    Model: <span className="font-semibold text-gray-900">{selectedModelLabel}</span>
                  </div>
                </div>

                {runResult ? (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border ${
                      runResult.passed
                        ? 'bg-green-500/10 text-green-700 border-green-500/20'
                        : 'bg-red-500/10 text-red-700 border-red-500/20'
                    }`}
                  >
                    {runResult.passed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {runResult.passed ? 'PASSED' : 'FAILED'}
                  </span>
                ) : (
                  <span className="text-[11px] px-3 py-1 rounded-full bg-white/60 border border-white/60 text-gray-700">
                    {selectedTest ? 'Ready' : '—'}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3">
              <textarea
                value={promptOverride}
                onChange={e => setPromptOverride(e.target.value)}
                placeholder="Enter test prompt (optional override)…"
                className="w-full h-40 resize-none rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus-ring"
              />

              <button
                type="button"
                onClick={() => runSelectedTest()}
                disabled={!selectedTest || isLoading}
                className={`w-full py-3 rounded-2xl text-white flex items-center justify-center gap-2 border transition-all focus-ring ${
                  selectedTest && !isLoading
                    ? 'border-gray-900 bg-gray-900 hover:shadow-md hover:-translate-y-0.5'
                    : 'border-white/60 bg-white/40 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span className="font-semibold">{isLoading ? 'Running…' : 'Send'}</span>
              </button>

              <div className="text-[11px] text-gray-600">
                Backend: <span className="font-semibold text-gray-900">{API_BASE}</span>
              </div>

              {runResult && (
                <div className="mt-3 rounded-3xl border border-white/60 bg-white/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/60 bg-white/40 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">Run Result</div>
                    <div className="text-[11px] text-gray-600">
                      mitigations: <span className="font-semibold text-gray-900">{runResult.activeMitigations.length}</span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="text-xs text-gray-600">
                      passed:{' '}
                      <span className="font-semibold text-gray-900">{String(runResult.passed)}</span>
                    </div>

                    <div>
                      <div className="text-xs text-gray-600 mb-2">response:</div>
                      <pre className="text-xs bg-gray-950 text-emerald-100 border border-white/10 rounded-2xl p-4 overflow-auto whitespace-pre-wrap break-words">
                        {runResult.modelResponse}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Create Suite Modal ---------------- */}
      <Dialog open={isCreateSuiteOpen} onOpenChange={setIsCreateSuiteOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Suite</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <input
              value={newSuiteName}
              onChange={e => setNewSuiteName(e.target.value)}
              placeholder="Suite name"
              className="w-full px-4 py-2.5 rounded-2xl border border-white/60 bg-white/70 text-sm focus-ring"
            />
            <textarea
              value={newSuiteDescription}
              onChange={e => setNewSuiteDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full h-24 px-4 py-3 rounded-2xl border border-white/60 bg-white/70 text-sm resize-none focus-ring"
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsCreateSuiteOpen(false)}
              className="px-4 py-2 rounded-2xl border border-white/60 bg-white/60 hover:bg-white/80 transition-colors focus-ring"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await createSuite();
                } catch (e) {
                  console.error(e);
                  alert('Create suite failed. Check backend logs.');
                }
              }}
              disabled={!canCreateSuite}
              className={`px-4 py-2 rounded-2xl text-white transition-all focus-ring ${
                canCreateSuite
                  ? 'bg-gray-900 hover:shadow-md hover:-translate-y-0.5'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Add Test Modal ---------------- */}
      <Dialog open={isAddTestOpen} onOpenChange={setIsAddTestOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Test</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <input
              value={newTestTitle}
              onChange={e => setNewTestTitle(e.target.value)}
              placeholder="Test name"
              className="w-full px-4 py-2.5 rounded-2xl border border-white/60 bg-white/70 text-sm focus-ring"
            />

            <Tabs value={addTestTab} onValueChange={v => setAddTestTab(v as AddTestTab)}>
              <TabsList className="w-full bg-white/60 border border-white/60">
                <TabsTrigger value="existing" className="flex-1">
                  Existing model
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex-1">
                  Custom model
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing">
                <select
                  value={newTestModelId}
                  onChange={e => setNewTestModelId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-white/60 bg-white/70 text-sm mt-2 focus-ring"
                >
                  {AI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  Uses backend mock provider for now (no real API calls yet).
                </p>
              </TabsContent>

              <TabsContent value="custom">
                {/* Use password input (review suggestion) */}
                <input
                  type="password"
                  value={newTestApiKey}
                  onChange={e => setNewTestApiKey(e.target.value)}
                  placeholder="API key"
                  className="w-full px-4 py-2.5 rounded-2xl border border-white/60 bg-white/70 text-sm mt-2 focus-ring"
                />
                <p className="text-xs text-gray-600 mt-2">
                  The backend should not log or persist API keys. (Currently runs are mocked.)
                </p>
              </TabsContent>
            </Tabs>

            <div>
              <div className="text-sm font-semibold mb-2">Mitigations implemented</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mitigations.map(m => {
                  const active = newTestMitigations.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleNewTestMitigation(m.id)}
                      className={`p-4 rounded-2xl border text-left transition-all focus-ring ${
                        active
                          ? 'border-green-500/25 bg-green-500/10'
                          : 'border-white/60 bg-white/50 hover:bg-white/70 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-gray-900">{m.name}</div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${
                            active
                              ? 'bg-green-500/10 text-green-700 border-green-500/20'
                              : 'bg-gray-900/5 text-gray-700 border-gray-900/10'
                          }`}
                        >
                          {active ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-700 mt-2 leading-relaxed line-clamp-2">
                        {m.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-gray-600 mt-2">
                You can create a test with <span className="font-semibold text-gray-900">0 mitigations</span>.
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setIsAddTestOpen(false);
                setTargetSuiteId(null);
              }}
              className="px-4 py-2 rounded-2xl border border-white/60 bg-white/60 hover:bg-white/80 transition-colors focus-ring"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await createTestFromModal();
                } catch (e) {
                  console.error(e);
                  alert('Add test failed. Check backend logs.');
                }
              }}
              disabled={!canCreateTest}
              className={`px-4 py-2 rounded-2xl text-white transition-all focus-ring ${
                canCreateTest
                  ? 'bg-gray-900 hover:shadow-md hover:-translate-y-0.5'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Add test
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}