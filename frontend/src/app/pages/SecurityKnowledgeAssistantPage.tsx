import { ChatPanel } from '../assistant/ChatPanel';

export function SecurityKnowledgeAssistantPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl mb-2">Security Knowledge Assistant</h1>
          <p className="text-gray-700">
            Ask questions about prompt-injection vulnerabilities, mitigations, and
            testing practices. This view is optimized for longer conversations.
          </p>
        </div>

        <ChatPanel variant="full" />
      </div>
    </div>
  );
}
