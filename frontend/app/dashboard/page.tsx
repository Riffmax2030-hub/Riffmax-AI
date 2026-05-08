"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  type HistoryEntry,
  getHistory,
  deleteFromHistory,
  clearHistory,
} from "../../lib/history";

function formatRelativeTime(ms: number) {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}

export default function DashboardPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHistory(getHistory());
    setHydrated(true);
  }, []);

  function handleDelete(id: string) {
    deleteFromHistory(id);
    setHistory(getHistory());
    toast.success("Removed from history");
  }

  function handleClearAll() {
    if (!window.confirm("Delete all entries from your local history? This cannot be undone.")) return;
    clearHistory();
    setHistory([]);
    toast.success("History cleared");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-2">
            Riff Studio
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Your recent builds. Stored locally on this device.
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Empty state */}
      {hydrated && history.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
            </svg>
          </div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            No riffs yet
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 max-w-sm mx-auto">
            When you build a site on the home page, it&apos;ll show up here.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            Start a Riff
          </Link>
        </motion.div>
      )}

      {/* History list */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {history.map((entry) => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                    {entry.businessName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{entry.industry}</span>
                    {entry.templateUsed && (
                      <span className="text-violet-600 dark:text-violet-400">{entry.templateUsed}</span>
                    )}
                    <span>{entry.pageCount} pages</span>
                    <span>{formatRelativeTime(entry.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.liveUrl ? (
                    <a
                      href={entry.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium text-xs transition-colors"
                    >
                      Open live site
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-zinc-600 italic">Not deployed</span>
                  )}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    aria-label="Delete entry"
                    className="text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
