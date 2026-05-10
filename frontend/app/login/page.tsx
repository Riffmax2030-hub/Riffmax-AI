"use client";

// Login page — Linear-style minimal dark form.
// Email + password OR magic link.

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "../../lib/supabase/client";
import { Spinner, MailIcon, LockIcon } from "../../components/icons";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function signInWithPassword() {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success("Signed in");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendMagicLink() {
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo}`,
        },
      });
      if (error) throw error;
      setMagicLinkSent(true);
      toast.success("Magic link sent — check your email");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send link");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-7">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            Sign in to Riff
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Welcome back. Pick up where you left off.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          {magicLinkSent ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-3">
                <MailIcon className="w-5 h-5" />
              </div>
              <p className="text-sm text-zinc-900 dark:text-zinc-50 font-medium mb-1">
                Check your inbox
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                We sent a sign-in link to <strong>{email}</strong>.
              </p>
              <button
                onClick={() => setMagicLinkSent(false)}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline mt-4"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email
              </label>
              <div className="relative mb-4">
                <MailIcon className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={submitting}
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                />
              </div>

              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative mb-5">
                <LockIcon className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !submitting && email && password) signInWithPassword();
                  }}
                  placeholder="••••••••"
                  disabled={submitting}
                  autoComplete="current-password"
                  className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                />
              </div>

              <button
                onClick={signInWithPassword}
                disabled={submitting || !email.trim() || !password}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Spinner /> Signing in
                  </>
                ) : (
                  "Sign in"
                )}
              </button>

              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                <span className="text-xs text-zinc-400 dark:text-zinc-600">or</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              </div>

              <button
                onClick={sendMagicLink}
                disabled={submitting || !email.trim()}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                Email me a magic link
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-5">
          Don&apos;t have an account?{" "}
          <Link
            href={`/signup${redirectTo !== "/dashboard" ? `?next=${redirectTo}` : ""}`}
            className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-12rem)]" />}>
      <LoginInner />
    </Suspense>
  );
}
