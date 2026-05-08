"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TEMPLATES } from "../../components/templates-data";

export default function TemplatesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-4">
          Riff Styles
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          Six battle-tested templates. Pick one and we&apos;ll apply its layout, copy,
          and visual identity to your site.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {TEMPLATES.map((t, i) => {
          const Icon = t.icon;
          return (
            <motion.div
              key={t.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className="group p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg hover:shadow-violet-500/10 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                {t.name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">
                {t.bestFor}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 leading-relaxed">
                {t.description}
              </p>
              <Link
                href={`/?template=${t.slug}`}
                className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Use this style
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
