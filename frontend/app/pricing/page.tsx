"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type Tier = {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Try Riffmax. Build sites for personal projects.",
    features: [
      "5 builds per month",
      "All 6 Riff Styles",
      "Multi-page generation (up to 4 pages)",
      "Real Unsplash photography",
      "Refine with AI feedback",
      "Riffmax watermark on deployed sites",
    ],
    cta: { label: "Start free", href: "/" },
  },
  {
    name: "Pro",
    price: "$19",
    cadence: "/ month",
    blurb: "Built for freelancers shipping client sites.",
    features: [
      "Unlimited builds",
      "All 6 Riff Styles",
      "Multi-page (up to 8 pages)",
      "Priority Claude queue (2x faster)",
      "No watermark on deployed sites",
      "Live URL on every deploy",
      "Export full HTML bundle",
    ],
    cta: { label: "Start Pro trial", href: "/" },
    highlight: true,
  },
  {
    name: "Team",
    price: "$99",
    cadence: "/ month",
    blurb: "For agencies running many clients in parallel.",
    features: [
      "Everything in Pro",
      "Custom domains for clients",
      "Team workspace (5 seats)",
      "Bring-your-own Claude key (no markup)",
      "White-label deployments",
      "Priority email support",
    ],
    cta: { label: "Talk to us", href: "/" },
  },
];

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-4">
          Riff Credits
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          Free to try. Pay when you ship.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {TIERS.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.07 * i }}
            className={`p-6 sm:p-8 rounded-2xl border flex flex-col ${
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
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">{tier.blurb}</p>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">{tier.price}</span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{tier.cadence}</span>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <CheckIcon className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={tier.cta.href}
              className={`text-center px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                tier.highlight
                  ? "bg-violet-600 hover:bg-violet-700 text-white"
                  : "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
              }`}
            >
              {tier.cta.label}
            </Link>
          </motion.div>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Pricing shown is illustrative. Riffmax is in early access — contact us for actual rates.
      </p>
    </div>
  );
}
