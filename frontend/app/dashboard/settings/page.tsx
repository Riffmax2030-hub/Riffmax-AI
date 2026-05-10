"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="px-6 py-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight mb-1">
        Settings
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Workspace and appearance preferences.
      </p>

      {/* Appearance */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mb-4">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Appearance</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Light, dark, or follow your system.
          </p>
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
          <li>· Custom domain configuration</li>
          <li>· Notification preferences</li>
          <li>· Bring-your-own Anthropic API key</li>
        </ul>
      </section>
    </div>
  );
}
