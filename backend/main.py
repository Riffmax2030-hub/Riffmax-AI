# main.py — the entry point for our backend API.
# Routes (URL endpoints) for our AI Website Builder.

import os
import re
import requests
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from anthropic import Anthropic
from tavily import TavilyClient

# Load secret values from the .env file into the environment.
# After this runs, os.getenv("TAVILY_API_KEY") returns whatever's in .env.
load_dotenv()

app = FastAPI(title="AI Website Builder API")

# CORS — let the frontend (localhost:3000) talk to us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firecrawl API key — used as the fallback scraper for tricky JS-heavy sites.
# We call Firecrawl's REST API directly (no SDK) for transparency and stability.
firecrawl_api_key = os.getenv("FIRECRAWL_API_KEY")
if not firecrawl_api_key or firecrawl_api_key == "PASTE_YOUR_KEY_HERE":
    print("WARNING: FIRECRAWL_API_KEY is missing. Firecrawl fallback disabled.")
    firecrawl_api_key = None

# Tavily client — used as the fast first-pass scraper.
tavily_api_key = os.getenv("TAVILY_API_KEY")
if not tavily_api_key or tavily_api_key == "PASTE_YOUR_KEY_HERE":
    print("WARNING: TAVILY_API_KEY is missing. Tavily primary disabled.")
    tavily_client = None
else:
    tavily_client = TavilyClient(api_key=tavily_api_key)

# Vercel API token — for one-click deploy of generated client sites.
vercel_token = os.getenv("VERCEL_TOKEN")
if not vercel_token or vercel_token == "PASTE_YOUR_KEY_HERE":
    print("WARNING: VERCEL_TOKEN is missing. Deployment disabled.")
    vercel_token = None


# ---- Scraper helpers ----
# Each scraper returns (markdown, title) on success or None on failure.
# This lets /api/scrape try one, then the other, without duplicating error handling.

# We treat <500 chars of markdown as "thin" — likely a JS-rendered page Tavily
# couldn't fully load. That's our cue to escalate to Firecrawl.
THIN_CONTENT_THRESHOLD = 500


def scrape_with_tavily(url: str) -> Optional[tuple[str, str]]:
    """Fast first-pass scraper. Returns (markdown, title) or None on failure."""
    if tavily_client is None:
        return None
    try:
        response = tavily_client.extract(urls=[url], format="markdown")
    except Exception as e:
        print(f"Tavily error for {url}: {e}")
        return None

    results = response.get("results", [])
    if not results:
        return None

    result = results[0]
    markdown = result.get("raw_content", "") or ""
    title = result.get("title", "") or ""

    if len(markdown) < THIN_CONTENT_THRESHOLD:
        # Content is thin — let Firecrawl have a try.
        return None

    return markdown, title


def scrape_with_firecrawl(url: str) -> Optional[tuple[str, str]]:
    """Heavier fallback scraper. Returns (markdown, title) or None on failure."""
    if firecrawl_api_key is None:
        return None
    try:
        http_response = requests.post(
            "https://api.firecrawl.dev/v1/scrape",
            headers={
                "Authorization": f"Bearer {firecrawl_api_key}",
                "Content-Type": "application/json",
            },
            json={"url": url, "formats": ["markdown"]},
            timeout=60,
        )
    except requests.RequestException as e:
        print(f"Firecrawl error for {url}: {e}")
        return None

    if http_response.status_code != 200:
        print(f"Firecrawl returned {http_response.status_code} for {url}")
        return None

    payload = http_response.json()
    if not payload.get("success"):
        return None

    data = payload.get("data", {}) or {}
    markdown = data.get("markdown", "") or ""
    metadata = data.get("metadata", {}) or {}
    title = metadata.get("title") or metadata.get("ogTitle") or ""

    if not markdown:
        return None

    return markdown, title

# Create the Anthropic (Claude) client once, when the server starts.
anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
if not anthropic_api_key or anthropic_api_key == "PASTE_YOUR_KEY_HERE":
    print("WARNING: ANTHROPIC_API_KEY is missing. Add it to backend/.env")
    anthropic_client = None
else:
    anthropic_client = Anthropic(api_key=anthropic_api_key)


# ---- Prompt template for site generation ----
# This is the most important piece of Phase 2. Iterate on it.

