"use client";

// Signup page — same Linear-style minimal form, but creates a new account.

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "../../lib/supabase/client";
import { Spinner, MailIcon, LockIcon } from "../../components/icons";

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function signUp() {
    if (!email.trim() || !password) return;
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo}`,
        },
      });
      if (error) throw error;
      setConfirmSent(true);
      toast.success("Confirmation email sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-up failed");
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
            Create your Riff account
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Start riffing in seconds. Free forever.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          {confirmSent ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-3">
                <MailIcon className="w-5 h-5" />
              </div>
              <p className="text-sm text-zinc-900 dark:text-zinc-50 font-medium mb-1">
                Confirm your email
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Check <strong>{email}</strong> for a confirmation link.
              </p>
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
              <div className="relative mb-1.5">
                <LockIcon className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !submitting && email && password) signUp();
                  }}
                  placeholder="At least 6 characters"
                  disabled={submitting}
                  autoComplete="new-password"
                  className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                />
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-5">
                We&apos;ll send a confirmation link to your email.
              </p>

              <button
                onClick={signUp}
                disabled={submitting || !email.trim() || !password}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Spinner /> Creating account
                  </>
                ) : (
                  "Create account"
                )}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-5">
          Already have an account?{" "}
          <Link
            href={`/login${redirectTo !== "/dashboard" ? `?next=${redirectTo}` : ""}`}
            className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-12rem)]" />}>
      <SignupInner />
    </Suspense>
  );
}
