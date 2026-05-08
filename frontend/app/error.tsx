"use client";

// Per-route runtime error boundary. Next.js renders this when a render
// throws inside a child segment. The `reset` prop lets the user retry.

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for now. Hook up Sentry / LogRocket here later.
    // eslint-disable-next-line no-console
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        Something went sideways
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
        Don&apos;t worry, your work isn&apos;t lost. Try again or head home.
      </p>
      {error?.digest && (
        <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-6 font-mono">
          ref: {error.digest}
        </p>
      )}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={reset}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