SYSTEM_PROMPT = """You are an expert web designer and frontend developer. \
You produce modern, conversion-focused, single-page landing pages as \
complete, self-contained HTML files.

OUTPUT REQUIREMENTS:
- Return ONLY raw HTML. No markdown code fences. No commentary. No explanations.
- The output must be a complete, valid HTML5 document starting with <!DOCTYPE html> and ending with </html>.
- Use Tailwind CSS via the official CDN: <script src="https://cdn.tailwindcss.com"></script>
- All styling must use Tailwind utility classes.
- All JavaScript should be inline within <script> tags.
- Mobile-responsive by default. Use Tailwind's responsive prefixes (sm:, md:, lg:).
- Include realistic, original copy tailored to the client's business. NEVER copy text from the reference.
- The reference brief gives you a STRUCTURE and TONE to learn from. Content must be entirely original.

DESIGN PRINCIPLES:
- Strong hero with clear headline, subheadline, and primary CTA button
- Logical flow: hero → social proof or stats → features/benefits → testimonials → final CTA
- Modern aesthetics: ample whitespace, strong typography hierarchy, clear contrast, subtle hover transitions
- Pick a color palette appropriate to the industry. Be tasteful, not flashy.
- Use inline SVG for icons (no external image URLs — they may not load).
- For hero/section visuals, use clean CSS gradients or geometric SVG, not photos."""


def build_generation_user_prompt(business_name: str, industry: str, brief: dict) -> str:
    """Compose the per-request user message for Claude."""
    return f"""Generate a complete landing page for this client.

CLIENT BUSINESS:
- Name: {business_name}
- Industry: {industry}

REFERENCE DESIGN BRIEF (a site the client admires — use as INSPIRATION ONLY):
- Reference URL: {brief.get('url', 'N/A')}
- Reference page title: {brief.get('page_title', 'N/A')}
- Reference hero headline: {brief.get('hero_headline', 'N/A')}
- Reference hero subhead: {brief.get('hero_subhead', 'N/A')}
- Reference section flow: {' | '.join(brief.get('section_headings', [])[:8]) or 'N/A'}

Use the section flow and tone as scaffolding, but write entirely original copy \
for {business_name}. Output only valid HTML — no markdown fences, no preamble."""


