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
      const maxHeight = variant === 'compact' ? 120 : 200;
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
    const placeholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    setMessages(prev => [...prev, userMessage, placeholder]);
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
            const currentText = streamedTextRef.current;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, content: currentText } : m,
              ),
            );
          },
        },
        abort.signal,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!streamedTextRef.current) {
        streamedTextRef.current = 'Sorry, couldn\u2019t reach the server. Please try again.';
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: streamedTextRef.current }
              : m,
          ),
        );
      }
    } finally {
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
      className={`flex flex-col bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden ${
        variant === 'compact' ? 'w-[360px] sm:w-[400px]' : 'w-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center ring-2 ring-orange-200/50">
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
        <div className="flex items-center gap-1.5">
          {messages.length > 1 && (
            <button
              onClick={handleClearChat}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Clear chat"
              title="New chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {variant === 'compact' && (
            <button
              onClick={openFullView}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
              title="Open in full view"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
          {variant === 'compact' && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
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
          className={`space-y-3 overflow-y-auto px-4 ${
            variant === 'compact' ? 'h-[420px]' : 'h-[calc(100vh-400px)]'
          } py-4`}
        >
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
                  message.role === 'user'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-50 text-gray-800 border border-gray-100'
                }`}
              >
                {message.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <div className="prose-sm">
                    {message.content ? (
                      <MarkdownRenderer content={message.content} />
                    ) : null}
                  </div>
                )}

                {/* Suggestion chips */}
                {message.suggestions?.length ? (
                  <div className="mt-3 pt-2 border-t border-gray-200/60 space-y-1.5">
                    <div className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                      Try asking
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {message.suggestions.map(s => (
                        <button
                          key={s}
                          onClick={() => handleSuggestionClick(s)}
                          className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600 hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50 transition-colors cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {isSending && streamedTextRef.current === '' && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-2.5 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                Thinking&hellip;
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about vulnerabilities, mitigations, or testing..."
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 focus:outline-none overflow-y-hidden min-h-[42px] transition-colors"
            disabled={isSending}
          />
          {isSending ? (
            <button
              onClick={handleAbort}
              className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-gray-700 text-white hover:bg-gray-800 transition-colors"
              aria-label="Stop generating"
              title="Stop"
            >
              <StopCircle className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl transition-colors ${
                canSend
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-gray-200 text-gray-400'
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
