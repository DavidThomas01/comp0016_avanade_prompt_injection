import { Send, Copy, RefreshCw, Loader, Sparkles, CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { mitigations } from '../data/mitigations';
import { enhancePrompt, PromptEnhancementResponse } from '../api/promptEnhancerClient';
import { useRotatingText } from '../hooks/useRotatingText';

const ENHANCER_PROGRESS_MESSAGES = [
  'Analyzing prompt structure…',
  'Applying security mitigations…',
  'Verifying enhancement quality…',
  'Finalizing enhanced prompt…',
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
      header: 'text-gray-700',
      bg: 'bg-gray-50/80',
      border: 'border-gray-200',
      badge: 'bg-gray-100 text-gray-600',
    },
    orange: {
      header: 'text-orange-700',
      bg: 'bg-orange-50/80',
      border: 'border-orange-200',
      badge: 'bg-orange-100 text-orange-600',
    },
    green: {
      header: 'text-green-700',
      bg: 'bg-green-50/80',
      border: 'border-green-200',
      badge: 'bg-green-100 text-green-600',
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
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 ${c.bg} hover:brightness-95 transition-all`}
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
                ? 'bg-green-100 border-green-300 text-green-700'
                : 'bg-white/80 border-white/60 text-gray-600 hover:bg-white hover:text-gray-900'
            }`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
            <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed text-gray-800 max-h-[300px] overflow-y-auto">
              {content}
            </pre>
          </div>
        </div>
      </div>

      {!open && needsTruncation && (
        <div className={`px-4 py-2.5 ${c.bg} border-t ${c.border}`}>
          <p className="text-xs text-gray-500 font-mono leading-relaxed">{preview}</p>
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
  const selectedCount = selectedMitigations.length;
  const mitigationCards = useMemo(() => mitigations, []);

  const progressText = useRotatingText(ENHANCER_PROGRESS_MESSAGES, 3000, loading);
  
  const toggleMitigation = (id: string) => {
    setSelectedMitigations(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
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

    setLoading(true);
    setError(null);
    setEnhancementResult(null);

    try {
      const result = await enhancePrompt(systemPrompt, selectedMitigations);
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
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-gray-700">
            <Sparkles className="h-3.5 w-3.5 text-orange-600" />
            Prompt hardening helper
          </div>
          <h1 className="mt-3 text-3xl font-semibold">
            <span className="gradient-text">Prompt Enhancer</span>
          </h1>
          <p className="text-gray-700 mt-2">
            Enhance your system prompts with security mitigations to protect against prompt injection attacks.
            Your prompt will be restructured for clarity, mitigations will be prepended, and the result will be verified.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Mitigations */}
          <div className="glass-strong rounded-3xl border border-white/60 overflow-hidden">
            <div className="p-4 border-b border-white/60 bg-white/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Available Mitigations</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Select mitigations to include in your prompt
                  </p>
                </div>
                <div className="text-xs text-gray-700 px-3 py-1 rounded-full bg-white/60 border border-white/60">
                  {selectedCount} selected
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {mitigationCards.map((mitigation) => {
                const active = selectedMitigations.includes(mitigation.id);
                return (
                  <button
                    key={mitigation.id}
                    type="button"
                    onClick={() => toggleMitigation(mitigation.id)}
                    className={`w-full text-left rounded-2xl p-4 border transition-all focus-ring ${
                      active
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-white/40 border-white/60 hover:bg-white/70 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">
                          {mitigation.name}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2">
                          {mitigation.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {active ? (
                          <CheckCircle2 className="h-5 w-5 text-orange-600" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border border-gray-900/15 bg-white/60" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle: Input */}
          <div className="glass-strong rounded-3xl border border-white/60 p-6">
            <h2 className="text-lg font-semibold mb-2">Your System Prompt</h2>
            <p className="text-sm text-gray-600 mb-4">
              Paste your system prompt here, then generate an enhanced version with the selected mitigations.
            </p>

            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter your system prompt..."
              className="w-full h-[320px] resize-none rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus-ring"
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/80 transition-all focus-ring"
              >
                <RefreshCw className="h-4 w-4 text-gray-700" />
                Reset
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <div className="text-xs font-medium text-red-900 mb-1">Error</div>
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
              <div className="text-xs font-medium text-orange-900 mb-1">How it works</div>
              <p className="text-xs text-orange-800">
                1. Your prompt is restructured for clarity<br />
                2. Security mitigations are prepended<br />
                3. The result is verified for quality
              </p>
            </div>
          </div>
          
          {/* Right Panel - Results */}
          <div className="glass-strong rounded-3xl border border-white/60 overflow-hidden">
            <div className="p-4 border-b border-white/60 bg-white/40">
              <div>
                <h2 className="text-lg font-semibold">Results</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Original → Improved → Enhanced
                </p>
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
                    label="Improved Prompt"
                    color="orange"
                    content={enhancementResult.improvedPrompt}
                    defaultOpen={true}
                    onCopy={() => copyToClipboard(enhancementResult.improvedPrompt)}
                  />

                  <ResultAccordion
                    label="Final Enhanced Prompt"
                    color="green"
                    content={enhancementResult.enhancedPrompt}
                    defaultOpen={true}
                    onCopy={() => copyToClipboard(enhancementResult.enhancedPrompt)}
                  />

                  {/* Verification Status */}
                  <div className={`p-4 rounded-2xl border ${
                    enhancementResult.verificationData.verdict === 'PASS'
                      ? 'bg-green-50/80 border-green-200'
                      : 'bg-red-50/80 border-red-200'
                  }`}>
                    <div className={`text-sm font-bold mb-1.5 ${
                      enhancementResult.verificationData.verdict === 'PASS'
                        ? 'text-green-900'
                        : 'text-red-900'
                    }`}>
                      {enhancementResult.verificationData.verdict === 'PASS' ? '✓ Verification Passed' : '✗ Verification Failed'}
                    </div>
                    <div className={`text-sm leading-relaxed ${
                      enhancementResult.verificationData.verdict === 'PASS'
                        ? 'text-green-800'
                        : 'text-red-800'
                    }`}>
                      {enhancementResult.verificationData.explanation}
                    </div>
                    
                    {enhancementResult.verificationData.issues.length > 0 && (
                      <div className="mt-2.5 text-sm">
                        <div className="font-medium mb-1">Issues:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {enhancementResult.verificationData.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-2.5 text-xs text-gray-600">
                      Completed in {enhancementResult.attempts} attempt{enhancementResult.attempts !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Applied Mitigations */}
                  {selectedMitigations.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-600 mb-2 font-medium">Applied Mitigations:</div>
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
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center space-y-3">
                    <Loader className="w-10 h-10 mx-auto animate-spin opacity-60" />
                    <p key={progressText} className="text-sm font-medium animate-fade-in">
                      {progressText}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
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
