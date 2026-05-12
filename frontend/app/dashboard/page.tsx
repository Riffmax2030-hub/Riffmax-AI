"use client";

// /dashboard — main "Riffs" view. Reads from Supabase for the signed-in user.
// localStorage history kept as a fallback for any pre-auth-era data.

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
import { type RiffRow, getRiffs, deleteRiff } from "../../lib/riffs";
import { useAuth } from "../../components/auth-provider";
import { Sparkle } from "../../components/icons";

// Unified row shape so the table renders both sources identically.
type Row = {
  id: string;
  source: "supabase" | "local";
  businessName: string;
  industry: string;
  templateUsed: string | null;
  pageCount: number;
  createdAt: number;
  liveUrl: string | null;
};

function fromRiffRow(r: RiffRow): Row {
  return {
    id: r.id,
    source: "supabase",
    businessName: r.business_name,
    industry: r.industry || "",
    templateUsed: r.template_used,
    pageCount: r.page_count,
    createdAt: new Date(r.created_at).getTime(),
    liveUrl: r.live_url,
  };
}

function fromHistoryEntry(h: HistoryEntry): Row {
  return {
    id: h.id,
    source: "local",
    businessName: h.businessName,
    industry: h.industry,
    templateUsed: h.templateUsed,
    pageCount: h.pageCount,
    createdAt: h.createdAt,
    liveUrl: h.liveUrl,
  };
}

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
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  // Pull from both sources and merge. Supabase rows are the source of truth
  // for signed-in users; local history is the historical archive.
  async function reload() {
    setLoading(true);
    const localRows = getHistory().map(fromHistoryEntry);
    let remoteRows: Row[] = [];
    if (user) {
      const riffs = await getRiffs();
      remoteRows = riffs.map(fromRiffRow);
    }
    // Merge — Supabase first, then any local rows not also in Supabase.
    const remoteIds = new Set(remoteRows.map((r) => r.id));
    const merged = [...remoteRows, ...localRows.filter((r) => !remoteIds.has(r.id))]
      .sort((a, b) => b.createdAt - a.createdAt);
    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // re-fetch when auth state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleDelete(row: Row) {
    if (row.source === "supabase") {
      const ok = await deleteRiff(row.id);
      if (!ok) {
        toast.error("Couldn't delete that one");
        return;
      }
    } else {
      deleteFromHistory(row.id);
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast.success("Removed");
  }

  function handleClearLocal() {
    if (!window.confirm("Clear all local-only history? Your synced Riffs are unaffected.")) return;
    clearHistory();
    setRows((prev) => prev.filter((r) => r.source !== "local"));
    toast.success("Local history cleared");
  }

  const filtered = rows.filter(
    (e) =>
      !filter ||
      e.businessName.toLowerCase().includes(filter.toLowerCase()) ||
      e.industry.toLowerCase().includes(filter.toLowerCase())
  );

  const localOnlyCount = rows.filter((r) => r.source === "local").length;

  return (
    <div className="px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Your Riffs
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {user ? (
              <>
                Synced as <span className="text-zinc-700 dark:text-zinc-300">{user.email}</span>
                {localOnlyCount > 0 && (
                  <> · {localOnlyCount} local-only</>
                )}
              </>
            ) : (
              "Stored locally on this device — sign in to sync across devices."
            )}
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
      {rows.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter Riffs..."
            className="flex-1 max-w-xs px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          />
          {localOnlyCount > 0 && (
            <button
              onClick={handleClearLocal}
              className="text-xs text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 px-2 py-1 transition-colors"
            >
              Clear local-only
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && rows.length === 0 && (
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

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Loading your Riffs...
        </div>
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
                    key={`${e.source}:${e.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <p className="text-zinc-900 dark:text-zinc-50 font-medium truncate">
                          {e.businessName}
                        </p>
                        {e.source === "local" && (
                          <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-600 font-medium">
                            local
                          </span>
                        )}
                      </div>
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
                          onClick={() => handleDelete(e)}
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
