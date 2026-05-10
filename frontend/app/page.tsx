// page.tsx — Riffmax AI homepage. v0-inspired hybrid landing.

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { saveBuild, updateLiveUrl, type HistoryEntry } from "../lib/history";
import {
  getUsage,
  incrementUsage,
  isOverFreeLimit,
  FREE_RIFF_LIMIT,
} from "../lib/usage";
import { TEMPLATES } from "../components/templates-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---- Types ----

type GeneratedPage = {
  slug: string;
  name: string;
  html: string;
};

type ReferencePageBrief = {
  slug: string;
  name: string;
  hero_headline: string | null;
  section_count: number;
  section_flow: string[];
};

type ReferenceBrief = {
  url: string;
  pages_analyzed: number;
  pages: ReferencePageBrief[];
  total_sections: number;
};

type BuildResult = {
  business_name: string;
  industry: string;
  reference_url: string;
  reference_pages_found: string[];
  reference_brief: ReferenceBrief;
  pages: GeneratedPage[];
  input_tokens: number;
  output_tokens: number;
  skill_used: string | null;
  template_used: string | null;
  niche_used: string | null;
  images_added: number;
};

// ---- Static config ----

const EXAMPLE_PROMPTS = [
  "A specialty coffee shop in Lagos called Olaide Roasters. Locally-roasted Nigerian beans, target young creatives, bold and playful tone.",
  "B2B SaaS landing for an AI legal research tool. Target law firms. Professional and confident tone.",
  "Wedding photographer portfolio in San Francisco. Romantic, minimalist, editorial.",
  "DTC e-commerce store for sustainable streetwear. Bold creative palette, target Gen Z.",
  "Fine dining restaurant in Tokyo. Omakase experience, upscale, navy and gold.",
  "Mobile app launch for AI fitness coach. Target young professionals, modern gradient aesthetic.",
];

// Templates moved to components/templates-data.tsx so /templates can reuse them.

// ---- Reusable bits ----

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin w-4 h-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const BUILD_STAGES = [
  { label: "Mapping the reference site", hint: "Discovering pages with Firecrawl" },
  { label: "Scraping key pages", hint: "Extracting structure and copy" },
  { label: "Generating your pages", hint: "Claude is writing original content" },
  { label: "Fetching photos", hint: "Adding real Unsplash imagery" },
  { label: "Almost ready", hint: "Final touches" },
];

