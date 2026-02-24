import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

import { ChatPanel } from './ChatPanel';

export function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50"
      style={{
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="relative">
        {open && (
          <div className="mb-3">
            <ChatPanel variant="compact" onClose={() => setOpen(false)} />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Close assistant' : 'Open assistant'}
          className="h-12 w-12 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 focus-ring"
          style={{
            background:
              'linear-gradient(135deg, rgba(17,24,39,1) 0%, rgba(249,115,22,1) 100%)',
          }}
        >
          <div className="w-full h-full flex items-center justify-center text-white">
            {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
          </div>
        </button>
      </div>
    </div>
  );
}