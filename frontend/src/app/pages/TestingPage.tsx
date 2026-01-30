import { useEffect, useMemo, useState } from 'react';
import { Info, Plus, Play, Send, Trash2 } from 'lucide-react';

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

  /* ---------------- Render ---------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ---------------- Left: Suites & Tests ---------------- */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold">Test Suites</h2>
              <div className="text-xs text-gray-500 mt-1">Folders & tests (persisted)</div>
            </div>

            <div className="p-4 space-y-3">
              {/* Run/Save */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => runSelectedTest()}
                  disabled={!selectedTest || isLoading}
                  className={`w-full py-2 rounded flex items-center justify-center gap-2 ${
                    selectedTest && !isLoading
                      ? 'bg-gray-800 text-white hover:bg-gray-900'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>Run Current Test</span>
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
                  className={`w-full py-2 rounded flex items-center justify-center gap-2 ${
                    canSaveCurrentTest
                      ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  title={canSaveCurrentTest ? 'Persist current test to backend' : 'Select a test first'}
                >
                  <Play className="w-4 h-4" />
                  <span>Save Current Test</span>
                </button>
              </div>
            </div>

            {/* Suites list */}
            {suites.map(suite => {
              const suiteTests = suiteIdToTests.get(suite.id) ?? [];
              const isExpanded = expandedSuiteIds.has(suite.id);

              return (
                <div key={suite.id} className="bg-white border border-gray-200 rounded">
                  <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedSuiteIds(prev => {
                            const next = new Set(prev);
                            if (next.has(suite.id)) next.delete(suite.id);
                            else next.add(suite.id);
                            return next;
                          });
                        }}
                        className="text-left font-medium"
                        title="Expand/collapse"
                      >
                        {suite.name}
                      </button>

                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        title="Suite details"
                        onClick={() => {
                          alert(suite.description || 'No description');
                        }}
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      <span className="text-xs text-gray-400">{suiteTests.length}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openAddTestModal(suite.id)}
                        className="p-1 rounded hover:bg-gray-100"
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
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"
                        title="Delete suite (backend)"
                        aria-label="Delete suite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-2 space-y-1">
                      {suiteTests.length === 0 ? (
                        <div className="text-xs text-gray-400 px-2 py-3">
                          No tests yet. Click “+” to add one.
                        </div>
                      ) : (
                        suiteTests.map(test => (
                          <div
                            key={test.id}
                            onClick={() => {
                              setSelectedTest(test);
                              setRunResult(null);
                            }}
                            className={`p-2 rounded cursor-pointer border ${
                              selectedTest?.id === test.id
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-transparent hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">{test.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {test.requiredMitigations?.length ?? 0} active mitigations
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  deleteTest(test.id);
                                }}
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                title="Delete (backend)"
                                aria-label="Delete test"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Folder Button (bottom) */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setIsCreateSuiteOpen(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg
                          text-gray-500 hover:border-orange-500 hover:text-orange-500
                          flex items-center justify-center gap-2 transition-colors"
                title="Create new folder"
                aria-label="Create folder"
              >
                <Plus className="w-4 h-4" />
                <span>Create suite</span>
              </button>
            </div>
          </div>

          {/* ---------------- Middle: Mitigations ---------------- */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold">Mitigations</h2>
              <p className="text-xs text-gray-500 mt-1">
                Highlighted mitigations match the selected test.
              </p>
            </div>

            <div className="p-4 space-y-3">
              {mitigations.map(m => {
                const active = selectedMitigationSet.has(m.id);
                return (
                  <div
                    key={m.id}
                    className={`p-3 border-2 rounded ${
                      active ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="text-sm font-medium">{m.name}</div>
                  </div>
                );
              })}
            </div>

            <div className="p-4">
              <div className="bg-gray-100 rounded p-4">
                <div className="text-xs text-gray-500 mb-2">Active Mitigations</div>
                <div className="text-2xl font-bold text-orange-500">
                  {(selectedTest?.requiredMitigations?.length ?? 0)} / {mitigations.length}
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- Right: Run & Prompt ---------------- */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold">{selectedTest?.name ?? 'Select a test'}</h2>
              <div className="text-xs text-gray-500 mt-1">
                Model:{' '}
                {selectedTest?.modelConfig?.mode === 'existing'
                  ? selectedTest.modelConfig.modelId
                  : 'custom'}
              </div>
            </div>

            <div className="p-4 space-y-3">
              <textarea
                value={promptOverride}
                onChange={e => setPromptOverride(e.target.value)}
                placeholder="Enter test prompt (optional override)…"
                className="w-full h-36 px-3 py-2 border rounded resize-none"
              />

              <button
                type="button"
                onClick={() => runSelectedTest()}
                disabled={!selectedTest || isLoading}
                className={`w-full py-3 rounded text-white flex items-center justify-center gap-2 ${
                  selectedTest && !isLoading ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-300'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>

              <div className="text-xs text-gray-500">Backend: {API_BASE}</div>

              {runResult && (
                <div className="mt-4 border rounded p-3">
                  <div className="text-sm font-medium mb-2">Run Result</div>
                  <div className="text-xs text-gray-500">
                    passed: <span className="font-semibold">{String(runResult.passed)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">response:</div>
                  <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto">
                    {runResult.modelResponse}
                  </pre>
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
              className="w-full px-3 py-2 border rounded"
            />
            <textarea
              value={newSuiteDescription}
              onChange={e => setNewSuiteDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full h-24 px-3 py-2 border rounded resize-none"
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsCreateSuiteOpen(false)}
              className="px-4 py-2 border rounded"
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
              className={`px-4 py-2 rounded text-white ${
                canCreateSuite ? 'bg-orange-500' : 'bg-gray-300'
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
              className="w-full px-3 py-2 border rounded"
            />

            <Tabs value={addTestTab} onValueChange={v => setAddTestTab(v as AddTestTab)}>
              <TabsList className="w-full">
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
                  className="w-full px-3 py-2 border rounded mt-2"
                >
                  {AI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
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
                  className="w-full px-3 py-2 border rounded mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">
                  The backend should not log or persist API keys. (Currently runs are mocked.)
                </p>
              </TabsContent>
            </Tabs>

            <div>
              <div className="text-sm font-medium mb-2">Mitigations implemented</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mitigations.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleNewTestMitigation(m.id)}
                    className={`p-3 border-2 rounded text-left ${
                      newTestMitigations.includes(m.id)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium">{m.name}</div>
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                You can create a test with <span className="font-semibold">0 mitigations</span>.
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
              className="px-4 py-2 border rounded"
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
              className={`px-4 py-2 rounded text-white ${
                canCreateTest ? 'bg-orange-500' : 'bg-gray-300'
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
