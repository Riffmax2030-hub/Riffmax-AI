"use client";

// /admin/scraper — Riff Engine pattern-learning dashboard.
// Lets you scrape, analyze, and aggregate per niche, watch live progress,
// and inspect aggregated patterns.

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  adminFetch,
  AdminAuthError,
  getAdminSecret,
  setAdminSecret,
  clearAdminSecret,
} from "../../../lib/admin-api";

// ---- Types ----

type Niche = {
  slug: string;
  target_count: number;
  scraped_count: number;
  failed_count: number;
};

type Job = {
  niche: string;
  total: number;
  completed: number;
  cached?: number;
  failed: number;
  status: "running" | "done";
  started_at?: string;
  finished_at?: string;
};

type RecentScrape = {
  url: string;
  niche: string;
  status: string;
  scraped_at: string | null;
  error_message: string | null;
};

type DbHealth = { ok: boolean; reason?: string };

// ---- Tiny components ----

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin w-4 h-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

// ---- Login screen ----

function LoginCard({ onLogin }: { onLogin: (secret: string) => Promise<void> }) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!input.trim()) return;
    setSubmitting(true);
    try {
      await onLogin(input.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 sm:px-6 py-20">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-white">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          Riff Engine
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Admin-only. Enter your ADMIN_SECRET.
        </p>
      </div>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !submitting && input.trim()) handleSubmit();
          }}
          placeholder="Paste ADMIN_SECRET"
          autoFocus
          className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm mb-3 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !input.trim()}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white px-4 py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Spinner /> Verifying
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </div>
    </div>
  );
}

// ---- Niche card ----

