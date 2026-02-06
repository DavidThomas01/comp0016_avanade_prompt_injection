import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, MessageSquare, Send, X } from 'lucide-react';

import { sendChatMessage } from './chatClient';
import { loadThread, saveThread } from './storage';
import { ChatMessage, ChatRole } from './types';

type ChatPanelProps = {
  variant: 'compact' | 'full';
  onClose?: () => void;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: 'assistant-welcome',
  role: 'assistant',
  content:
    'Ask me anything about prompt-injection vulnerabilities, mitigations, or testing scenarios. I’ll answer from the platform knowledge base.',
  createdAt: Date.now(),
};

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: `${role}-${crypto.randomUUID()}`,
    role,
    content,
    createdAt: Date.now(),
  };
}

export function ChatPanel({ variant, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = loadThread();
    return stored.length ? stored : [INITIAL_MESSAGE];
  });
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    saveThread(messages);
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isSending]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = variant === 'compact' ? 120 : 200;
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    }
  }, [input, variant]);

  const canSend = input.trim().length > 0 && !isSending;

  const messageCount = useMemo(
    () => messages.filter(m => m.role === 'user').length,
    [messages]
  );

  const handleSend = async () => {
    if (!canSend) return;
    const trimmed = input.trim();
    setInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    const userMessage = createMessage('user', trimmed);
    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);

    try {
      const reply = await sendChatMessage(trimmed);
      const assistantMessage: ChatMessage = {
        ...createMessage('assistant', reply.text),
        related: {
          confidence: reply.confidence,
          vulnerabilities: reply.relatedVulnerabilities,
          mitigations: reply.relatedMitigations,
          suggestions: reply.suggestions,
        },
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openFullView = () => {
    window.open('/security-knowledge-assistant', '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`flex flex-col bg-white border border-gray-200 rounded-xl shadow-lg ${
        variant === 'compact' ? 'w-[360px] sm:w-[380px]' : 'w-full'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Security Knowledge Assistant
            </div>
            <div className="text-xs text-gray-500">
              {messageCount > 0
                ? `${messageCount} question${messageCount === 1 ? '' : 's'} asked`
                : 'Ask a question to get started'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {variant === 'compact' && (
            <button
              onClick={openFullView}
              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              Expand
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
          {variant === 'compact' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div
          ref={scrollRef}
          className={`space-y-4 overflow-y-auto px-4 ${
            variant === 'compact' ? 'h-[380px]' : 'h-[calc(100vh-400px)]'
          } py-4`}
        >
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  message.role === 'user'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div>{message.content}</div>
                {message.role === 'assistant' && message.related && (
                  <div className="mt-3 space-y-2 text-xs text-gray-600">
                    {message.related.vulnerabilities?.length ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-700">
                          Relevant vulnerabilities
                        </div>
                        {message.related.vulnerabilities.map(vulnerability => (
                          <a
                            key={vulnerability.id}
                            href={`/vulnerability/${vulnerability.id}`}
                            className="block hover:text-orange-600"
                          >
                            {vulnerability.name}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {message.related.mitigations?.length ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-700">
                          Relevant mitigations
                        </div>
                        {message.related.mitigations.map(mitigation => (
                          <div key={mitigation.id}>
                            <div className="font-medium text-gray-700">
                              {mitigation.name}
                            </div>
                            <div>{mitigation.description}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {message.related.suggestions?.length ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-700">
                          Try asking
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {message.related.suggestions.map(suggestion => (
                            <button
                              key={suggestion}
                              onClick={() => setInput(suggestion)}
                              className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 hover:border-orange-300 hover:text-orange-700"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                Thinking...
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about vulnerabilities, mitigations, or testing..."
            className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none overflow-y-hidden min-h-[40px]"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${
              canSend
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-200 text-gray-400'
            }`}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
