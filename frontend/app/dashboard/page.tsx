"use client";

// /dashboard — main "Riffs" view. Linear-style: dense, minimal, dark-friendly.
// Currently reads from localStorage; per-user Supabase data ships in Phase 13.B.

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
import { useAuth } from "../../components/auth-provider";
import { Sparkle } from "../../components/icons";

function formatRelative(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setHistory(getHistory());
    setHydrated(true);
  }, []);

  function handleDelete(id: string) {
    deleteFromHistory(id);
    setHistory(getHistory());
    toast.success("Removed");
  }

  function handleClearAll() {
    if (!window.confirm("Clear all local history?")) return;
    clearHistory();
    setHistory([]);
    toast.success("History cleared");
  }

  const filtered = history.filter(
    (e) =>
      !filter ||
      e.businessName.toLowerCase().includes(filter.toLowerCase()) ||
      e.industry.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Your Riffs
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {user?.email && (
              <>
                Signed in as <span className="text-zinc-700 dark:text-zinc-300">{user.email}</span>
                {" · "}
              </>
            )}
            Stored locally. Cross-device sync ships next.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
        >
          <Sparkle className="w-3.5 h-3.5" />
          New Riff
        </Link>
      </div>

      {/* Filter bar */}
      {history.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter Riffs..."
            className="flex-1 max-w-xs px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          />
          <button
            onClick={handleClearAll}
            className="text-xs text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 px-2 py-1 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Empty state */}
      {hydrated && history.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center"
        >
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center mb-3">
            <Sparkle className="w-5 h-5" />
          </div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1 text-sm">
            No Riffs yet
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Build your first site and it&apos;ll appear here.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            Start a Riff
          </Link>
        </motion.div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Style</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">Pages</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">Created</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((e) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <p className="text-zinc-900 dark:text-zinc-50 font-medium truncate">
                        {e.businessName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate sm:hidden">
                        {e.industry}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hidden sm:table-cell">
                      {e.templateUsed || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hidden md:table-cell">
                      {e.pageCount}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-500 hidden md:table-cell">
                      {formatRelative(e.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {e.liveUrl ? (
                          <a
                            href={e.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline"
                          >
                            Open ↗
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-400 dark:text-zinc-600">draft</span>
                        )}
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-xs text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
