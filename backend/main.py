# main.py — the entry point for our backend API.
# Routes (URL endpoints) for our AI Website Builder.

import json
import os
import re
import requests
import yaml
from pathlib import Path
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

# CORS — allow our local dev frontend AND any Vercel-hosted production frontend
# to call this backend. The regex matches every *.vercel.app deployment, so
# preview deployments work too without us having to update this list.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
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

# Unsplash Access Key — for replacing image placeholders with real photos.
unsplash_access_key = os.getenv("UNSPLASH_ACCESS_KEY")
if not unsplash_access_key or unsplash_access_key == "PASTE_YOUR_KEY_HERE":
    print("WARNING: UNSPLASH_ACCESS_KEY is missing. Image replacement disabled.")
    unsplash_access_key = None


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
- Use inline SVG for icons.

IMAGES:
- For photographic images (hero shots, atmosphere photos, food, products, people), use this exact placeholder format:
  <img src="UNSPLASH:<search query>" alt="<descriptive alt text>" class="<tailwind classes>">
- The backend will replace each UNSPLASH: placeholder with a real Unsplash photo at runtime.
- Keep search queries 3–6 words, describing what's in the photo (e.g. "rustic coffee shop interior", "young woman working laptop café", "espresso pour shot dark").
- Use 2–5 image placeholders per page maximum. Don't pad with images.
- Always include alt text for accessibility.
- Add Tailwind classes for sizing/styling (object-cover, rounded-lg, w-full, h-96, etc.).
- Do NOT use external image URLs that aren't UNSPLASH: placeholders — they may not load."""


def build_generation_user_prompt(
    business_name: str,
    industry: str,
    brief: dict,
    target_audience: Optional[str] = None,
    key_features: Optional[str] = None,
    tone: Optional[str] = None,
) -> str:
    """Compose the per-request user message for Claude. Optional fields
    get added only when the user provided them."""

    lines = [
        "Generate a complete landing page for this client.",
        "",
        "CLIENT BUSINESS:",
        f"- Name: {business_name}",
        f"- Industry: {industry}",
    ]

    if target_audience:
        lines.append(f"- Target audience: {target_audience}")
    if key_features:
        lines.append(f"- Key features to highlight: {key_features}")
    if tone:
        lines.append(f"- Tone preference: {tone}")

    lines.extend([
        "",
        "REFERENCE DESIGN BRIEF (a site the client admires — use as INSPIRATION ONLY):",
        f"- Reference URL: {brief.get('url', 'N/A')}",
        f"- Reference page title: {brief.get('page_title', 'N/A')}",
        f"- Reference hero headline: {brief.get('hero_headline', 'N/A')}",
        f"- Reference hero subhead: {brief.get('hero_subhead', 'N/A')}",
        f"- Reference section flow: {' | '.join(brief.get('section_headings', [])[:8]) or 'N/A'}",
        "",
        f"Use the section flow and tone as scaffolding, but write entirely original copy "
        f"for {business_name}. Output only valid HTML — no markdown fences, no preamble.",
    ])

    return "\n".join(lines)


