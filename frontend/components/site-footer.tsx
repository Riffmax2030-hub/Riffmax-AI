// Shared footer — small, subtle. Hidden on auth routes.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDE_CHROME_ROUTES = ["/login", "/signup"];

export function SiteFooter() {
  const pathname = usePathname();
  if (HIDE_CHROME_ROUTES.includes(pathname)) {
    return null;
  }

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <p>© 2025 Riffmax AI · Website Riffing Powered by Claude</p>
        <div className="flex items-center gap-4">
          <Link href="/templates" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Templates
          </Link>
          <Link href="/pricing" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Pricing
          </Link>
          <Link href="/dashboard" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}
