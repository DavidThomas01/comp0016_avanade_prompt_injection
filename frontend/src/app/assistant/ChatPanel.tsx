import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ExternalLink,
  MessageSquare,
  Send,
  X,
  Loader2,
  Trash2,
  StopCircle,
} from 'lucide-react';

import { streamChatMessage } from './chatClient';
import { loadThread, saveThread } from './storage';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ChatMessage, ChatRole } from './types';
import { useRotatingText } from '../hooks/useRotatingText';

const THINKING_PHRASES = [
  'Analyzing your question\u2026',
  'Searching knowledge base\u2026',
  'Reviewing security concepts\u2026',
  'Checking mitigations\u2026',
  'Gathering insights\u2026',
  'Consulting threat models\u2026',
  'Cross-referencing attacks\u2026',
];

type ChatPanelProps = {
  variant: 'compact' | 'full';
  onClose?: () => void;
};

const SAMPLE_QUERIES = [
  'What is direct prompt injection?',
  'How do obfuscation attacks bypass filters?',
  'What mitigations exist for tool-use injection?',
  'Explain indirect prompt injection in RAG systems',
];

const INITIAL_MESSAGE: ChatMessage = {
  id: 'assistant-welcome',
  role: 'assistant',
  content:
    'Hi! I can help you understand prompt-injection vulnerabilities, mitigations, and testing strategies. Ask me anything or try one of the suggestions below.',
  createdAt: Date.now(),
  suggestions: SAMPLE_QUERIES,
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
  const streamedTextRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const thinkingText = useRotatingText(THINKING_PHRASES, 2000, isSending);

  useEffect(() => {
    saveThread(messages);
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isSending]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = variant === 'compact' ? 100 : 160;
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    }
  }, [input, variant]);

  const canSend = input.trim().length > 0 && !isSending;

  const messageCount = useMemo(
    () => messages.filter(m => m.role === 'user').length,
    [messages],
  );

  const handleClearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    setIsSending(false);
    streamedTextRef.current = '';
  }, []);

  const handleAbort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const trimmed = input.trim();
    setInput('');

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMessage = createMessage('user', trimmed);
    const assistantId = `assistant-${crypto.randomUUID()}`;

    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);
    streamedTextRef.current = '';

    const abort = new AbortController();
    abortRef.current = abort;

    const history = [...messages, userMessage]
      .filter(m => m.id !== 'assistant-welcome')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      await streamChatMessage(
        trimmed,
        history,
        {
          onDelta: data => {
            streamedTextRef.current += data.text;
          },
        },
        abort.signal,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!streamedTextRef.current) {
        streamedTextRef.current =
          'Sorry, couldn\u2019t reach the server. Please try again.';
      }
    } finally {
      if (streamedTextRef.current) {
        const finalAssistant = createMessage(
          'assistant',
          streamedTextRef.current,
        );
        setMessages(prev => [...prev, finalAssistant]);
      }
      setIsSending(false);
      abortRef.current = null;
    }
  }, [canSend, input, messages]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const openFullView = () => {
    window.open('/security-knowledge-assistant', '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`flex flex-col glass-strong rounded-2xl shadow-lg overflow-hidden ${
        variant === 'compact' ? 'w-[360px] sm:w-[400px]' : 'w-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/50 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,88,0,1) 0%, rgba(164,0,90,1) 100%)',
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              Security Knowledge Assistant
            </div>
            <div className="text-[11px] text-muted-foreground">
              {messageCount > 0
                ? `${messageCount} question${messageCount === 1 ? '' : 's'} asked`
                : 'Ask a question to get started'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 1 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
              aria-label="Clear chat"
              title="New chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {variant === 'compact' && (
            <button
              type="button"
              onClick={openFullView}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
              title="Open in full view"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
          {variant === 'compact' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
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
          className={`space-y-2.5 overflow-y-auto px-3.5 ${
            variant === 'compact' ? 'h-[380px]' : 'h-[calc(100vh-400px)]'
          } py-3`}
        >
          {messages.map(message => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl text-[13px] leading-relaxed ${
                    isUser
                      ? 'text-white px-3.5 py-2'
                      : 'text-foreground px-3.5 py-2.5 glass-chat-reply'
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
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  ) : (
                    <div className="prose-sm">
                      {message.content ? (
                        <MarkdownRenderer content={message.content} />
                      ) : null}
                    </div>
                  )}

                  {message.suggestions?.length ? (
                    <div className="mt-2.5 pt-2 border-t border-border/40 space-y-1.5">
                      <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                        Try asking
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {message.suggestions.map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleSuggestionClick(s)}
                            className="rounded-full border border-white/50 dark:border-white/10 bg-white/40 dark:bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-orange-300 dark:hover:border-orange-600 hover:text-orange-700 dark:hover:text-orange-400 hover:bg-orange-50/60 dark:hover:bg-orange-950/40 transition-colors cursor-pointer"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {isSending && streamedTextRef.current === '' && (
            <div className="flex justify-start">
              <div className="rounded-2xl glass-chat-reply px-3.5 py-2 text-[13px] text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                {thinkingText}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/50 dark:border-white/10 px-3.5 py-2.5">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about vulnerabilities, mitigations, or testing..."
            className="flex-1 resize-none rounded-xl border border-white/50 dark:border-white/10 bg-white/50 dark:bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-orange-400 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-200 dark:focus:ring-orange-500/30 focus:outline-none overflow-y-hidden min-h-[38px] transition-colors"
            disabled={isSending}
          />
          {isSending ? (
            <button
              type="button"
              onClick={handleAbort}
              className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gray-700 dark:bg-gray-600 text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors"
              aria-label="Stop generating"
              title="Stop"
            >
              <StopCircle className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`inline-flex h-[38px] w-[38px] items-center justify-center rounded-xl transition-all ${
                canSend
                  ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-md'
                  : 'bg-white/40 dark:bg-white/5 text-muted-foreground cursor-not-allowed'
              }`}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}