function NicheCard({
  niche,
  scrapeJob,
  analyzeJob,
  onScrape,
  onAnalyze,
  onAggregate,
  onView,
  busy,
}: {
  niche: Niche;
  scrapeJob: Job | undefined;
  analyzeJob: Job | undefined;
  onScrape: (slug: string) => void;
  onAnalyze: (slug: string) => void;
  onAggregate: (slug: string) => void;
  onView: (slug: string) => void;
  busy: boolean;
}) {
  const scrapePct = scrapeJob
    ? Math.round(((scrapeJob.completed + (scrapeJob.cached ?? 0) + scrapeJob.failed) / scrapeJob.total) * 100)
    : niche.target_count
    ? Math.round((niche.scraped_count / niche.target_count) * 100)
    : 0;

  const analyzePct = analyzeJob
    ? Math.round(((analyzeJob.completed + analyzeJob.failed) / analyzeJob.total) * 100)
    : 0;

  const isScrapeRunning = scrapeJob?.status === "running";
  const isAnalyzeRunning = analyzeJob?.status === "running";

  return (
    <motion.div
      layout
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{niche.slug}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {niche.target_count} targets · {niche.scraped_count} scraped
            {niche.failed_count > 0 && (
              <span className="text-red-600 dark:text-red-400"> · {niche.failed_count} failed</span>
            )}
          </p>
        </div>
        <button
          onClick={() => onView(niche.slug)}
          className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
        >
          View pattern
        </button>
      </div>

      {/* Scrape progress (live or static) */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1">
          <span>{isScrapeRunning ? "Scraping..." : "Scrape"}</span>
          <span className="font-mono">{scrapePct}%</span>
        </div>
        <ProgressBar pct={scrapePct} />
      </div>

      {/* Analyze progress (only while running) */}
      {isAnalyzeRunning && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1">
            <span>Analyzing...</span>
            <span className="font-mono">{analyzePct}%</span>
          </div>
          <ProgressBar pct={analyzePct} />
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <button
          onClick={() => onScrape(niche.slug)}
          disabled={busy || isScrapeRunning}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Scrape
        </button>
        <button
          onClick={() => onAnalyze(niche.slug)}
          disabled={busy || isAnalyzeRunning || niche.scraped_count === 0}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Analyze
        </button>
        <button
          onClick={() => onAggregate(niche.slug)}
          disabled={busy}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Aggregate
        </button>
      </div>
    </motion.div>
  );
}

// ---- Pattern view modal ----

function PatternModal({
  niche,
  onClose,
}: {
  niche: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!niche) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    adminFetch<Record<string, unknown>>(`/api/admin/niche-pattern/${niche}`)
      .then((d) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [niche]);

  if (!niche) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Pattern: {niche}
            </h3>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto p-4 flex-1">
            {loading && <p className="text-sm text-zinc-500">Loading...</p>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {data && (
              <pre className="text-xs text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap break-words">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---- Page ----

export default function AdminScraperPage() {
  const [secret, setSecret] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [niches, setNiches] = useState<Niche[]>([]);
  const [scrapeJobs, setScrapeJobs] = useState<Record<string, Job>>({});
  const [analyzeJobs, setAnalyzeJobs] = useState<Record<string, Job>>({});
  const [recentFailures, setRecentFailures] = useState<RecentScrape[]>([]);
  const [busy, setBusy] = useState(false);
  const [viewingNiche, setViewingNiche] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);

  // Hydrate stored secret on mount
  useEffect(() => {
    setSecret(getAdminSecret());
    setHydrated(true);
  }, []);

  // Stable loaders
  const loadNiches = useCallback(async () => {
    try {
      const data = await adminFetch<{ niches: Niche[] }>("/api/admin/niches");
      setNiches(data.niches || []);
    } catch (e) {
      if (e instanceof AdminAuthError) {
        clearAdminSecret();
        setSecret(null);
        toast.error("Admin secret rejected");
      } else {
        toast.error(e instanceof Error ? e.message : "Failed to load niches");
      }
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const [scrape, analyze] = await Promise.all([
        adminFetch<{ active_jobs: Record<string, Job>; recent: RecentScrape[] }>(
          "/api/admin/scrape-status"
        ),
        adminFetch<{ active_jobs: Record<string, Job> }>("/api/admin/analyze-status"),
      ]);
      setScrapeJobs(scrape.active_jobs || {});
      setAnalyzeJobs(analyze.active_jobs || {});
      setRecentFailures(
        (scrape.recent || []).filter((r) => r.status === "failed").slice(0, 10)
      );
    } catch {
      // silent on poll failures (they're frequent and noise would be annoying)
    }
  }, []);

  // Initial load + dbHealth check after auth
  useEffect(() => {
    if (!secret) return;
    (async () => {
      try {
        const h = await adminFetch<DbHealth>("/api/admin/db-health");
        setDbHealth(h);
      } catch {
        setDbHealth({ ok: false, reason: "fetch failed" });
      }
      loadNiches();
      loadStatus();
    })();
  }, [secret, loadNiches, loadStatus]);

  // Poll status every 3 sec
  useEffect(() => {
    if (!secret) return;
    const interval = setInterval(() => {
      loadStatus();
      // Refresh niche counts periodically too — counts update as scrapes finish
      loadNiches();
    }, 3000);
    return () => clearInterval(interval);
  }, [secret, loadNiches, loadStatus]);

  // ---- Auth ----

  async function handleLogin(secretInput: string) {
    setAdminSecret(secretInput);
    try {
      const h = await adminFetch<DbHealth>("/api/admin/db-health");
      setDbHealth(h);
      setSecret(secretInput);
      toast.success("Authenticated");
    } catch (e) {
      clearAdminSecret();
      toast.error(e instanceof Error ? e.message : "Auth failed");
    }
  }

  function handleLogout() {
    clearAdminSecret();
    setSecret(null);
    setNiches([]);
    setScrapeJobs({});
    setAnalyzeJobs({});
  }

  // ---- Actions ----

  async function scrapeNiche(slug: string) {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/scrape-niche/${slug}`, { method: "POST" });
      toast.success(`Scraping ${slug}`);
      loadStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scrape failed");
    } finally {
      setBusy(false);
    }
  }

  async function analyzeNiche(slug: string) {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/analyze-niche/${slug}`, { method: "POST" });
      toast.success(`Analyzing ${slug}`);
      loadStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  async function aggregateNiche(slug: string) {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/aggregate-niche/${slug}`, { method: "POST" });
      toast.success(`Aggregated ${slug}`);
      loadNiches();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aggregate failed");
    } finally {
      setBusy(false);
    }
  }

  async function scrapeAll() {
    if (!confirm("Scrape ALL niches in sequence? This uses ~136 Firecrawl credits.")) return;
    for (const n of niches) {
      await scrapeNiche(n.slug);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // ---- Render ----

  if (!hydrated) {
    return <div className="min-h-screen" />;
  }

  if (!secret) {
    return <LoginCard onLogin={handleLogin} />;
  }

  const totalTargets = niches.reduce((sum, n) => sum + n.target_count, 0);
  const totalScraped = niches.reduce((sum, n) => sum + n.scraped_count, 0);
  const totalFailed = niches.reduce((sum, n) => sum + n.failed_count, 0);
  const activeCount = Object.keys(scrapeJobs).length + Object.keys(analyzeJobs).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-1">
            Riff Engine
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Pattern learning across {niches.length} niches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dbHealth && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                dbHealth.ok
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
              }`}
              title={dbHealth.reason || ""}
            >
              DB {dbHealth.ok ? "ok" : "error"}
            </span>
          )}
          <button
            onClick={scrapeAll}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
          >
            Scrape all niches
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Niches" value={niches.length} />
        <StatCard label="Targets" value={totalTargets} />
        <StatCard label="Scraped" value={totalScraped} />
        <StatCard label="Failed" value={totalFailed} />
      </div>

      {/* Active jobs */}
      <AnimatePresence>
        {activeCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 text-sm text-violet-800 dark:text-violet-200 flex items-center gap-2"
          >
            <Spinner className="text-violet-600" />
            {activeCount} active job{activeCount > 1 ? "s" : ""} running
          </motion.div>
        )}
      </AnimatePresence>

      {/* Niche grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {niches.map((n) => (
          <NicheCard
            key={n.slug}
            niche={n}
            scrapeJob={scrapeJobs[n.slug]}
            analyzeJob={analyzeJobs[n.slug]}
            onScrape={scrapeNiche}
            onAnalyze={analyzeNiche}
            onAggregate={aggregateNiche}
            onView={setViewingNiche}
            busy={busy}
          />
        ))}
      </div>

      {/* Recent failures */}
      {recentFailures.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
            Recent failures
          </h2>
          <ul className="space-y-2">
            {recentFailures.map((r) => (
              <li
                key={r.url}
                className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline truncate block"
                  >
                    {r.url.replace(/^https?:\/\//, "")}
                  </a>
                  {r.error_message && (
                    <p className="text-red-600 dark:text-red-400 truncate">
                      {r.error_message}
                    </p>
                  )}
                </div>
                <span className="text-zinc-400 dark:text-zinc-600 flex-shrink-0">
                  {r.niche}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PatternModal niche={viewingNiche} onClose={() => setViewingNiche(null)} />
    </div>
  );
}