def strip_code_fences(text: str) -> str:
    """Remove ```html...``` wrappers if Claude added them despite instructions."""
    text = text.strip()
    text = re.sub(r"^```(?:html)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


# ---- Unsplash placeholder replacement ----
# Claude generates images using `src="UNSPLASH:<search query>"` placeholders.
# After generation we walk through them, hit the Unsplash search API, and
# swap each placeholder for a real photo URL.

UNSPLASH_PLACEHOLDER_RE = re.compile(r'src="UNSPLASH:([^"]+)"')


def fetch_unsplash_url(query: str) -> Optional[str]:
    """Search Unsplash for a query, return the first photo's regular-size URL."""
    if unsplash_access_key is None:
        return None
    try:
        http_response = requests.get(
            "https://api.unsplash.com/search/photos",
            params={"query": query, "per_page": 1, "orientation": "landscape"},
            headers={"Authorization": f"Client-ID {unsplash_access_key}"},
            timeout=10,
        )
    except requests.RequestException:
        return None
    if http_response.status_code != 200:
        return None
    data = http_response.json()
    results = data.get("results", [])
    if not results:
        return None
    return results[0].get("urls", {}).get("regular")


def replace_unsplash_placeholders(html: str) -> tuple[str, int]:
    """Replace all UNSPLASH: placeholders in the HTML with real photo URLs.

    Returns (updated_html, count_replaced). If a lookup fails, the placeholder
    is replaced with src="" so browsers don't render a broken-image icon.
    """
    placeholders = UNSPLASH_PLACEHOLDER_RE.findall(html)
    if not placeholders:
        return html, 0

    # Deduplicate (Claude sometimes uses the same query twice for the same image).
    unique_queries = list(dict.fromkeys(placeholders))

    # Cache one lookup per unique query.
    url_cache: dict[str, str] = {}
    for query in unique_queries:
        if unsplash_access_key is None:
            url_cache[query] = ""
            continue
        url = fetch_unsplash_url(query)
        url_cache[query] = url or ""

    def _replace(match: re.Match) -> str:
        query = match.group(1)
        url = url_cache.get(query, "")
        return f'src="{url}"'

    new_html = UNSPLASH_PLACEHOLDER_RE.sub(_replace, html)
    return new_html, len(placeholders)


# ---- Skill loader ----
# Reads the SKILL.md files under backend/skills/industries/ and matches one
# to the user's industry input. Returns the body text + the skill name, or
# (None, None) if nothing matches.

SKILLS_DIR = Path(__file__).parent / "skills" / "industries"


def load_matching_skill(industry: str) -> tuple[Optional[str], Optional[str]]:
    """Find the SKILL.md whose 'industries' keyword list overlaps with the
    user's industry input. Returns (body_text, skill_name) or (None, None)."""
    if not industry or not SKILLS_DIR.exists():
        return None, None

    industry_lower = industry.lower()

    for skill_dir in sorted(SKILLS_DIR.iterdir()):
        if not skill_dir.is_dir():
            continue
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue

        try:
            content = skill_file.read_text(encoding="utf-8")
        except Exception:
            continue

        # The file must start with YAML frontmatter delimited by --- on its own line.
        if not content.startswith("---"):
            continue
        end_marker = content.find("\n---", 3)
        if end_marker == -1:
            continue
        frontmatter_text = content[3:end_marker].strip()
        body = content[end_marker:].lstrip("-").strip()

        try:
            frontmatter = yaml.safe_load(frontmatter_text)
        except Exception:
            continue
        if not isinstance(frontmatter, dict):
            continue

        keywords = frontmatter.get("industries") or []
        if not isinstance(keywords, list):
            continue

        # Match if any keyword appears as a substring of the user's industry text.
        for kw in keywords:
            if str(kw).lower() in industry_lower:
                return body, frontmatter.get("name", skill_dir.name)

    return None, None


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
    # Optional inputs — give Claude richer context for higher quality output.
    target_audience: Optional[str] = None
    key_features: Optional[str] = None
    tone: Optional[str] = None


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
        target_audience=request.target_audience,
        key_features=request.key_features,
        tone=request.tone,
    )

    # Look for an industry-specific skill and append it to the system prompt.
    skill_body, skill_name = load_matching_skill(request.industry)
    if skill_body:
        full_system = (
            SYSTEM_PROMPT
            + "\n\n## INDUSTRY-SPECIFIC PATTERNS\n\n"
            + "Apply the following patterns when generating this site:\n\n"
            + skill_body
        )
    else:
        full_system = SYSTEM_PROMPT

    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8000,
            system=full_system,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude error: {e}")

    # The response.content is a list of content blocks; we want the text of the first one.
    raw_text = response.content[0].text if response.content else ""
    html = strip_code_fences(raw_text)

    # Replace UNSPLASH: placeholders with real photo URLs.
    html, image_count = replace_unsplash_placeholders(html)

    return {
        "business_name": request.business_name,
        "industry": request.industry,
        "html": html,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "skill_used": skill_name,  # null if no industry skill matched
        "images_added": image_count,
    }


# ---- Refine endpoint ----
# Takes existing HTML + plain-English feedback, returns updated HTML.
# Different prompt than /api/generate: we want surgical edits, not a redesign.

