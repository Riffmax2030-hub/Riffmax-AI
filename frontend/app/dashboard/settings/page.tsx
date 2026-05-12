"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  getCredits,
  getByoKey,
  setByoKey,
  CREDITS,
  FREE_CREDITS_PER_MONTH,
} from "../../../lib/usage";
import { Sparkle } from "../../../components/icons";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [credits, setCredits] = useState({ used: 0, remaining: 0, total: FREE_CREDITS_PER_MONTH });

  useEffect(() => {
    setMounted(true);
    setCredits(getCredits());
    const existing = getByoKey();
    if (existing) {
      setHasKey(true);
      // Mask: show first 8 chars + dots
      setKeyInput(existing.slice(0, 8) + "•".repeat(20));
    }
  }, []);

  function saveKey() {
    const k = keyInput.trim();
    if (!k.startsWith("sk-ant-")) {
      toast.error("Anthropic keys start with sk-ant-...");
      return;
    }
    if (k.includes("•")) {
      toast.error("Paste your full key (looks like the masked input)");
      return;
    }
    setByoKey(k);
    setHasKey(true);
    setKeyInput(k.slice(0, 8) + "•".repeat(20));
    toast.success("Key saved. Future Riffs will use your Anthropic account.");
  }

  function clearKey() {
    setByoKey(null);
    setHasKey(false);
    setKeyInput("");
    toast.success("Key cleared. Back on the shared credit pool.");
  }

  const usedPct = Math.round((credits.used / credits.total) * 100);

  return (
    <div className="px-6 py-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight mb-1">
        Settings
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Workspace preferences, credits, and your Anthropic key.
      </p>

      {/* Credits */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mb-4">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Credits</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Resets on the 1st of each month. BUILD costs {CREDITS.BUILD} · REFINE costs {CREDITS.REFINE} · DEPLOY costs {CREDITS.DEPLOY}.
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-end justify-between mb-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {credits.remaining}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              of {credits.total} left this month
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Bring your own Anthropic key */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mb-4">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Bring your own Anthropic key
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Use your own key and bypass Riff&apos;s monthly credit limit. You pay Anthropic directly.
              </p>
            </div>
            {hasKey && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
                active
              </span>
            )}
          </div>
        </div>
        <div className="px-5 py-4">
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Stored only on this device. Get one at{" "}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 dark:text-violet-400 hover:underline"
            >
              console.anthropic.com
            </a>
            .
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={saveKey}
              disabled={!keyInput.trim()}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Save key
            </button>
            {hasKey && (
              <button
                onClick={clearKey}
                className="px-3 py-1.5 rounded-md text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Pattern Engine — moat callout */}
      <section className="rounded-xl border border-violet-200 dark:border-violet-900 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 p-5 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow shadow-violet-500/30">
            <Sparkle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              The Riff Engine
            </h2>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">
              Every Riff is informed by patterns from <strong>68+ top sites</strong> across 8 industries — analyzed by Claude, aggregated by niche, injected into your generation prompt. The more sites we analyze, the better your Riffs get.
            </p>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mb-4">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Appearance</h2>
        </div>
        <div className="px-5 py-4 flex items-center gap-2">
          {mounted &&
            (["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${
                  theme === t
                    ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                    : "border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {t}
              </button>
            ))}
        </div>
      </section>

      {/* Coming soon */}
      <section className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-5">
        <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-1">
          Coming soon
        </p>
        <ul className="text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
          <li>· Cross-device sync (per-account Riff history)</li>
          <li>· Custom domains for client deployments</li>
          <li>· Public Riff gallery</li>
          <li>· Real-time streaming generation</li>
        </ul>
      </section>
    </div>
  );
}
