# main.py — Riffmax AI backend.
# Single-shot multi-page website builder using Firecrawl + Claude + Unsplash.

import json
import os
import re
import requests
import yaml
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from anthropic import Anthropic

from db import get_client as get_supabase, list_scrape_results
from scraper.firecrawl_service import (
    scrape_niche as run_scrape_niche,
    scrape_one as run_scrape_one,
    get_active_jobs,
    clear_finished_jobs,
)
from scraper.targets import SCRAPE_TARGETS, get_all_niches, total_target_count

load_dotenv()

app = FastAPI(title="Riffmax AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- API keys / clients ----

firecrawl_api_key = os.getenv("FIRECRAWL_API_KEY")
if not firecrawl_api_key or firecrawl_api_key == "PASTE_YOUR_KEY_HERE":
    print("WARNING: FIRECRAWL_API_KEY is missing.")
    firecrawl_api_key = None

anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
if not anthropic_api_key or anthropic_api_key == "PASTE_YOUR_KEY_HERE":
    print("WARNING: ANTHROPIC_API_KEY is missing.")
    anthropic_client = None
else:
    anthropic_client = Anthropic(api_key=anthropic_api_key)

vercel_token = os.getenv("VERCEL_TOKEN")
if not vercel_token or vercel_token == "PASTE_YOUR_KEY_HERE":
    print("WARNING: VERCEL_TOKEN is missing.")
    vercel_token = None

unsplash_access_key = os.getenv("UNSPLASH_ACCESS_KEY")
if not unsplash_access_key or unsplash_access_key == "PASTE_YOUR_KEY_HERE":
    print("WARNING: UNSPLASH_ACCESS_KEY is missing.")
    unsplash_access_key = None


# ---- Generic helpers ----

def strip_code_fences(text: str) -> str:
    """Strip ```html ... ``` wrappers if Claude added them."""
    text = text.strip()
    text = re.sub(r"^```(?:html)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def slugify_for_vercel(name: str) -> str:
    """Vercel project names: lowercase, alphanumeric+hyphens, max 52 chars."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        slug = "site"
    return f"sb-{slug}"[:52]


# ---- Skill loader ----

SKILLS_DIR = Path(__file__).parent / "skills" / "industries"


def load_matching_skill(industry: str) -> tuple[Optional[str], Optional[str]]:
    """Match industry input to a SKILL.md, return (body, name) or (None, None)."""
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
        if not content.startswith("---"):
            continue
        end = content.find("\n---", 3)
        if end == -1:
            continue
        try:
            frontmatter = yaml.safe_load(content[3:end].strip())
        except Exception:
            continue
        if not isinstance(frontmatter, dict):
            continue
        keywords = frontmatter.get("industries") or []
        if not isinstance(keywords, list):
            continue
        for kw in keywords:
            if str(kw).lower() in industry_lower:
                body = content[end:].lstrip("-").strip()
                return body, frontmatter.get("name", skill_dir.name)
    return None, None


# ---- Unsplash placeholder replacement ----

UNSPLASH_PLACEHOLDER_RE = re.compile(r'src="UNSPLASH:([^"]+)"')


def fetch_unsplash_url(query: str) -> Optional[str]:
    if unsplash_access_key is None:
        return None
    try:
        r = requests.get(
            "https://api.unsplash.com/search/photos",
            params={"query": query, "per_page": 1, "orientation": "landscape"},
            headers={"Authorization": f"Client-ID {unsplash_access_key}"},
            timeout=10,
        )
    except requests.RequestException:
        return None
    if r.status_code != 200:
        return None
    results = r.json().get("results", [])
    if not results:
        return None
    return results[0].get("urls", {}).get("regular")


def replace_unsplash_placeholders(html: str) -> tuple[str, int]:
    placeholders = UNSPLASH_PLACEHOLDER_RE.findall(html)
    if not placeholders:
        return html, 0
    cache: dict[str, str] = {}
    for q in dict.fromkeys(placeholders):
        cache[q] = fetch_unsplash_url(q) or ""
    new_html = UNSPLASH_PLACEHOLDER_RE.sub(
        lambda m: f'src="{cache.get(m.group(1), "")}"', html
    )
    return new_html, len(placeholders)


# ---- Firecrawl helpers ----

def firecrawl_map(url: str, limit: int = 30) -> list[str]:
    """Get a list of URLs on the site via Firecrawl's map endpoint."""
    if firecrawl_api_key is None:
        return []
    try:
        r = requests.post(
            "https://api.firecrawl.dev/v1/map",
            headers={
                "Authorization": f"Bearer {firecrawl_api_key}",
                "Content-Type": "application/json",
            },
            json={"url": url, "limit": limit},
            timeout=60,
        )
    except requests.RequestException as e:
        print(f"Firecrawl map error: {e}")
        return []
    if r.status_code != 200:
        return []
    data = r.json()
    if not data.get("success"):
        return []
    return data.get("links", []) or []


def firecrawl_scrape(url: str) -> Optional[dict]:
    """Scrape a single URL with Firecrawl. Returns {markdown, title} or None."""
    if firecrawl_api_key is None:
        return None
    try:
        r = requests.post(
            "https://api.firecrawl.dev/v1/scrape",
            headers={
                "Authorization": f"Bearer {firecrawl_api_key}",
                "Content-Type": "application/json",
            },
            json={"url": url, "formats": ["markdown"]},
            timeout=60,
        )
    except requests.RequestException as e:
        print(f"Firecrawl scrape error for {url}: {e}")
        return None
    if r.status_code != 200:
        return None
    payload = r.json()
    if not payload.get("success"):
        return None
    data = payload.get("data", {}) or {}
    metadata = data.get("metadata", {}) or {}
    return {
        "markdown": data.get("markdown") or "",
        "title": metadata.get("title") or metadata.get("ogTitle") or "",
    }


def pick_important_pages(urls: list[str], base_url: str, max_pages: int = 4) -> list[str]:
    """From a sitemap, pick the most important pages to scrape."""
    keyword_priority = [
        ("about", 90), ("services", 85), ("products", 85),
        ("features", 80), ("pricing", 75), ("contact", 70),
        ("how-it-works", 65), ("solutions", 65), ("team", 55),
    ]
    skip_patterns = [
        "blog", "/archive", "/news", "privacy", "terms", "legal",
        "cookie", ".pdf", "?", "#", "/tag/", "/category/", "login",
        "signup", "register", "auth",
    ]

    base_clean = base_url.rstrip("/")
    scored: list[tuple[int, str]] = []

    for url in urls:
        if not url:
            continue
        if any(s in url.lower() for s in skip_patterns):
            continue
        path = url.replace(base_clean, "").lower().strip("/")
        # Always include the root with highest priority
        if path == "":
            scored.append((100, url))
            continue
        # Skip deeper than 2 levels
        if path.count("/") > 1:
            continue
        score = 50
        for keyword, weight in keyword_priority:
            if keyword in path:
                score = weight
                break
        scored.append((score, url))

    scored.sort(reverse=True)
    seen = set()
    picked = []
    for _, url in scored:
        if url in seen:
            continue
        seen.add(url)
        picked.append(url)
        if len(picked) >= max_pages:
            break
    return picked


def slug_for_page(url: str, base_url: str) -> str:
    """Turn a URL into a short slug for the page (index, about, services, etc.)."""
    path = url.replace(base_url.rstrip("/"), "").strip("/").lower()
    if not path:
        return "index"
    # take the first segment, sanitize
    slug = path.split("/")[0]
    slug = re.sub(r"[^a-z0-9-]+", "-", slug).strip("-")
    return slug or "page"


# ---- Description parser (Haiku) ----

PARSE_SYSTEM_PROMPT = """Extract structured fields from a free-form website-building request.
Return ONLY a JSON object with these keys (use null if not specified):

- "business_name": the business name
- "industry": the type of business
- "target_audience": who the site is for (a phrase)
- "key_features": comma-separated features to highlight
- "tone": one of these exact strings or null:
  "Professional and confident",
  "Warm and friendly",
  "Bold and playful",
  "Luxurious and elegant",
  "Minimal and modern",
  "Casual and approachable"

Output ONLY the JSON. No markdown fences. No commentary."""


def parse_description(description: str) -> dict:
    if anthropic_client is None or not description.strip():
        return {}
    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            system=PARSE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": description}],
        )
    except Exception as e:
        print(f"Description parse error: {e}")
        return {}
    raw = response.content[0].text if response.content else ""
    raw = strip_code_fences(raw).strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


# ---- Multi-page generation ----

BUILD_SYSTEM_PROMPT = """You are an expert web designer building a multi-page website.

OUTPUT FORMAT — STRICT:
Return multiple complete HTML files separated by <<<PAGE: slug>>> markers.
Each page is a full <!DOCTYPE html>...</html> document.
Begin your output directly with the first <<<PAGE: ...>>> marker. No preamble.

Example shape:
<<<PAGE: index>>>
<!DOCTYPE html>
...
</html>

<<<PAGE: about>>>
<!DOCTYPE html>
...
</html>

REQUIREMENTS:
- Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- All styling = Tailwind utility classes. All JS inline.
- Mobile-responsive.
- Every page shares the same top nav and footer (manually duplicated, since no JS framework).
- Nav links use relative paths: index.html, about.html, services.html, contact.html, etc.
- Highlight the current page in the nav (different color or weight).
- Use UNSPLASH:<3-6 word query> placeholders for photos. Backend swaps them at runtime.
- 2-5 image placeholders per page max.

INSPIRATION, NOT IMITATION (very important):
- The reference brief describes a site the client admires.
- Learn its STRUCTURE and TONE — same kinds of sections, same content rhythm.
- But pick a DIFFERENT color palette, DIFFERENT typography pairings, DIFFERENT visual identity.
- Original copy throughout. Never copy text from the reference.
- Goal: a designer who saw both sites would say they share design philosophy but feel like distinct brands.

DESIGN PRINCIPLES:
- Strong hero on index with clear headline + primary CTA
- Logical section flow on every page
- Modern aesthetics: ample whitespace, hierarchy, contrast, subtle hover transitions
- Inline SVG for icons
- Consistent color palette across all pages

Output ONLY the pages. No commentary. No markdown fences. Begin with <<<PAGE: index>>>."""


def build_user_prompt(parsed: dict, reference_url: str, reference_pages: list[dict]) -> str:
    """Compose the user prompt for multi-page generation."""
    pages_summary = []
    for p in reference_pages:
        sections = ", ".join(p.get("section_headings", [])[:5]) or "(no sections detected)"
        pages_summary.append(
            f"- {p['slug']} ({p['name']}): hero='{p.get('hero_headline') or 'N/A'}' | sections: {sections}"
        )
    pages_block = "\n".join(pages_summary) or "(no pages mapped)"

    business_name = parsed.get("business_name") or "the business"
    industry = parsed.get("industry") or "general"

    optional_lines = []
    if parsed.get("target_audience"):
        optional_lines.append(f"- Target audience: {parsed['target_audience']}")
    if parsed.get("key_features"):
        optional_lines.append(f"- Key features to highlight: {parsed['key_features']}")
    if parsed.get("tone"):
        optional_lines.append(f"- Tone preference: {parsed['tone']}")
    optional_block = "\n".join(optional_lines)

    return f"""Generate a multi-page website for this client.

CLIENT BUSINESS:
- Name: {business_name}
- Industry: {industry}
{optional_block}

REFERENCE SITE (inspiration only — do NOT copy):
- URL: {reference_url}
- Pages found and their structure:
{pages_block}

PAGES TO GENERATE:
Generate one HTML page for EACH page listed above, using <<<PAGE: slug>>> markers.
Include the same set of slugs (typically: index, about, services, contact — whichever the reference has).
Apply a SIMILAR layout philosophy but a DIFFERENT visual identity (different colors, fonts, illustrations).
Original copy throughout.

Output the pages now."""


# Template styles — visual + structural guidance Claude follows when the user picks one.
TEMPLATES: dict[str, dict[str, str]] = {
    "saas": {
        "name": "SaaS / Tech",
        "guidance": """Apply SaaS landing patterns:
- Hero with clear product category line + benefit headline + dual CTAs ("Start free" / "Watch demo")
- Logo wall ("Trusted by teams at..." — invent realistic but clearly placeholder names)
- Three-pillar features (benefit-led, not feature-led)
- One deeper feature explainer with a clean UI mockup (use SVG, not real screenshots)
- Social proof (one testimonial with name + company + role)
- Pricing teaser or comparison
- Final CTA with reassurance ("No credit card required")
- Color: white/near-white background, one strong accent (indigo/blue/violet)
- Typography: modern geometric sans, big hero font (60-80px), tight line-height
- Tone: direct, technical, evidence-based — quantify everything""",
    },
    "restaurant": {
        "name": "Restaurant / Food",
        "guidance": """Apply restaurant landing patterns:
- Hero with large food photography (UNSPLASH placeholder), restaurant name prominent, location subtitle
- CTAs: "Reserve a table" (primary), "View menu" (secondary), phone number visible
- Welcome/story section (chef name, cuisine philosophy, distinct angle — short)
- Menu highlights (4-8 signature dishes with photos and prices, names larger than descriptions)
- Atmosphere section (interior photos)
- Visit/hours block with address and map placeholder
- Reviews quoted from critics or customers
- Color: warm tones (terracotta, deep red, mustard, forest green) OR upscale (navy/gold/ivory) — never stark white
- Typography: editorial serif headlines, sans body
- Tone: sensory and inviting, never corporate""",
    },
    "portfolio": {
        "name": "Portfolio / Freelancer",
        "guidance": """Apply portfolio landing patterns:
- Hero: name + role/specialty + 1-line intro + primary CTA ("Book a call" / "See work")
- Selected work grid (4-9 projects with cover images and brief descriptions)
- Services or skills section (3-5 offerings)
- About me with portrait photo
- Testimonials from past clients (real-feeling names + roles)
- Contact section with email and Calendly-like CTA
- Color: minimal — black/white/cream with ONE accent — OR bold creative palette
- Typography: editorial display headlines, clean body
- Tone: confident but not boastful, personal, specific
- Whitespace-heavy. Work images dominate.""",
    },
    "ecommerce": {
        "name": "E-commerce / DTC",
        "guidance": """Apply DTC e-commerce landing patterns:
- Hero: lifestyle or product hero photo, brand promise headline, "Shop Now" CTA
- Featured products grid (3-6 items, each with photo, name, price, "Add to cart" button)
- Brand story / why-we-exist section
- Customer reviews with photos and star ratings
- Trust badges row (free shipping, returns, guarantee)
- Newsletter signup with discount incentive
- Color: brand-distinctive, often bold and saturated
- Typography: modern, punchy headlines
- Tone: enthusiastic, product-led, direct
- Trust signals visible above-the-fold""",
    },
    "lawfirm": {
        "name": "Law Firm / Pro Services",
        "guidance": """Apply law firm and professional-services patterns:
- Hero: trust-led headline, firm specialty stated clearly, "Schedule a Consultation" CTA
- Practice areas (4-8 cards with brief descriptions)
- Attorneys/team section with portraits and short bios
- Case results / representative matters (without confidential client names)
- About the firm / values block
- Contact with office addresses, phone, hours
- Color: navy, burgundy, charcoal, gold, ivory — NEVER bright primaries or playful palettes
- Typography: serif headlines (editorial gravitas), sans body
- Tone: authoritative, calm, precise — never aggressive sales pitch
- Avoid stock business cliches. Imagine real attorney portraits.""",
    },
    "startup": {
        "name": "Startup / App Launch",
        "guidance": """Apply startup and app-launch landing patterns:
- Hero: app screenshot or mockup (use clean SVG), benefit headline, "Get Early Access" CTA
- "Coming soon" badge or waitlist count to create momentum
- Three-pillar features with bold iconography
- How-it-works (3-step explainer with numbers)
- Founders/team with photos and 1-line bios
- Press mentions or "as seen in" row (use realistic placeholder logos)
- Email signup form as the main conversion event
- Color: bold, modern — often gradient accents (indigo→violet, teal→blue, etc.)
- Typography: punchy hero, friendly body
- Tone: ambitious, confident, slightly playful
- Large tap targets — feels mobile-first even on desktop""",
    },
}


PAGE_SPLIT_RE = re.compile(r"<<<PAGE:\s*([\w-]+)\s*>>>")


def parse_multi_page_output(text: str) -> list[dict]:
    """Split Claude's output by <<<PAGE: slug>>> markers into a list of pages."""
    parts = PAGE_SPLIT_RE.split(text)
    pages: list[dict] = []
    # parts looks like ['', 'index', 'html...', 'about', 'html...']
    for i in range(1, len(parts) - 1, 2):
        slug = parts[i].strip()
        html = strip_code_fences(parts[i + 1].strip())
        if html and slug:
            pages.append({
                "slug": slug,
                "name": slug.replace("-", " ").replace("_", " ").title(),
                "html": html,
            })
    # Ensure 'index' is first
    pages.sort(key=lambda p: 0 if p["slug"] == "index" else 1)
    return pages


# ---- Endpoints ----

@app.get("/")
def root():
    return {"message": "Riffmax AI backend is alive."}


@app.get("/api/hello")
def hello():
    return {"message": "Backend is alive and connected.", "status": "ok"}


# ============================================================
# Admin endpoints — protected by ADMIN_SECRET header.
# Used by the upcoming /admin/scraper dashboard (Phase 11.D).
# ============================================================

def require_admin(x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret")):
    expected = os.getenv("ADMIN_SECRET")
    if not expected or expected == "PASTE_A_RANDOM_SECRET_HERE":
        raise HTTPException(
            status_code=503,
            detail="Admin disabled — ADMIN_SECRET not set in backend/.env",
        )
    if x_admin_secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    return True


@app.get("/api/admin/db-health")
def admin_db_health(_=Depends(require_admin)):
    """Quick check that Supabase is reachable + tables exist."""
    client = get_supabase()
    if client is None:
        return {"ok": False, "reason": "Supabase client not configured"}
    try:
        client.table("niche_patterns").select("id").limit(1).execute()
        client.table("scrape_results").select("id").limit(1).execute()
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "reason": str(e)}


@app.get("/api/admin/niches")
def admin_list_niches(_=Depends(require_admin)):
    """List all niches with their target counts and recent scrape stats."""
    niches = []
    for niche in get_all_niches():
        targets = SCRAPE_TARGETS[niche]
        results = list_scrape_results(niche=niche)
        scraped = sum(1 for r in results if r.get("status") in ("scraped", "analyzed"))
        failed = sum(1 for r in results if r.get("status") == "failed")
        niches.append({
            "slug": niche,
            "target_count": len(targets),
            "scraped_count": scraped,
            "failed_count": failed,
        })
    return {"niches": niches, "total_targets": total_target_count()}


@app.get("/api/admin/scrape-status")
def admin_scrape_status(_=Depends(require_admin)):
    """In-progress jobs (in-memory) plus most-recent rows from scrape_results."""
    jobs = get_active_jobs()
    recent = list_scrape_results()[:30]
    # Strip raw_content from the response — too big for an admin overview.
    recent_summary = [
        {
            "url": r.get("url"),
            "niche": r.get("niche"),
            "status": r.get("status"),
            "scraped_at": r.get("scraped_at"),
            "error_message": r.get("error_message"),
        }
        for r in recent
    ]
    return {"active_jobs": jobs, "recent": recent_summary}


@app.post("/api/admin/scrape-niche/{niche}")
def admin_scrape_niche(
    niche: str,
    background_tasks: BackgroundTasks,
    _=Depends(require_admin),
):
    """Kick off a background scrape job for an entire niche. Returns immediately."""
    if niche not in SCRAPE_TARGETS:
        raise HTTPException(status_code=404, detail=f"Unknown niche: {niche}")
    background_tasks.add_task(run_scrape_niche, niche)
    return {
        "status": "started",
        "niche": niche,
        "target_count": len(SCRAPE_TARGETS[niche]),
        "message": "Scraping in background. Poll /api/admin/scrape-status to track progress.",
    }


class ScrapeOneRequest(BaseModel):
    url: str
    niche: str


@app.post("/api/admin/scrape-url")
def admin_scrape_one(request: ScrapeOneRequest, _=Depends(require_admin)):
    """Scrape a single URL synchronously. Useful for testing or one-offs."""
    result = run_scrape_one(request.url, request.niche)
    return result


@app.post("/api/admin/clear-finished-jobs")
def admin_clear_finished(_=Depends(require_admin)):
    clear_finished_jobs()
    return {"ok": True}


# === BUILD: the main flow ===

class BuildRequest(BaseModel):
    description: str
    reference_url: str
    template: Optional[str] = None  # one of TEMPLATES keys, or None


@app.post("/api/build")
def build(request: BuildRequest):
    """Single-shot multi-page website build.

    1. Parse free-form description into structured fields (Haiku).
    2. Map the reference site to discover pages (Firecrawl).
    3. Pick the most important pages and scrape them (Firecrawl).
    4. Build a multi-page brief.
    5. Generate all pages with Claude in one call (Sonnet).
    6. Replace UNSPLASH: placeholders with real photos.
    7. Return the bundle.
    """
    if anthropic_client is None:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured.")
    if firecrawl_api_key is None:
        raise HTTPException(status_code=500, detail="Firecrawl API key not configured.")
    if not request.reference_url.strip():
        raise HTTPException(status_code=400, detail="Reference URL is required.")

    # 1. Parse description
    parsed = parse_description(request.description)

    # 2. Map the reference site
    all_urls = firecrawl_map(request.reference_url, limit=30)

    # 3. Pick important pages, scrape each
    important = pick_important_pages(all_urls, request.reference_url, max_pages=4)
    if not important:
        # Fall back to scraping just the root URL
        important = [request.reference_url]

    reference_pages = []
    for url in important:
        scraped = firecrawl_scrape(url)
        if scraped is None:
            continue
        markdown = scraped["markdown"]
        title = scraped["title"]
        # Pull section headings from markdown
        h2s = [
            re.sub(r"\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_", lambda m: m.group(1) or m.group(2) or m.group(3), h)
            for h in re.findall(r"^## (.+)$", markdown, re.MULTILINE)
        ]
        h1_match = re.search(r"^# (.+)$", markdown, re.MULTILINE)
        hero_headline = h1_match.group(1).strip() if h1_match else None
        reference_pages.append({
            "url": url,
            "slug": slug_for_page(url, request.reference_url),
            "name": title or slug_for_page(url, request.reference_url).title(),
            "hero_headline": hero_headline,
            "section_headings": list(dict.fromkeys(h2s))[:8],
        })

    if not reference_pages:
        raise HTTPException(
            status_code=502,
            detail="Couldn't extract any usable pages from the reference site.",
        )

    # 4 → 5. Generate all pages with Claude
    user_prompt = build_user_prompt(parsed, request.reference_url, reference_pages)

    # Compose the system prompt. Skill (industry copy patterns) and Template
    # (visual layout style) are orthogonal — both can apply.
    full_system = BUILD_SYSTEM_PROMPT

    template_meta = TEMPLATES.get(request.template) if request.template else None
    if template_meta:
        full_system += (
            "\n\n## TEMPLATE STYLE\n\n"
            + f"User chose the '{template_meta['name']}' template. "
            + template_meta["guidance"]
        )

    skill_body, skill_name = load_matching_skill(parsed.get("industry") or "")
    if skill_body:
        full_system += (
            "\n\n## INDUSTRY-SPECIFIC PATTERNS\n\nApply the following patterns:\n\n"
            + skill_body
        )

    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=24000,
            system=full_system,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude error: {e}")

    raw_text = response.content[0].text if response.content else ""

    pages = parse_multi_page_output(raw_text)
    if not pages:
        raise HTTPException(
            status_code=502,
            detail="Couldn't parse pages from the model output. Try again.",
        )

    # 6. Apply Unsplash to each page
    total_images = 0
    for p in pages:
        new_html, n = replace_unsplash_placeholders(p["html"])
        p["html"] = new_html
        total_images += n

    return {
        "business_name": parsed.get("business_name") or "Untitled",
        "industry": parsed.get("industry") or "general",
        "reference_url": request.reference_url,
        "reference_pages_found": [p["slug"] for p in reference_pages],
        "pages": pages,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "skill_used": skill_name,
        "template_used": template_meta["name"] if template_meta else None,
        "images_added": total_images,
    }


# === LIST TEMPLATES ===
# Lets the frontend ask the backend what templates exist (instead of hardcoding).

@app.get("/api/templates")
def list_templates():
    return {
        "templates": [
            {"slug": slug, "name": meta["name"]}
            for slug, meta in TEMPLATES.items()
        ]
    }


# === REFINE: surgical edits to one page ===

REFINE_SYSTEM_PROMPT = """You are an expert web designer modifying a single page of a multi-page website based on user feedback.

YOUR JOB:
- Apply ONLY the changes the user requests. Don't redesign things they didn't mention.
- Preserve the existing nav, footer, brand colors, and overall structure unless asked to change.
- For new images, use <img src="UNSPLASH:<query>" alt="..." class="..."> placeholders.

OUTPUT REQUIREMENTS:
- Return ONLY raw HTML — no fences, no commentary.
- Complete HTML5 document, <!DOCTYPE html> ... </html>.
- Tailwind via CDN. All inline styling. Mobile-responsive."""


class RefineRequest(BaseModel):
    business_name: str
    current_html: str
    feedback: str


@app.post("/api/refine")
def refine(request: RefineRequest):
    if anthropic_client is None:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured.")

    user_prompt = (
        f"Modify this page based on feedback.\n\n"
        f"CLIENT: {request.business_name}\n\n"
        f"FEEDBACK:\n{request.feedback}\n\n"
        f"CURRENT HTML:\n{request.current_html}\n\n"
        f"Output the complete updated HTML."
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

    raw = response.content[0].text if response.content else ""
    html = strip_code_fences(raw)
    html, image_count = replace_unsplash_placeholders(html)

    return {
        "html": html,
        "feedback_applied": request.feedback,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "images_added": image_count,
    }


# === DEPLOY: push pages to Vercel ===

class DeployRequest(BaseModel):
    business_name: str
    pages: list[dict]  # each: {slug, html}


@app.post("/api/deploy")
def deploy(request: DeployRequest):
    if vercel_token is None:
        raise HTTPException(status_code=500, detail="Vercel token not configured.")
    if not request.pages:
        raise HTTPException(status_code=400, detail="No pages to deploy.")

    # Build the file list. Vercel expects index.html as the homepage.
    files = []
    seen = set()
    has_index = any(p["slug"] == "index" for p in request.pages)
    for i, p in enumerate(request.pages):
        slug = p["slug"]
        # If there's no 'index' slug, promote the first page to index.html.
        if not has_index and i == 0:
            file_name = "index.html"
        else:
            file_name = f"{slug}.html" if slug != "index" else "index.html"
        if file_name in seen:
            continue
        seen.add(file_name)
        files.append({"file": file_name, "data": p["html"], "encoding": "utf-8"})

    project_name = slugify_for_vercel(request.business_name)
    payload = {
        "name": project_name,
        "files": files,
        "projectSettings": {"framework": None},
        "target": "production",
    }

    try:
        r = requests.post(
            "https://api.vercel.com/v13/deployments",
            headers={
                "Authorization": f"Bearer {vercel_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=120,
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Vercel error: {e}")

    if r.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Vercel returned {r.status_code}: {r.text[:300]}")

    data = r.json()
    host = data.get("url")
    if not host:
        raise HTTPException(status_code=502, detail="Vercel didn't return a URL.")

    return {
        "live_url": f"https://{host}",
        "deployment_id": data.get("id"),
        "project_name": project_name,
        "page_count": len(files),
    }
