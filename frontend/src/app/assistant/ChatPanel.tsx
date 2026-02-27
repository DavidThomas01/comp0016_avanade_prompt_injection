import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, MessageSquare, Send, X } from 'lucide-react';

import { sendChatMessage } from './chatClient';
import { loadThread, saveThread } from './storage';
import { ChatMessage, ChatRole } from './types';
import { useRotatingText } from '../hooks/useRotatingText';

const CHAT_PROGRESS_MESSAGES = [
  'Searching knowledge base…',
  'Analyzing your question…',
  'Composing response…',
  'Almost there…',
];

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

  const progressText = useRotatingText(CHAT_PROGRESS_MESSAGES, 2500, isSending);

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
      className={`flex flex-col glass-strong border border-white/60 rounded-3xl shadow-lg overflow-hidden ${
        variant === 'compact' ? 'w-[360px] sm:w-[390px]' : 'w-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/60 bg-white/40">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-2xl flex items-center justify-center text-white shadow-sm"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,88,0,1) 0%, rgba(164,0,90,1) 100%)',
            }}
          >
            <MessageSquare className="h-4 w-4" />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-900">
              Security Knowledge Assistant
            </div>
            <div className="text-xs text-gray-600">
              {messageCount > 0
                ? `${messageCount} question${messageCount === 1 ? '' : 's'} asked`
                : 'Ask a question to get started'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {variant === 'compact' && (
            <button
              type="button"
              onClick={openFullView}
              className="text-xs text-gray-700 hover:text-gray-900 inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-white/60 transition-colors focus-ring"
            >
              Expand
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
          {variant === 'compact' && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 rounded-full p-2 hover:bg-white/60 transition-colors focus-ring"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <div
          ref={scrollRef}
          className={`space-y-4 overflow-y-auto px-4 ${
            variant === 'compact' ? 'h-[380px]' : 'h-[calc(100vh-400px)]'
          } py-4`}
        >
          {messages.map(message => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm border ${
                    isUser
                      ? 'text-white border-white/10'
                      : 'text-gray-800 bg-white/70 border-white/60'
                  }`}
                  style={
                    isUser
                      ? {
                          background:
                            'linear-gradient(135deg, rgba(255,88,0,1) 0%, rgba(164,0,90,1) 100%)',
                        }
                      : undefined
                  }
                >
                  <div className="leading-relaxed whitespace-pre-wrap">{message.content}</div>

                  {message.role === 'assistant' && message.related && (
                    <div className="mt-3 space-y-3 text-xs text-gray-700">
                      {message.related.vulnerabilities?.length ? (
                        <div className="space-y-2">
                          <div className="font-semibold text-gray-900">
                            Relevant vulnerabilities
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {message.related.vulnerabilities.map(vulnerability => (
                              <a
                                key={vulnerability.id}
                                href={`/vulnerability/${vulnerability.id}`}
                                className="px-2 py-1 rounded-full bg-gray-900/5 border border-gray-900/10 hover:border-orange-500/30 hover:bg-orange-500/10 transition-colors"
                              >
                                {vulnerability.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {message.related.mitigations?.length ? (
                        <div className="space-y-2">
                          <div className="font-semibold text-gray-900">
                            Relevant mitigations
                          </div>
                          <div className="space-y-2">
                            {message.related.mitigations.map(mitigation => (
                              <div
                                key={mitigation.id}
                                className="rounded-2xl bg-white/60 border border-white/60 p-3"
                              >
                                <div className="font-semibold text-gray-900">
                                  {mitigation.name}
                                </div>
                                <div className="text-gray-700 mt-1 leading-relaxed">
                                  {mitigation.description}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {message.related.suggestions?.length ? (
                        <div className="space-y-2">
                          <div className="font-semibold text-gray-900">Try asking</div>
                          <div className="flex flex-wrap gap-2">
                            {message.related.suggestions.map(suggestion => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => setInput(suggestion)}
                                className="rounded-full border border-white/60 bg-white/60 px-2 py-1 text-[11px] text-gray-700 hover:bg-white/80 hover:border-orange-500/30 transition-colors focus-ring"
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
            );
          })}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-3xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-700 flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                <span key={progressText} className="animate-fade-in">
                  {progressText}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/60 px-4 py-3 bg-white/40">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about vulnerabilities, mitigations, or testing..."
            className="flex-1 resize-none rounded-2xl border border-white/60 bg-white/60 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 overflow-y-hidden min-h-[40px] focus-ring"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-all focus-ring ${
              canSend
                ? 'bg-orange-600 text-white border-orange-600 hover:shadow-md hover:-translate-y-0.5'
                : 'bg-white/40 text-gray-400 border-white/60 cursor-not-allowed'
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