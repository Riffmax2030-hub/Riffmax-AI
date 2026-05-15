"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "../../components/auth-provider";
import { Spinner, CheckIcon } from "../../components/icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Tier = {
  slug: "free" | "hobby" | "pro" | "agency";
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  ctaLabel: string;
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    slug: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Try Riffmax. Build sites for personal projects.",
    features: [
      "50 credits per month",
      "All 6 Riff Styles",
      "Multi-page generation (up to 4 pages)",
      "Real Unsplash photography",
      "Refine with AI feedback",
      "Riffmax watermark on deployed sites",
    ],
    ctaLabel: "Start free",
  },
  {
    slug: "hobby",
    name: "Hobby",
    price: "$9",
    cadence: "/ month",
    blurb: "For makers shipping side projects.",
    features: [
      "500 credits per month",
      "All Riff Styles",
      "Multi-page (up to 6 pages)",
      "Priority Claude queue",
      "No watermark on deployed sites",
      "Live URL on every deploy",
    ],
    ctaLabel: "Upgrade to Hobby",
  },
  {
    slug: "pro",
    name: "Pro",
    price: "$29",
    cadence: "/ month",
    blurb: "Built for freelancers shipping client sites.",
    features: [
      "2,000 credits per month",
      "All Riff Styles",
      "Multi-page (up to 8 pages)",
      "Custom domains for client sites",
      "Export full HTML bundle",
      "Bring-your-own Anthropic key",
    ],
    ctaLabel: "Upgrade to Pro",
    highlight: true,
  },
  {
    slug: "agency",
    name: "Agency",
    price: "$99",
    cadence: "/ month",
    blurb: "For agencies running many clients in parallel.",
    features: [
      "Unlimited credits",
      "Everything in Pro",
      "Team workspace (5 seats)",
      "White-label deployments",
      "Priority email support",
    ],
    ctaLabel: "Upgrade to Agency",
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  async function handleUpgrade(tier: Tier) {
    if (tier.slug === "free") {
      window.location.href = "/";
      return;
    }
    if (!user) {
      // Not signed in — bounce them to login with a return path
      window.location.href = `/login?next=/pricing`;
      return;
    }
    setLoadingSlug(tier.slug);
    try {
      const r = await fetch(`${API_URL}/api/billing/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: tier.slug,
          email: user.email,
          callback_url: `${window.location.origin}/dashboard?upgraded=${tier.slug}`,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || `Server returned ${r.status}`);
      }
      const data = await r.json();
      if (data.authorization_url) {
        // Redirect to Paystack checkout
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upgrade failed");
      setLoadingSlug(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-4">
          Pricing
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          Free to try. Pay when you ship. Paystack handles checkout (cards + bank).
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {TIERS.map((tier, i) => (
          <motion.div
            key={tier.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * i }}
            className={`p-6 rounded-2xl border flex flex-col ${
              tier.highlight
                ? "border-violet-500 bg-gradient-to-b from-violet-50 to-white dark:from-violet-950/40 dark:to-zinc-900 shadow-xl shadow-violet-500/15 ring-1 ring-violet-500/20"
                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            }`}
          >
            {tier.highlight && (
              <div className="self-start text-xs font-medium px-2 py-0.5 rounded-full bg-violet-600 text-white mb-3">
                Most popular
              </div>
            )}
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              {tier.name}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{tier.blurb}</p>
            <div className="mb-5 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{tier.price}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{tier.cadence}</span>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <CheckIcon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade(tier)}
              disabled={loadingSlug === tier.slug}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                tier.highlight
                  ? "bg-violet-600 hover:bg-violet-700 text-white"
                  : tier.slug === "free"
                  ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  : "bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              {loadingSlug === tier.slug ? (
                <>
                  <Spinner />
                  Redirecting
                </>
              ) : (
                tier.ctaLabel
              )}
            </button>
          </motion.div>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Paystack supports cards, bank transfer, USSD, and Apple Pay. Customers pay in NGN or USD.
      </p>
      {!user && (
        <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/login?next=/pricing" className="text-violet-600 dark:text-violet-400 hover:underline">
            Sign in
          </Link>{" "}
          before upgrading so we can attach the subscription to your account.
        </p>
      )}
    </div>
  );
}
