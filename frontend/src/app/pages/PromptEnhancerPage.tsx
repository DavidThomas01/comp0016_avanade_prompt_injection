import { Send, Copy, RefreshCw, Loader, Sparkles, CheckCircle2, ChevronDown, Check, CircleHelp } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { enhancePrompt, PromptEnhancementResponse, getPromptMitigations, PromptMitigation, Model, fetchModels } from '../api/promptEnhancerClient';
import { useRotatingText } from '../hooks/useRotatingText';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';

const ENHANCER_PROGRESS_MESSAGES = [
  'Analyzing prompt structure…',
  'Applying security mitigations…',
  'Verifying enhancement quality…',
  'Finalizing secured prompt…',
];

function ResultAccordion({
  label,
  color,
  content,
  defaultOpen,
  onCopy,
}: {
  label: string;
  color: 'gray' | 'orange' | 'green';
  content: string;
  defaultOpen: boolean;
  onCopy: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const colorMap = {
    gray: {
      header: 'text-gray-700 dark:text-gray-300',
      bg: 'bg-gray-50/80 dark:bg-gray-800/40',
      border: 'border-gray-200 dark:border-gray-700',
      badge: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    },
    orange: {
      header: 'text-orange-700 dark:text-orange-400',
      bg: 'bg-orange-50/80 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-800/40',
      badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    },
    green: {
      header: 'text-green-700 dark:text-green-400',
      bg: 'bg-green-50/80 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800/40',
      badge: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    },
  };

  const c = colorMap[color];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const previewLength = 120;
  const needsTruncation = content.length > previewLength;
  const preview = needsTruncation ? content.slice(0, previewLength) + '…' : content;

  return (
    <div className={`rounded-2xl border ${c.border} overflow-hidden transition-all`}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 ${c.bg} hover:brightness-95 dark:hover:brightness-110 transition-all`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-sm font-semibold ${c.header}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
              copied
                ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                : 'bg-white/80 dark:bg-white/5 border-white/60 dark:border-white/10 text-muted-foreground hover:bg-white dark:hover:bg-white/10 hover:text-foreground'
            }`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <div
        className={`grid transition-all duration-200 ease-in-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className={`px-4 py-3 ${c.bg} border-t ${c.border}`}>
            <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed text-foreground max-h-[300px] overflow-y-auto">
              {content}
            </pre>
          </div>
        </div>
      </div>

      {!open && needsTruncation && (
        <div className={`px-4 py-2.5 ${c.bg} border-t ${c.border}`}>
          <p className="text-xs text-muted-foreground font-mono leading-relaxed">{preview}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`mt-1.5 text-xs font-medium ${c.header} hover:underline`}
          >
            See more
          </button>
        </div>
      )}
    </div>
  );
}

export function PromptEnhancerPage() {
  const [selectedMitigations, setSelectedMitigations] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [enhancementResult, setEnhancementResult] = useState<PromptEnhancementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mitigations, setMitigations] = useState<PromptMitigation[]>([]);
  const [loadingMitigations, setLoadingMitigations] = useState(true);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const selectedCount = selectedMitigations.length;
  const mitigationCards = useMemo(() => mitigations, [mitigations]);

  const progressText = useRotatingText(ENHANCER_PROGRESS_MESSAGES, 3000, loading);

  // Set default model when models are loaded
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  // Fetch available models on mount
  useEffect(() => {
    async function loadModels() {
      try {
        setLoadingModels(true);
        setModelsError(null);
        const data = await fetchModels();
        setModels(data);
      } catch (err) {
        setModelsError(err instanceof Error ? err.message : 'Failed to load models');
        console.error('Error loading models:', err);
      } finally {
        setLoadingModels(false);
      }
    }
    loadModels();
  }, []);

  // Fetch available mitigations on mount
  useEffect(() => {
    async function fetchMitigations() {
      try {
        const data = await getPromptMitigations();
        setMitigations(data);
      } catch (err) {
        setError('Failed to load available mitigations');
        console.error(err);
      } finally {
        setLoadingMitigations(false);
      }
    }
    fetchMitigations();
  }, []);
  
  const toggleMitigation = (id: string) => {
    setSelectedMitigations(prev =>
      prev.includes(id) 
        ? prev.filter(m => m !== id)
        : [...prev, id]
    );
  };
  
  const generateEnhancedPrompt = async () => {
    if (!systemPrompt.trim()) {
      setError('Please enter a system prompt to enhance.');
      return;
    }

    if (selectedMitigations.length === 0) {
      setError('Please select at least one mitigation to apply.');
      return;
    }

    if (!selectedModel) {
      setError('Please select a model to use for enhancement.');
      return;
    }

    setLoading(true);
    setError(null);
    setEnhancementResult(null);

    try {
      const result = await enhancePrompt(systemPrompt, selectedMitigations, selectedModel);
      setEnhancementResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance prompt');
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const resetForm = () => {
    setSystemPrompt('');
    setEnhancementResult(null);
    setSelectedMitigations([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            Prompt hardening helper
          </div>
          <h1 className="mt-3 text-3xl font-semibold">
            <span className="gradient-text">Prompt Enhancer</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Enhance your system prompts with security mitigations to protect against prompt injection attacks.
            Your prompt will be restructured for clarity, mitigations will be prepended, and the result will be verified.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Mitigations */}
          <div className="glass-strong rounded-3xl border border-white/60 dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Available Mitigations</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select mitigations to include in your prompt
                  </p>
                </div>
                <div className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10">
                  {selectedCount} selected
                </div>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {loadingMitigations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-6 w-6 animate-spin text-orange-600 dark:text-orange-400" />
                </div>
              ) : mitigationCards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No prompt-layer mitigations available</p>
                </div>
              ) : (
                mitigationCards.map((mitigation) => {
                  const active = selectedMitigations.includes(mitigation.id);
                  return (
                    <button
                      key={mitigation.id}
                      type="button"
                      onClick={() => toggleMitigation(mitigation.id)}
                      className={`w-full text-left rounded-2xl p-4 border transition-all focus-ring ${
                        active
                          ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/30'
                          : 'bg-white/40 dark:bg-white/5 border-white/60 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-foreground truncate">
                            {mitigation.name}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                            {mitigation.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {active ? (
                            <CheckCircle2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border border-gray-900/15 dark:border-white/15 bg-white/60 dark:bg-white/5" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}

              <div className="mt-6 p-3 bg-gray-100 dark:bg-white/5 rounded border border-transparent dark:border-white/10">
                <div className="text-sm font-medium mb-2 text-foreground">Selected Mitigations</div>
                <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">
                  {selectedMitigations.length} / {mitigations.length}
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Input */}
          <div className="glass-strong rounded-3xl border border-white/60 dark:border-white/10 p-6">
            <h2 className="text-lg font-semibold mb-2">Your System Prompt</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Paste your system prompt here, then generate a restructured and secured version with the selected mitigations.
            </p>

            {/* Model Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Model Selection</label>
              <div className="relative">
                <select
                  value={selectedModel || ''}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={loadingModels || models.length === 0}
                  className="w-full px-4 py-2 rounded-lg border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/5 text-foreground focus-ring appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [color-scheme:light] dark:[color-scheme:dark]"
                >
                  {loadingModels ? (
                    <option className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100" disabled>Loading models...</option>
                  ) : models.length === 0 ? (
                    <option className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100" disabled>No models available</option>
                  ) : (
                    <>
                      <option className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100" value="" disabled>Select a model...</option>
                      {models.map((model) => (
                        <option className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100" key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {modelsError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">Failed to load models</p>
              )}
            </div>

            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter your system prompt..."
              className="w-full h-[320px] resize-none rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-ring"
              disabled={loading}
            />

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={generateEnhancedPrompt}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-600 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all focus-ring"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span key={progressText} className="animate-fade-in">
                      {progressText}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Generate
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/80 dark:hover:bg-white/10 transition-all focus-ring"
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Reset
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded">
                <div className="text-xs font-medium text-red-900 dark:text-red-300 mb-1">Error</div>
                <p className="text-xs text-red-800 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 rounded">
              <div className="text-xs font-medium text-orange-900 dark:text-orange-300 mb-1">How it works</div>
              <p className="text-xs text-orange-800 dark:text-orange-400">
                1. Your prompt is restructured for clarity<br />
                2. Security mitigations are prepended<br />
                3. The result is verified for quality
              </p>
            </div>
          </div>
          
          {/* Right Panel - Results */}
          <div className="glass-strong rounded-3xl border border-white/60 dark:border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Results</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Original → Restructured → Secured
                  </p>
                </div>
                <Popover>
                  <PopoverTrigger
                    type="button"
                    className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10 dark:hover:bg-orange-500/15 transition-colors focus-ring focus:outline-none"
                    aria-label="What do these results mean?"
                  >
                    <CircleHelp className="h-4 w-4" aria-hidden />
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    sideOffset={6}
                    collisionPadding={12}
                    className="w-64 rounded-lg border border-border bg-popover text-popover-foreground shadow-md p-0 overflow-hidden"
                  >
                    <div className="px-4 pt-4 pb-2">
                      <h3 className="font-semibold text-sm text-foreground">Understanding the results</h3>
                    </div>
                    <dl className="px-4 pb-4 space-y-4 text-xs">
                      <div className="space-y-1">
                        <dt className="font-medium text-foreground">Original prompt</dt>
                        <dd className="text-muted-foreground leading-snug">Your submitted text, for comparison.</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="font-medium text-foreground">Restructured prompt</dt>
                        <dd className="text-muted-foreground leading-snug">Restructured for clarity; no security rules yet.</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="font-medium text-foreground">Secured prompt</dt>
                        <dd className="text-muted-foreground leading-snug">Use this: restructured prompt + mitigations prepended.</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="font-medium text-foreground">Verification</dt>
                        <dd className="text-muted-foreground leading-snug">Checks intent preserved and mitigations present.</dd>
                      </div>
                    </dl>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="p-4 space-y-3 max-h-[800px] overflow-y-auto">
              {enhancementResult ? (
                <>
                  <ResultAccordion
                    label="Original Prompt"
                    color="gray"
                    content={enhancementResult.originalPrompt}
                    defaultOpen={false}
                    onCopy={() => copyToClipboard(enhancementResult.originalPrompt)}
                  />

                  <ResultAccordion
                    label="Restructured Prompt"
                    color="orange"
                    content={enhancementResult.improvedPrompt}
                    defaultOpen={true}
                    onCopy={() => copyToClipboard(enhancementResult.improvedPrompt)}
                  />

                  <ResultAccordion
                    label="Secured Prompt"
                    color="green"
                    content={enhancementResult.enhancedPrompt}
                    defaultOpen={true}
                    onCopy={() => copyToClipboard(enhancementResult.enhancedPrompt)}
                  />

                  {/* Verification Status */}
                  <div className={`p-4 rounded-2xl border ${
                    enhancementResult.verificationData.verdict === 'PASS'
                      ? 'bg-green-50/80 dark:bg-green-950/30 border-green-200 dark:border-green-800/40'
                      : 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-800/40'
                  }`}>
                    <div className={`text-sm font-bold mb-1.5 ${
                      enhancementResult.verificationData.verdict === 'PASS'
                        ? 'text-green-900 dark:text-green-300'
                        : 'text-red-900 dark:text-red-300'
                    }`}>
                      {enhancementResult.verificationData.verdict === 'PASS' ? '✓ Verification Passed' : '✗ Verification Failed'}
                    </div>
                    <div className={`text-sm leading-relaxed ${
                      enhancementResult.verificationData.verdict === 'PASS'
                        ? 'text-green-800 dark:text-green-400'
                        : 'text-red-800 dark:text-red-400'
                    }`}>
                      {enhancementResult.verificationData.explanation}
                    </div>
                    
                    {enhancementResult.verificationData.issues.length > 0 && (
                      <div className={`mt-2.5 text-sm ${
                        enhancementResult.verificationData.verdict === 'PASS'
                          ? 'text-green-800 dark:text-green-400'
                          : 'text-red-800 dark:text-red-400'
                      }`}>
                        <div className="font-medium mb-1">Issues:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {enhancementResult.verificationData.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-2.5 text-xs text-muted-foreground">
                      Completed in {enhancementResult.attempts} attempt{enhancementResult.attempts !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Applied Mitigations */}
                  {selectedMitigations.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2 font-medium">Applied Mitigations:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedMitigations.map((mitId) => {
                          const m = mitigations.find(mit => mit.id === mitId);
                          return (
                            <span key={mitId} className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full">
                              {m?.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : loading ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center space-y-3">
                    <Loader className="w-10 h-10 mx-auto animate-spin opacity-60" />
                    <p key={progressText} className="text-sm font-medium animate-fade-in">
                      {progressText}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <Send className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Enter a prompt and select mitigations to enhance</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