REFINE_SYSTEM_PROMPT = """You are an expert web designer modifying an existing \
landing page based on specific user feedback.

YOUR JOB:
- Apply ONLY the changes the user requests. Do not redesign things they did not mention.
- If feedback is vague ("make it better"), interpret reasonably while staying close \
to the existing design. Don't drastically restructure unless told to.
- Preserve the existing brand tone, content structure, and information unless the \
feedback specifically asks to change it.

IMAGES:
- The current HTML may contain image URLs from Unsplash already.
- If the user asks to ADD a new image, use this placeholder format:
  <img src="UNSPLASH:<3-6 word search query>" alt="..." class="...">
- The backend swaps UNSPLASH: placeholders for real photos at runtime.
- Don't change existing real image URLs back to placeholders unless the user asks.

OUTPUT REQUIREMENTS:
- Return ONLY raw HTML. No markdown code fences. No commentary. No explanations.
- The output must be a complete valid HTML5 document starting with <!DOCTYPE html> \
and ending with </html>.
- Keep using Tailwind CSS via the CDN: <script src="https://cdn.tailwindcss.com"></script>
- All styling stays as Tailwind utility classes. All JS inline.
- Mobile-responsive."""


class RefineRequest(BaseModel):
    business_name: str
    current_html: str
    feedback: str


@app.post("/api/refine")
def refine(request: RefineRequest):
    """Apply user feedback to an already-generated site."""
    if anthropic_client is None:
        raise HTTPException(
            status_code=500,
            detail="Anthropic API key not configured.",
        )

    user_prompt = (
        f"Modify the following landing page based on the user's feedback.\n\n"
        f"CLIENT BUSINESS: {request.business_name}\n\n"
        f"USER'S FEEDBACK:\n{request.feedback}\n\n"
        f"CURRENT HTML:\n{request.current_html}\n\n"
        f"Output the complete updated HTML. Apply only the requested changes."
    )

    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8000,
            system=REFINE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude error: {e}")

    raw_text = response.content[0].text if response.content else ""
    html = strip_code_fences(raw_text)

    # Apply Unsplash to any new placeholders Claude introduced.
    html, image_count = replace_unsplash_placeholders(html)

    return {
        "business_name": request.business_name,
        "html": html,
        "feedback_applied": request.feedback,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "images_added": image_count,
    }


# ---- Prompt parser endpoint ----
# Takes a free-form natural-language description and extracts structured fields.
# Uses Haiku for speed and cost (~10x cheaper than Sonnet for parsing tasks).

PARSE_SYSTEM_PROMPT = """You extract structured website-builder fields from a \
free-form user request. Return ONLY a JSON object with these exact keys (use \
null for any not specified):

- "url": a reference URL the user mentions (must start with http or https). \
If they only name a brand like "stripe", convert to "https://stripe.com".
- "business_name": the name of the business the user is building for.
- "industry": the type of business (e.g. "coffee shop", "B2B SaaS", "yoga studio").
- "target_audience": who the site is for (a phrase, not a list).
- "key_features": comma-separated features the user mentioned highlighting.
- "tone": MUST be exactly one of these strings, or null:
  "Professional and confident",
  "Warm and friendly",
  "Bold and playful",
  "Luxurious and elegant",
  "Minimal and modern",
  "Casual and approachable".

Output ONLY the JSON object. No markdown code fences. No commentary. No prose."""


class ParsePromptRequest(BaseModel):
    prompt: str


@app.post("/api/parse_prompt")
def parse_prompt(request: ParsePromptRequest):
    """Parse a free-form prompt into structured form fields."""
    if anthropic_client is None:
        raise HTTPException(
            status_code=500,
            detail="Anthropic API key not configured.",
        )

    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            system=PARSE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": request.prompt}],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude error: {e}")

    raw_text = response.content[0].text if response.content else ""
    raw_text = strip_code_fences(raw_text).strip()

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail=f"Couldn't parse model output as JSON: {raw_text[:200]}",
        )

    if not isinstance(data, dict):
        raise HTTPException(status_code=502, detail="Model returned non-object JSON")

    # Sanitize — only return the keys we expect, with consistent shape.
    return {
        "url": data.get("url"),
        "business_name": data.get("business_name"),
        "industry": data.get("industry"),
        "target_audience": data.get("target_audience"),
        "key_features": data.get("key_features"),
        "tone": data.get("tone"),
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
