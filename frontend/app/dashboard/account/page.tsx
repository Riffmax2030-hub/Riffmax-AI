"use client";

import { useAuth } from "../../../components/auth-provider";

export default function AccountPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="px-6 py-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight mb-1">
        Account
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Your profile and authentication details.
      </p>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Profile</h2>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Email</span>
            <span className="text-sm text-zinc-900 dark:text-zinc-50 font-mono">{user?.email}</span>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">User ID</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500 font-mono truncate max-w-[200px] sm:max-w-none">
              {user?.id}
            </span>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Created</span>
            <span className="text-sm text-zinc-900 dark:text-zinc-50">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-5">
        <h2 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">
          Danger zone
        </h2>
        <p className="text-xs text-red-700 dark:text-red-400 mb-3">
          Sign out of this device. You can sign back in anytime.
        </p>
        <button
          onClick={signOut}
          className="bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