def strip_code_fences(text: str) -> str:
    """Remove ```html...``` wrappers if Claude added them despite instructions."""
    text = text.strip()
    text = re.sub(r"^```(?:html)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


# ---- Helper functions ----

def clean_markdown_text(text: str) -> str:
    """Strip basic markdown formatting (*, _, `, **) from a string."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)  # **bold**
    text = re.sub(r"\*(.+?)\*", r"\1", text)        # *italic*
    text = re.sub(r"_(.+?)_", r"\1", text)          # _italic_
    text = re.sub(r"`(.+?)`", r"\1", text)          # `code`
    return text.strip()


def build_design_brief(url: str, title: str, markdown: str) -> dict:
    """Parse Tavily's markdown into a structured design brief."""

    # Pull out headings at each level using regex.
    # The "MULTILINE" flag means ^ matches the start of each line.
    h1s = [clean_markdown_text(h) for h in re.findall(r"^# (.+)$", markdown, re.MULTILINE)]
    h2s = [clean_markdown_text(h) for h in re.findall(r"^## (.+)$", markdown, re.MULTILINE)]
    h3s = [clean_markdown_text(h) for h in re.findall(r"^### (.+)$", markdown, re.MULTILINE)]

    # Deduplicate while preserving order (Tavily sometimes repeats H1s).
    def dedupe(seq):
        seen = set()
        return [x for x in seq if not (x in seen or seen.add(x))]

    h1s = dedupe(h1s)
    h2s = dedupe(h2s)
    h3s = dedupe(h3s)

    # First non-empty paragraph after the first H1 — often the hero subhead.
    subhead = None
    if h1s:
        # find where the first H1 appears, grab the text after it
        match = re.search(r"^# .+\n+(.+?)(?=\n#|\Z)", markdown, re.MULTILINE | re.DOTALL)
        if match:
            subhead_candidate = clean_markdown_text(match.group(1).strip().split("\n")[0])
            # ignore if it's another heading or empty
            if subhead_candidate and not subhead_candidate.startswith("#"):
                subhead = subhead_candidate[:300]

    return {
        "url": url,
        "page_title": title,
        "hero_headline": h1s[0] if h1s else None,
        "hero_subhead": subhead,
        "section_headings": h2s,
        "subsection_headings": h3s,
        "headings_count": {
            "h1": len(h1s),
            "h2": len(h2s),
            "h3": len(h3s),
        },
        "raw_content_length": len(markdown),
        "raw_content_preview": markdown[:600],
    }


# ---- Routes ----

@app.get("/")
def read_root():
    return {"message": "Hello from your AI Website Builder backend!"}


@app.get("/api/hello")
def hello():
    return {"message": "Backend is alive and connected.", "status": "ok"}


# Pydantic model — describes the shape of the data the route expects.
# FastAPI uses this to validate input automatically.
class ScrapeRequest(BaseModel):
    url: str


@app.post("/api/scrape")
def scrape(request: ScrapeRequest):
    """Scrape a reference URL with smart fallback.

    Strategy:
      1. Try Tavily (fast, cheap). If it succeeds with rich content, use it.
      2. If Tavily fails or returns thin content, fall back to Firecrawl (deeper).
      3. If both fail, return an error.

    The response includes "scraper_used" so the frontend can show which one ran.
    """
    if tavily_client is None and firecrawl_api_key is None:
        raise HTTPException(
            status_code=500,
            detail="No scrapers configured. Add TAVILY_API_KEY or FIRECRAWL_API_KEY to backend/.env",
        )

    markdown: Optional[str] = None
    title: str = ""
    source: Optional[str] = None

    # Step 1: try Tavily first
    tavily_result = scrape_with_tavily(request.url)
    if tavily_result is not None:
        markdown, title = tavily_result
        source = "tavily"

    # Step 2: fall back to Firecrawl if Tavily didn't deliver
    if markdown is None:
        firecrawl_result = scrape_with_firecrawl(request.url)
        if firecrawl_result is not None:
            markdown, title = firecrawl_result
            source = "firecrawl"

    # Step 3: both failed
    if markdown is None:
        raise HTTPException(
            status_code=400,
            detail=f"Both scrapers failed to extract content from {request.url}",
        )

    brief = build_design_brief(request.url, title, markdown)
    brief["scraper_used"] = source
    return brief


# ---- Generation endpoint ----

class GenerateRequest(BaseModel):
    business_name: str
    industry: str
    design_brief: dict  # the JSON we got from /api/scrape


@app.post("/api/generate")
def generate(request: GenerateRequest):
    """Generate an original landing page using Claude."""
    if anthropic_client is None:
        raise HTTPException(
            status_code=500,
            detail="Anthropic API key not configured. Add it to backend/.env",
        )

    user_prompt = build_generation_user_prompt(
        request.business_name,
        request.industry,
        request.design_brief,
    )

    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude error: {e}")

    # The response.content is a list of content blocks; we want the text of the first one.
    raw_text = response.content[0].text if response.content else ""
    html = strip_code_fences(raw_text)

    return {
        "business_name": request.business_name,
        "industry": request.industry,
        "html": html,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
    }


# ---- Deployment endpoint ----

class DeployRequest(BaseModel):
    business_name: str
    html: str


def slugify_for_vercel(name: str) -> str:
    """Vercel project names: lowercase, alphanumeric + hyphens, 1-52 chars."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        slug = "site"
    # Prefix with "sb-" so all our deployments are easy to find in the dashboard.
    full = f"sb-{slug}"
    return full[:52]


@app.post("/api/deploy")
def deploy(request: DeployRequest):
    """Deploy a generated HTML site to Vercel. Returns a live URL."""
    if vercel_token is None:
        raise HTTPException(
            status_code=500,
            detail="Vercel token not configured. Add VERCEL_TOKEN to backend/.env",
        )

    project_name = slugify_for_vercel(request.business_name)

    # Vercel's deployment API: send the HTML inline as a single file. Works great
    # for our small (10-15KB) generated pages.
    payload = {
        "name": project_name,
        "files": [
            {
                "file": "index.html",
                "data": request.html,
                "encoding": "utf-8",
            }
        ],
        "projectSettings": {"framework": None},
        "target": "production",
    }

    try:
        http_response = requests.post(
            "https://api.vercel.com/v13/deployments",
            headers={
                "Authorization": f"Bearer {vercel_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=120,
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Vercel request error: {e}")

    if http_response.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=f"Vercel returned {http_response.status_code}: {http_response.text[:300]}",
        )

    data = http_response.json()
    deployment_host = data.get("url")  # e.g. "sb-coffee-shop-abc123.vercel.app"
    if not deployment_host:
        raise HTTPException(status_code=502, detail="Vercel didn't return a URL")

    return {
        "live_url": f"https://{deployment_host}",
        "deployment_id": data.get("id"),
        "project_name": project_name,
    }
