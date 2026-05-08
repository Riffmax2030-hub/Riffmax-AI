# analyze_patterns.py — turn raw scrape data into structured patterns,
# then aggregate per-niche profiles into niche_patterns.
#
# Two phases:
#   1. analyze_one / analyze_niche — Haiku reads each scrape row's raw_content
#      and returns a JSON object describing the patterns. Saved to
#      scrape_results.analyzed_data, status flips from 'scraped' → 'analyzed'.
#   2. aggregate_niche — reads every analyzed row for a niche and writes a
#      single niche_patterns row with top headlines, CTAs, color mood, tone.

import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Optional

from anthropic import Anthropic

from db import get_client, upsert_niche_pattern, upsert_scrape_result

ANALYZE_SYSTEM_PROMPT = """You are a web design analyst. Given the scraped content of a website, extract structured patterns and return ONLY a JSON object with these exact keys (use snake_case):

{
  "primary_headline_style": "bold-claim" | "question" | "benefit-led" | "name-led",
  "primary_headline_text": "the actual headline text from the hero section, or empty string",
  "cta_style": "action-verb" | "urgency" | "benefit" | "social",
  "cta_texts": ["array of 1-3 actual CTA button labels found on the page"],
  "social_proof_type": "logos" | "testimonials" | "numbers" | "awards" | "none",
  "layout_pattern": "hero-features-pricing" | "hero-social-cta" | "story-led" | "product-led",
  "tone_keywords": ["array of exactly 5 single-word adjectives describing the brand voice"],
  "color_mood": "dark" | "light" | "colorful" | "monochrome" | "gradient",
  "animation_level": "none" | "subtle" | "heavy",
  "mobile_first": true_or_false_boolean,
  "trust_signals": ["array of trust elements found, e.g. 'SOC 2', 'Used by Fortune 500'"],
  "unique_hook": "one sentence describing what makes this site distinctive"
}

Output ONLY the JSON object. No markdown code fences. No prose. No commentary."""

# In-memory tracker for analyze jobs.
_analyze_jobs: dict[str, dict] = {}


def _get_anthropic() -> Optional[Anthropic]:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key or key == "PASTE_YOUR_KEY_HERE":
        return None
    return Anthropic(api_key=key)


def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


# ---- Phase 1: analyze each scraped row ----

def analyze_one(record: dict) -> Optional[dict]:
    """Analyze a single scrape_results row. Returns the analyzed JSON or None."""
    anthropic_client = _get_anthropic()
    if anthropic_client is None:
        return None

    raw_content = record.get("raw_content") or {}
    markdown = (raw_content.get("markdown") or "")[:5000]
    title = raw_content.get("title", "")
    description = raw_content.get("description", "")
    niche = record.get("niche", "")
    url = record.get("url", "")

    if not markdown:
        return None

    user_prompt = (
        f"Analyze this {niche} website.\n"
        f"URL: {url}\n"
        f"Title: {title}\n"
        f"Description: {description}\n\n"
        f"Content (first 5000 chars of markdown):\n"
        f"{markdown}\n\n"
        f"Return only the JSON object."
    )

    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=900,
            system=ANALYZE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except Exception as e:
        print(f"  analyze_one Anthropic error for {url}: {e}")
        return None

    raw_text = response.content[0].text if response.content else ""
    cleaned = _strip_fences(raw_text)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"  analyze_one bad JSON for {url}: {cleaned[:200]}")
        return None
    if not isinstance(data, dict):
        return None

    upsert_scrape_result(
        url,
        {
            "niche": niche,
            "analyzed_data": data,
            "status": "analyzed",
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    return data


def analyze_niche(niche: str) -> None:
    """Analyze every 'scraped' row in a niche. Background-task entry point."""
    client = get_client()
    if client is None:
        return

    try:
        result = (
            client.table("scrape_results")
            .select("*")
            .eq("niche", niche)
            .eq("status", "scraped")
            .execute()
        )
        rows = result.data or []
    except Exception as e:
        print(f"analyze_niche fetch error: {e}")
        return

    _analyze_jobs[niche] = {
        "niche": niche,
        "total": len(rows),
        "completed": 0,
        "failed": 0,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "status": "running",
    }

    for row in rows:
        try:
            ok = analyze_one(row)
            if ok:
                _analyze_jobs[niche]["completed"] += 1
            else:
                _analyze_jobs[niche]["failed"] += 1
        except Exception as e:
            print(f"analyze_niche unexpected error: {e}")
            _analyze_jobs[niche]["failed"] += 1
        time.sleep(0.5)  # rate-limit Anthropic

    _analyze_jobs[niche]["status"] = "done"
    _analyze_jobs[niche]["finished_at"] = datetime.now(timezone.utc).isoformat()


# ---- Phase 2: aggregate per-niche ----

def _top_n(counter: dict[str, int], n: int) -> list[str]:
    return [k for k, _ in sorted(counter.items(), key=lambda x: -x[1])[:n]]


def aggregate_niche(niche: str) -> Optional[dict]:
    """Read all 'analyzed' rows for a niche, compose niche_patterns row, save."""
    client = get_client()
    if client is None:
        return None
    try:
        result = (
            client.table("scrape_results")
            .select("*")
            .eq("niche", niche)
            .eq("status", "analyzed")
            .execute()
        )
        rows = result.data or []
    except Exception as e:
        print(f"aggregate_niche fetch error: {e}")
        return None

    if not rows:
        return None

    headlines: list[str] = []
    cta_texts: list[str] = []
    layout_counts: dict[str, int] = {}
    color_counts: dict[str, int] = {}
    tone_counts: dict[str, int] = {}
    trust_signals: list[str] = []
    hooks: list[str] = []

    for row in rows:
        data = row.get("analyzed_data") or {}
        headline = data.get("primary_headline_text")
        if headline and isinstance(headline, str):
            headlines.append(headline)
        for cta in (data.get("cta_texts") or []):
            if isinstance(cta, str) and cta.strip():
                cta_texts.append(cta)
        layout = data.get("layout_pattern")
        if layout:
            layout_counts[str(layout)] = layout_counts.get(str(layout), 0) + 1
        color = data.get("color_mood")
        if color:
            color_counts[str(color)] = color_counts.get(str(color), 0) + 1
        for tone in (data.get("tone_keywords") or []):
            if isinstance(tone, str) and tone.strip():
                tone_counts[tone.lower()] = tone_counts.get(tone.lower(), 0) + 1
        for sig in (data.get("trust_signals") or []):
            if isinstance(sig, str) and sig.strip():
                trust_signals.append(sig)
        hook = data.get("unique_hook")
        if hook and isinstance(hook, str):
            hooks.append(hook)

    aggregated: dict[str, Any] = {
        "sites_analyzed": len(rows),
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "top_headlines": headlines[:10],
        "top_cta_texts": list(dict.fromkeys(cta_texts))[:10],  # dedupe
        "recommended_sections": _top_n(layout_counts, 3),
        "color_recommendations": {
            "top_moods": _top_n(color_counts, 3),
            "distribution": color_counts,
        },
        "tone_profile": ", ".join(_top_n(tone_counts, 5)) or None,
        "pattern_data": {
            "layout_distribution": layout_counts,
            "color_distribution": color_counts,
            "tone_distribution": tone_counts,
            "trust_signals": list(dict.fromkeys(trust_signals))[:20],
            "unique_hooks": hooks[:10],
        },
    }

    upsert_niche_pattern(niche, aggregated)
    return aggregated


def get_analyze_jobs() -> dict[str, dict]:
    return dict(_analyze_jobs)