function BuildSkeleton({ stage }: { stage: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
    >
      <div className="px-4 sm:px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-3">
        <div className="hidden sm:flex gap-1.5 flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
        <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
      </div>
      <div className="h-[520px] sm:h-[640px] md:h-[800px] bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-md shadow-indigo-500/40">
          <Sparkle className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div className="text-center">
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {BUILD_STAGES[stage]?.label || "Working"}
          </motion.p>
          <motion.p
            key={`hint-${stage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-zinc-500 dark:text-zinc-500 mt-1"
          >
            {BUILD_STAGES[stage]?.hint || ""}
          </motion.p>
        </div>

        {/* Stepper dots */}
        <div className="flex items-center gap-2 mt-2">
          {BUILD_STAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === stage
                  ? "w-8 bg-violet-500"
                  : i < stage
                  ? "w-1.5 bg-violet-400 dark:bg-violet-600"
                  : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ---- Page ----

// useSearchParams requires a Suspense boundary in App Router; the default
// export wraps HomeContent in one.
function HomeContent() {
  const searchParams = useSearchParams();

  const [description, setDescription] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);

  const [feedback, setFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineHistory, setRefineHistory] = useState<string[]>([]);

  const [liveUrl, setLiveUrl] = useState("");
  const [deploying, setDeploying] = useState(false);

  // Track the history entry id so we can update its liveUrl after deploy.
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null);

  // Track which stage of the build pipeline we're showing in the skeleton.
  const [buildStage, setBuildStage] = useState(0);

  // Apply ?template=slug from the URL on mount (lets the Templates page
  // and Dashboard pre-select a template by linking back here with a query).
  useEffect(() => {
    const t = searchParams.get("template");
    if (t && TEMPLATES.some((tpl) => tpl.slug === t)) {
      setSelectedTemplate(t);
    }
  }, [searchParams]);

  // While building, advance through stages on a timer so the user sees progress.
  // Real backend streaming will replace this estimator in a future phase.
  useEffect(() => {
    if (!building) {
      setBuildStage(0);
      return;
    }
    setBuildStage(0);
    // Approximate timing per stage (ms): 4s map, 12s scrape, 50s generate, 8s photos, hold on last
    const stageDurations = [4000, 12000, 50000, 8000];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;
    stageDurations.forEach((d, i) => {
      cumulative += d;
      timers.push(setTimeout(() => setBuildStage(i + 1), cumulative));
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, [building]);

  async function build() {
    if (!description.trim() || !referenceUrl.trim()) return;
    // Free-tier gate (front-end). Backend gate ships once Supabase Riffs land.
    if (isOverFreeLimit()) {
      toast.error(
        `You've used all ${FREE_RIFF_LIMIT} free Riffs this month. Upgrade to keep going.`,
        {
          action: {
            label: "Upgrade",
            onClick: () => (window.location.href = "/pricing"),
          },
          duration: 8000,
        }
      );
      return;
    }
    setBuilding(true);
    setResult(null);
    setRefineHistory([]);
    setFeedback("");
    setLiveUrl("");
    setCurrentPageIdx(0);
    setHistoryEntryId(null);
    try {
      const response = await fetch(`${API_URL}/api/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          reference_url: referenceUrl,
          template: selectedTemplate,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${response.status}`);
      }
      const data: BuildResult = await response.json();
      setResult(data);
      // Increment free-tier counter only on success
      const updated = incrementUsage();
      const remaining = Math.max(0, FREE_RIFF_LIMIT - updated.count);
      toast.success(
        `Generated ${data.pages.length} pages for ${data.business_name}` +
          (remaining > 0 ? ` · ${remaining} free Riffs left this month` : "")
      );

      // Save to local history so /dashboard can show it.
      const entry: HistoryEntry = saveBuild({
        businessName: data.business_name,
        industry: data.industry,
        templateUsed: data.template_used,
        pageCount: data.pages.length,
        liveUrl: null,
      });
      setHistoryEntryId(entry.id);

      setTimeout(() => {
        document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Build failed");
    } finally {
      setBuilding(false);
    }
  }

  async function refineCurrentPage() {
    if (!result || !feedback.trim()) return;
    const submitted = feedback.trim();
    setRefining(true);
    try {
      const currentPage = result.pages[currentPageIdx];
      const response = await fetch(`${API_URL}/api/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: result.business_name,
          current_html: currentPage.html,
          feedback: submitted,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${response.status}`);
      }
      const data = await response.json();
      const newPages = result.pages.map((p, i) =>
        i === currentPageIdx ? { ...p, html: data.html } : p
      );
      setResult({ ...result, pages: newPages });
      setRefineHistory((prev) => [...prev, `[${result.pages[currentPageIdx].name}] ${submitted}`]);
      setFeedback("");
      setLiveUrl("");
      toast.success("Refinement applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refine failed");
    } finally {
      setRefining(false);
    }
  }

  async function deploy() {
    if (!result) return;
    setDeploying(true);
    setLiveUrl("");
    try {
      const response = await fetch(`${API_URL}/api/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: result.business_name,
          pages: result.pages.map((p) => ({ slug: p.slug, html: p.html })),
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${response.status}`);
      }
      const data = await response.json();
      setLiveUrl(data.live_url);
      // Mirror the live URL into the matching history entry (if we have one)
      if (historyEntryId) {
        updateLiveUrl(historyEntryId, data.live_url);
      }
      toast.success("Site deployed live!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  function downloadCurrentPage() {
    if (!result) return;
    const page = result.pages[currentPageIdx];
    const blob = new Blob([page.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.business_name.toLowerCase().replace(/\s+/g, "-")}-${page.slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${page.name} page`);
  }

  function applyExample(prompt: string) {
    setDescription(prompt);
    // focus the textarea so the user can edit
    setTimeout(() => {
      document.getElementById("description-input")?.focus();
    }, 0);
  }

  return (
    <div className="relative overflow-x-hidden">
      {/* Aurora background — three drifting blurred gradient blobs that create
          a "moving" backdrop similar to v0 / Bolt / Lovable landings. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[800px] overflow-hidden"
      >
        <div className="aurora-blob-1 absolute left-1/4 -top-32 h-[520px] w-[520px] rounded-full bg-indigo-500/20 dark:bg-indigo-500/35 blur-3xl" />
        <div className="aurora-blob-2 absolute right-1/4 -top-20 h-[480px] w-[480px] rounded-full bg-violet-500/25 dark:bg-violet-500/40 blur-3xl" />
        <div className="aurora-blob-3 absolute left-1/2 top-32 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-fuchsia-500/15 dark:bg-fuchsia-500/30 blur-3xl" />
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 md:pt-24 pb-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/60 dark:bg-zinc-900/60 backdrop-blur border border-zinc-200/70 dark:border-zinc-800/70 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-full mb-5 shadow-sm">
            <Sparkle className="w-3 h-3 text-violet-500" />
            Powered by Claude + Firecrawl
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-4 leading-[1.05]">
            Riff off any site.
            <br />
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              Ship something original.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Tell Riffmax AI what you want. We&apos;ll riff off a site you admire and build
            you something new — multi-page, original, ready to ship.
          </p>
        </motion.div>

        {/* AI agent box */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-indigo-500/5 dark:shadow-violet-500/10 p-5 sm:p-6 md:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-md shadow-indigo-500/40">
                <Sparkle className="w-5 h-5 text-white" />
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-zinc-900 rounded-full ${
                  building ? "bg-amber-500 animate-pulse" : "bg-green-500"
                }`}
              />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Riffmax AI</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {building ? "Riffing — mapping, scraping, generating..." : "Online · ready to riff"}
              </p>
            </div>
          </div>

          <label htmlFor="description-input" className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Tell me what you want to build
          </label>
          <textarea
            id="description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A specialty coffee shop in Lagos called Olaide Coffee Roasters. Target young creatives, bold and playful tone."
            rows={4}
            disabled={building}
            className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition resize-none text-sm leading-relaxed mb-5 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          />

          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Riff off this site
            <span className="ml-2 font-normal text-xs text-zinc-500 dark:text-zinc-400">
              (we&apos;ll learn from it, not copy it)
            </span>
          </label>
          <input
            type="url"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={building}
            className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm mb-5 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          />

          {/* Selected template chip (if any) */}
          {selectedTemplate && (
            <div className="mb-5 flex items-center justify-between px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900">
              <div className="flex items-center gap-2 text-sm">
                <CheckIcon className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                <span className="text-zinc-700 dark:text-zinc-300">
                  Style: <strong className="text-violet-700 dark:text-violet-300">
                    {TEMPLATES.find((t) => t.slug === selectedTemplate)?.name}
                  </strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                aria-label="Clear template"
              >
                Clear
              </button>
            </div>
          )}

          <button
            onClick={build}
            disabled={building || !description.trim() || !referenceUrl.trim()}
            className="group w-full bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-6 py-4 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 dark:shadow-violet-500/30"
          >
            {building ? (
              <>
                <Spinner />
                <span className="hidden sm:inline">Riffing your website... (30–60 seconds)</span>
                <span className="sm:hidden">Riffing... (30–60s)</span>
              </>
            ) : (
              <>
                <Sparkle className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Start a Riff
              </>
            )}
          </button>
        </motion.div>

        {/* Example prompt chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3 text-center">
            Try one of these
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => applyExample(p)}
                className="text-xs px-3 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors max-w-[280px] truncate"
                title={p}
              >
                {p.split(".")[0]}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Templates section */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-2">
              Or start from a style
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Six battle-tested templates. Click one to apply, then describe your business above.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              const isSelected = selectedTemplate === t.slug;
              return (
                <button
                  key={t.slug}
                  onClick={() => setSelectedTemplate(isSelected ? null : t.slug)}
                  className={`group relative p-5 rounded-2xl border text-left transition-all overflow-hidden ${
                    isSelected
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30 shadow-lg shadow-violet-500/10"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shadow">
                      <CheckIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                      isSelected
                        ? "bg-violet-600 text-white"
                        : "bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/60"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                    {t.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.bestFor}</p>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Skeleton OR Result */}
        <div id="result">
          <AnimatePresence mode="wait">
            {building && !result && <BuildSkeleton key="skeleton" stage={buildStage} />}

            {result && (
              <motion.div
                key="bundle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* Site Analysis Summary — what we learned from the reference */}
                <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 rounded-2xl border border-violet-200 dark:border-violet-900 p-5 sm:p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow shadow-violet-500/30">
                      <Sparkle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                        Site analysis summary
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                        What Riffmax learned from{" "}
                        <a
                          href={result.reference_brief.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-violet-600 dark:hover:text-violet-400 break-all"
                        >
                          {result.reference_brief.url.replace(/^https?:\/\//, "")}
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                    <div className="bg-white/70 dark:bg-zinc-900/50 rounded-lg px-3 py-3">
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {result.reference_brief.pages_analyzed}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        page{result.reference_brief.pages_analyzed !== 1 ? "s" : ""} analyzed
                      </p>
                    </div>
                    <div className="bg-white/70 dark:bg-zinc-900/50 rounded-lg px-3 py-3">
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {result.reference_brief.total_sections}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">total sections</p>
                    </div>
                    <div className="bg-white/70 dark:bg-zinc-900/50 rounded-lg px-3 py-3">
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {result.pages.length}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        page{result.pages.length !== 1 ? "s" : ""} generated
                      </p>
                    </div>
                  </div>

                  <details className="group">
                    <summary className="cursor-pointer text-xs font-medium text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100 inline-flex items-center gap-1 list-none">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3 h-3 transition-transform group-open:rotate-90"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      Show what we extracted from each page
                    </summary>
                    <div className="mt-3 space-y-3">
                      {result.reference_brief.pages.map((p) => (
                        <div
                          key={p.slug}
                          className="bg-white/70 dark:bg-zinc-900/50 rounded-lg p-3"
                        >
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                            {p.name}{" "}
                            <span className="text-zinc-400 dark:text-zinc-600 font-normal">
                              · {p.section_count} sections
                            </span>
                          </p>
                          {p.hero_headline && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 italic mb-2 line-clamp-2">
                              &quot;{p.hero_headline}&quot;
                            </p>
                          )}
                          {p.section_flow.length > 0 && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                              Flow: {p.section_flow.join(" → ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>

                {/* Result preview */}
                <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-indigo-500/5 dark:shadow-violet-500/10 overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="hidden sm:flex gap-1.5 flex-shrink-0">
                        <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      </div>
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 font-medium truncate">
                        {result.business_name}
                      </div>
                      {result.template_used && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-medium hidden sm:inline-block flex-shrink-0">
                          {result.template_used}
                        </span>
                      )}
                      {result.niche_used && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950/50 text-fuchsia-700 dark:text-fuchsia-300 font-medium hidden md:inline-block flex-shrink-0" title="Niche pattern data injected">
                          niche: {result.niche_used}
                        </span>
                      )}
                      {result.skill_used && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium hidden md:inline-block flex-shrink-0">
                          {result.skill_used}
                        </span>
                      )}
                      {result.images_added > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-medium hidden lg:inline-block flex-shrink-0">
                          {result.images_added} photos
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={downloadCurrentPage}
                        className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-xs"
                      >
                        Download
                      </button>
                      <button
                        onClick={deploy}
                        disabled={deploying || !!liveUrl}
                        className="bg-violet-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-violet-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:text-zinc-500 dark:disabled:text-zinc-500 transition-colors text-xs flex items-center gap-1.5"
                      >
                        {deploying ? (
                          <>
                            <Spinner />
                            Deploying
                          </>
                        ) : liveUrl ? (
                          "Deployed"
                        ) : (
                          "Deploy"
                        )}
                      </button>
                    </div>
                  </div>

                  {result.pages.length > 1 && (
                    <div className="mt-3 -mx-1 px-1 flex gap-1.5 overflow-x-auto sm:flex-wrap [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                      {result.pages.map((p, i) => (
                        <button
                          key={p.slug}
                          onClick={() => setCurrentPageIdx(i)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] ${
                            i === currentPageIdx
                              ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                              : "bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {liveUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 sm:px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-green-50 dark:bg-green-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
                      <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm text-green-800 dark:text-green-300 font-medium flex-shrink-0">Live at</span>
                      <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 dark:text-green-400 underline truncate">
                        {liveUrl.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors text-xs whitespace-nowrap min-h-[36px] flex items-center"
                    >
                      Open site
                    </a>
                  </motion.div>
                )}

                <iframe
                  srcDoc={result.pages[currentPageIdx]?.html ?? ""}
                  title={`${result.business_name} preview - ${result.pages[currentPageIdx]?.name ?? ""}`}
                  className="w-full h-[520px] sm:h-[640px] md:h-[800px] border-0 bg-white"
                  sandbox="allow-scripts"
                />

                <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <div className="flex items-center gap-2 mb-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-violet-600 dark:text-violet-400">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Refine the {result.pages[currentPageIdx]?.name ?? "page"}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                    Describe a change in plain English. Only the current page gets updated.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !refining && feedback.trim()) {
                          refineCurrentPage();
                        }
                      }}
                      placeholder="e.g. make the hero darker; add a pricing section; punchier copy"
                      disabled={refining}
                      className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                    />
                    <button
                      onClick={refineCurrentPage}
                      disabled={refining || !feedback.trim()}
                      className="bg-violet-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-violet-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 transition-colors whitespace-nowrap flex items-center justify-center gap-2 text-sm"
                    >
                      {refining ? (
                        <>
                          <Spinner />
                          Refining
                        </>
                      ) : (
                        "Refine"
                      )}
                    </button>
                  </div>

                  {refineHistory.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Applied so far ({refineHistory.length}):
                      </p>
                      <ul className="space-y-1">
                        {refineHistory.map((f, i) => (
                          <li key={i} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                            <CheckIcon className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Default export — wraps HomeContent in Suspense because useSearchParams
// requires it in the App Router.
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <HomeContent />
    </Suspense>
  );
}
