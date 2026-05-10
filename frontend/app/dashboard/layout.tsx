"use client";

// Dashboard layout — Linear-style left sidebar + main content area.
// Mobile: sidebar collapses behind a hamburger.
// Auth-gated: redirects to /login if no session.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../components/auth-provider";
import {
  Sparkle,
  GridIcon,
  LayersIcon,
  SettingsIcon,
  UserIcon,
  LogOutIcon,
  CloseIcon,
  Spinner,
} from "../../components/icons";

const SIDEBAR_LINKS = [
  { href: "/dashboard", label: "Riffs", icon: Sparkle },
  { href: "/dashboard/templates", label: "Templates", icon: GridIcon },
  { href: "/dashboard/usage", label: "Usage", icon: LayersIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
  { href: "/dashboard/account", label: "Account", icon: UserIcon },
];

function MenuIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* Workspace label */}
      <div className="px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-500 font-medium mb-1">
          Workspace
        </p>
        <p className="text-sm text-zinc-900 dark:text-zinc-50 font-medium truncate">
          {user?.email?.split("@")[0] || "Personal"}
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {SIDEBAR_LINKS.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                active
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={async () => {
            onNavigate?.();
            await signOut();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
        >
          <LogOutIcon className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner className="text-zinc-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-30 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-56 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col"
            >
              <div className="px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Menu
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
                  aria-label="Close menu"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile menu trigger */}
        <div className="lg:hidden border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Dashboard
          </span>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
