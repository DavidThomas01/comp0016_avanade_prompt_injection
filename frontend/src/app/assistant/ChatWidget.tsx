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
        <div
          className={`absolute bottom-16 right-0 transition-all duration-200 ${
            open
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 pointer-events-none translate-y-2'
          }`}
        >
          <ChatPanel variant="compact" onClose={() => setOpen(false)} />
        </div>

        <button
          onClick={() => setOpen(prev => !prev)}
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors ${
            open ? 'bg-gray-900 text-white' : 'bg-orange-500 text-white'
          }`}
          aria-label={open ? 'Close assistant' : 'Open assistant'}
        >
          {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
