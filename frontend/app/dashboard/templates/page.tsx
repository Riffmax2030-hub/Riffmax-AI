"use client";

import Link from "next/link";
import { TEMPLATES } from "../../../components/templates-data";
import { ArrowRight } from "../../../components/icons";

export default function DashboardTemplatesPage() {
  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Templates
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Pick a Riff Style and start building.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.slug}
              href={`/?template=${t.slug}`}
              className="group rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-md bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
                {t.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.bestFor}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
