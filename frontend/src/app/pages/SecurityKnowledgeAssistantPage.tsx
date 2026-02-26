import { ChatPanel } from '../assistant/ChatPanel';
import { Sparkles } from 'lucide-react';

export function SecurityKnowledgeAssistantPage() {
  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-gray-700">
            <Sparkles className="h-3.5 w-3.5 text-orange-600" />
            Full-screen assistant
          </div>
          <h1 className="mt-3 text-3xl font-semibold">
            <span className="gradient-text">Security Knowledge Assistant</span>
          </h1>
          <p className="text-gray-700 mt-2">
            Ask questions about prompt-injection vulnerabilities, mitigations, and testing practices. This view is
            optimized for longer conversations.
          </p>
        </div>

        <div className="glass-strong rounded-3xl border border-white/60 p-2 sm:p-3">
          <ChatPanel variant="full" />
        </div>
      </div>
    </div>
  );
}