// page.tsx — Sitebloom homepage at http://localhost:3000
// Phase 3 visual redesign — clean & professional aesthetic.

"use client";

import { useState } from "react";

// Where to find the backend. In dev this is localhost:8000.
// In production (on Vercel) it's the Railway URL, set via env var.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type DesignBrief = {
  url: string;
  page_title: string;
  hero_headline: string | null;
  hero_subhead: string | null;
  section_headings: string[];
  subsection_headings: string[];
  headings_count: { h1: number; h2: number; h3: number };
  raw_content_length: number;
  raw_content_preview: string;
  scraper_used?: "tavily" | "firecrawl";
};

type GenerationResult = {
  business_name: string;
  industry: string;
  html: string;
  input_tokens: number;
  output_tokens: number;
  skill_used: string | null;
};

// ---- Small reusable bits ----

// Brand mark — gradient square with "S". Recognizable, fast to render.
function BrandMark() {
  return (
    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
      <span className="text-white font-bold text-lg leading-none">S</span>
    </div>
  );
}

// Step number badge — indigo when active, green check when done, gray when pending.
function StepBadge({
  num,
  state,
}: {
  num: number;
  state: "pending" | "active" | "done";
}) {
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 transition-colors ${
        state === "done"
          ? "bg-green-500 text-white"
          : state === "active"
          ? "bg-indigo-600 text-white"
          : "bg-zinc-200 text-zinc-500"
      }`}
    >
      {state === "done" ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        num
      )}
    </div>
  );
}

// Inline loading spinner used inside buttons.
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---- The page ----

export default function Home() {
  // Step 1 state — analyzing the reference
  const [url, setUrl] = useState("https://stripe.com");
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  // Step 2 state — generating the client's site
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [tone, setTone] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  // Step 3 state — deploying the generated site to Vercel
  const [liveUrl, setLiveUrl] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState("");

  // Refine state — applying user feedback to the generated site
  const [feedback, setFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState("");
  const [refineHistory, setRefineHistory] = useState<string[]>([]);

  async function analyze() {
    setAnalyzing(true);
    setAnalyzeError("");
    setBrief(null);
    setResult(null);
    try {
      const response = await fetch(`${API_URL}/api/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${response.status}`);
      }
      const data: DesignBrief = await response.json();
      setBrief(data);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAnalyzing(false);
    }
  }

  async function refineSite() {
    if (!result || !feedback.trim()) return;
    setRefining(true);
    setRefineError("");
    const submittedFeedback = feedback.trim();
    try {
      const response = await fetch(`${API_URL}/api/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: result.business_name,
          current_html: result.html,
          feedback: submittedFeedback,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${response.status}`);
      }
      const data = await response.json();
      // Replace the result with the refined version, but keep the metadata.
      setResult({
        ...result,
        html: data.html,
        input_tokens: data.input_tokens,
        output_tokens: data.output_tokens,
      });
      setRefineHistory((prev) => [...prev, submittedFeedback]);
      setFeedback("");
      // The previously deployed version is now stale — clear so the user
      // can redeploy the refined site if they want.
      setLiveUrl("");
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRefining(false);
    }
  }

  async function deploy() {
    if (!result) return;
    setDeploying(true);
    setDeployError("");
    setLiveUrl("");
    try {
      const response = await fetch(`${API_URL}/api/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: result.business_name,
          html: result.html,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${response.status}`);
      }
      const data = await response.json();
      setLiveUrl(data.live_url);
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeploying(false);
    }
  }

  async function generate() {
    if (!brief) return;
    setGenerating(true);
    setGenerateError("");
    setResult(null);
    setLiveUrl("");
    setDeployError("");
    setRefineHistory([]);
    setFeedback("");
    setRefineError("");
    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          industry: industry,
          design_brief: brief,
          // Only send the advanced fields if the user actually filled them in.
          target_audience: targetAudience || null,
          key_features: keyFeatures || null,
          tone: tone || null,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${response.status}`);
      }
      const data: GenerationResult = await response.json();
      setResult(data);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  function downloadHtml() {
    if (!result) return;
    const blob = new Blob([result.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.business_name
      .toLowerCase()
      .replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Compute the visual state of each step
  const step1State: "pending" | "active" | "done" = brief ? "done" : "active";
  const step2State: "pending" | "active" | "done" = !brief
    ? "pending"
    : result
    ? "done"
    : "active";

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ===== TOP NAV ===== */}
      <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-bold text-zinc-900 text-lg tracking-tight">
              Sitebloom
            </span>
          </div>
          <div className="text-xs text-zinc-500 hidden sm:block">
            AI-powered website generation
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        {/* ===== HERO ===== */}
        <div className="text-center mb-14">
          <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full mb-5">
            Powered by Claude
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight mb-4 leading-[1.1]">
            Original websites,
            <br />
            generated in seconds.
          </h1>
          <p className="text-lg text-zinc-600 max-w-xl mx-auto">
            Show us a site you admire and tell us about your business.
            We&apos;ll build something new — original, conversion-focused, ready
            to ship.
          </p>
        </div>

        {/* ===== STEP 1: ANALYZE ===== */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <StepBadge num={1} state={step1State} />
            <h2 className="text-xl font-semibold text-zinc-900">
              Choose a reference
            </h2>
          </div>
          <div className="ml-0 sm:ml-11 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <p className="text-sm text-zinc-600 mb-4">
              Paste a well-designed site in your client&apos;s industry. We&apos;ll
              learn its structure and copywriting tone.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={analyzing}
                className="flex-1 px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              <button
                onClick={analyze}
                disabled={analyzing || !url}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <Spinner />
                    Analyzing
                  </>
                ) : (
                  "Analyze"
                )}
              </button>
            </div>
          </div>
        </section>

        {analyzeError && (
          <div className="ml-0 sm:ml-11 bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm mb-6">
            {analyzeError}
          </div>
        )}

        {/* ===== DESIGN BRIEF REVEAL ===== */}
        {brief && (
          <div className="ml-0 sm:ml-11 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Design brief
              </h3>
              {brief.scraper_used && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    brief.scraper_used === "tavily"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  via {brief.scraper_used}
                </span>
              )}
            </div>

            <div className="mb-5">
              <p className="text-xs text-zinc-500 mb-1">Hero headline</p>
              <p className="text-lg font-bold text-zinc-900">
                {brief.hero_headline || "(none detected)"}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500 mb-2">
                Section flow · {brief.section_headings.length} sections
              </p>
              <ol className="space-y-1.5">
                {brief.section_headings.slice(0, 8).map((h, i) => (
                  <li
                    key={i}
                    className="text-sm text-zinc-700 flex items-start gap-2"
                  >
                    <span className="text-zinc-400 font-mono text-xs mt-0.5 w-6 flex-shrink-0">
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
                {brief.section_headings.length > 8 && (
                  <li className="text-sm text-zinc-400 ml-8">
                    + {brief.section_headings.length - 8} more
                  </li>
                )}
              </ol>
            </div>
          </div>
        )}

        {/* ===== STEP 2: GENERATE ===== */}
        {brief && (
          <section className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <StepBadge num={2} state={step2State} />
              <h2 className="text-xl font-semibold text-zinc-900">
                Tell us about your client
              </h2>
            </div>
            <div className="ml-0 sm:ml-11 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
              <p className="text-sm text-zinc-600 mb-5">
                Sitebloom uses the structure above plus the details below to
                write a complete, original landing page.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Business name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Olaide Coffee Roasters"
                    disabled={generating}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. specialty coffee shop"
                    disabled={generating}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Advanced options (collapsible) */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mb-4 flex items-center gap-1"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {showAdvanced ? "Hide advanced options" : "Show advanced options (optional)"}
              </button>

              {showAdvanced && (
                <div className="space-y-4 mb-5 pl-2 border-l-2 border-indigo-100">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Target audience
                    </label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g. busy professionals aged 25–40 in big cities"
                      disabled={generating}
                      className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Who the site is for. Helps Claude pick the right voice.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Key features to highlight
                    </label>
                    <textarea
                      value={keyFeatures}
                      onChange={(e) => setKeyFeatures(e.target.value)}
                      placeholder="e.g. fast WiFi, locally-roasted beans, vegan options, dog-friendly patio"
                      disabled={generating}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm resize-none"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Selling points. Comma-separated is fine.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Tone
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      disabled={generating}
                      className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-white"
                    >
                      <option value="">Auto — pick based on industry</option>
                      <option value="Professional and confident">
                        Professional and confident
                      </option>
                      <option value="Warm and friendly">Warm and friendly</option>
                      <option value="Bold and playful">Bold and playful</option>
                      <option value="Luxurious and elegant">Luxurious and elegant</option>
                      <option value="Minimal and modern">Minimal and modern</option>
                      <option value="Casual and approachable">
                        Casual and approachable
                      </option>
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={generate}
                disabled={generating || !businessName || !industry}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Spinner />
                    Generating... (5–20 seconds)
                  </>
                ) : (
                  "Generate website"
                )}
              </button>
            </div>
          </section>
        )}

        {generateError && (
          <div className="ml-0 sm:ml-11 bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm mb-6">
            {generateError}
          </div>
        )}

        {/* ===== STEP 3: PREVIEW ===== */}
        {result && (
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <StepBadge num={3} state="done" />
              <h2 className="text-xl font-semibold text-zinc-900">
                Your site is ready
              </h2>
            </div>
            <div className="ml-0 sm:ml-11 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              {/* Browser-frame style header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-zinc-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex gap-1.5 flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-zinc-300" />
                    <div className="w-3 h-3 rounded-full bg-zinc-300" />
                    <div className="w-3 h-3 rounded-full bg-zinc-300" />
                  </div>
                  <div className="text-sm text-zinc-700 font-medium truncate">
                    {result.business_name}
                  </div>
                  {result.skill_used && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium hidden sm:inline-block flex-shrink-0">
                      {result.skill_used}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-zinc-500 hidden lg:inline">
                    {result.input_tokens.toLocaleString()} →{" "}
                    {result.output_tokens.toLocaleString()} tokens
                  </span>
                  <button
                    onClick={downloadHtml}
                    className="bg-white border border-zinc-300 text-zinc-700 px-3 py-1.5 rounded-lg font-medium hover:bg-zinc-50 transition-colors text-xs"
                  >
                    Download
                  </button>
                  <button
                    onClick={deploy}
                    disabled={deploying || !!liveUrl}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors text-xs flex items-center gap-1.5"
                  >
                    {deploying ? (
                      <>
                        <Spinner />
                        Deploying
                      </>
                    ) : liveUrl ? (
                      "Deployed"
                    ) : (
                      "Deploy to live URL"
                    )}
                  </button>
                </div>
              </div>

              {/* Live URL banner — shows after a successful deploy */}
              {liveUrl && (
                <div className="px-5 py-3 border-b border-zinc-200 bg-green-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-green-600 flex-shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-sm text-green-800 font-medium">Live at</span>
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-700 underline truncate"
                    >
                      {liveUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700 transition-colors text-xs whitespace-nowrap"
                  >
                    Open site
                  </a>
                </div>
              )}

              {deployError && (
                <div className="px-5 py-3 border-b border-zinc-200 bg-red-50 text-red-800 text-sm">
                  {deployError}
                </div>
              )}

              <iframe
                srcDoc={result.html}
                title={`${result.business_name} preview`}
                className="w-full h-[800px] border-0 bg-white"
                sandbox="allow-scripts"
              />

              {/* Refine panel */}
              <div className="p-5 border-t border-zinc-200 bg-zinc-50">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 text-indigo-600"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Refine the site
                  </h3>
                </div>
                <p className="text-xs text-zinc-600 mb-3">
                  Tell Sitebloom what to change in plain English. Be specific.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !refining && feedback.trim()) {
                        refineSite();
                      }
                    }}
                    placeholder="e.g. make the hero darker; add a pricing section; punchier copy"
                    disabled={refining}
                    className="flex-1 px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-white"
                  />
                  <button
                    onClick={refineSite}
                    disabled={refining || !feedback.trim()}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors whitespace-nowrap flex items-center justify-center gap-2 text-sm"
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

                {refineError && (
                  <p className="mt-2 text-sm text-red-700">{refineError}</p>
                )}

                {/* History of applied refinements */}
                {refineHistory.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-zinc-500 mb-1.5">
                      Applied so far ({refineHistory.length}):
                    </p>
                    <ul className="space-y-1">
                      {refineHistory.map((f, i) => (
                        <li
                          key={i}
                          className="text-xs text-zinc-700 flex items-start gap-2"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-zinc-200 mt-16 py-8 text-center text-xs text-zinc-500">
        Sitebloom · AI-powered website generation
      </footer>
    </div>
  );
}
