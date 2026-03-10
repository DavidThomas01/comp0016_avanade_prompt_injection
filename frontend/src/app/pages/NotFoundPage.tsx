import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="relative max-w-lg w-full text-center">
        {/* Decorative glow behind the number */}
        <div className="absolute inset-0 flex items-center justify-center -translate-y-16 pointer-events-none select-none">
          <div className="w-72 h-72 rounded-full bg-gradient-to-br from-orange-500/20 via-transparent to-pink-600/20 blur-3xl dark:from-orange-500/10 dark:to-pink-600/10" />
        </div>

        <div className="relative space-y-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 mx-auto">
            <ShieldAlert className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>

          <h1 className="text-[8rem] sm:text-[10rem] font-extrabold leading-none tracking-tighter gradient-text select-none">
            404
          </h1>

          <div className="space-y-2">
            <p className="text-xl sm:text-2xl font-semibold text-foreground">
              You've wandered beyond the prompt boundary.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              This page doesn't exist — or perhaps it was sanitized by our mitigations.
              Either way, there's nothing to see here.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-600 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all focus-ring font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
