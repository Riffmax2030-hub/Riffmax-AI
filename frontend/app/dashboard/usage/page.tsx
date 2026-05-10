"use client";

import { useEffect, useState } from "react";
import { getHistory, type HistoryEntry } from "../../../lib/history";

export default function UsagePage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHistory(getHistory());
    setHydrated(true);
  }, []);

  const totalRiffs = history.length;
  const deployed = history.filter((h) => h.liveUrl).length;
  const totalPages = history.reduce((sum, h) => sum + h.pageCount, 0);

  // Group by template
  const byTemplate = history.reduce<Record<string, number>>((acc, h) => {
    const k = h.templateUsed || "(none)";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="px-6 py-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
        Usage
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 mb-6">
        Local-only stats. Real usage tracking ships with cross-device sync.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Riffs</p>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
            {hydrated ? totalRiffs : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Deployed</p>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
            {hydrated ? deployed : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Pages built</p>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
            {hydrated ? totalPages : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Plan</p>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
            Free
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Riffs by template
          </h2>
        </div>
        {Object.entries(byTemplate).length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500 dark:text-zinc-400 text-center">
            No data yet. Build a Riff to see breakdowns here.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {Object.entries(byTemplate)
              .sort(([, a], [, b]) => b - a)
              .map(([template, count]) => (
                <li key={template} className="px-5 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{template}</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                    {count}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
