# firecrawl_service.py — scrape + map a target URL with caching and retry.
#
# Cache rule: skip re-scraping a URL with status='scraped' or 'analyzed' that
# was scraped within the last CACHE_DAYS days. Failures don't get cached as
# success, so they retry next time.
#
# Rate limit: sleep RATE_LIMIT_SECONDS between calls inside scrape_niche to
# stay polite to Firecrawl + the target sites.

import os
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests

from db import get_scrape_result, upsert_scrape_result
from scraper.targets import get_niche_targets, SCRAPE_TARGETS

CACHE_DAYS = 7
RATE_LIMIT_SECONDS = 1.5
MAX_RETRIES = 3
FIRECRAWL_API_BASE = "https://api.firecrawl.dev/v1"

# In-memory progress tracker — read by /api/admin/scrape-status while
# a background scrape job is running.
_active_jobs: dict[str, dict] = {}


# ---- Firecrawl primitives (private) ----

def _firecrawl_scrape(url: str) -> Optional[dict]:
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key or api_key == "PASTE_YOUR_KEY_HERE":
        return None
    try:
        r = requests.post(
            f"{FIRECRAWL_API_BASE}/scrape",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={"url": url, "formats": ["markdown"]},
            timeout=60,
        )
    except requests.RequestException as e:
        print(f"  firecrawl scrape network error for {url}: {e}")
        return None
    if r.status_code != 200:
        print(f"  firecrawl scrape {r.status_code} for {url}: {r.text[:120]}")
        return None
    payload = r.json()
    if not payload.get("success"):
        return None
    data = payload.get("data", {}) or {}
    metadata = data.get("metadata", {}) or {}
    return {
        "markdown": data.get("markdown") or "",
        "title": metadata.get("title") or metadata.get("ogTitle") or "",
        "description": metadata.get("description") or "",
        "metadata": metadata,
    }


def _firecrawl_map(url: str, limit: int = 20) -> list[str]:
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key or api_key == "PASTE_YOUR_KEY_HERE":
        return []
    try:
        r = requests.post(
            f"{FIRECRAWL_API_BASE}/map",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={"url": url, "limit": limit},
            timeout=60,
        )
    except requests.RequestException:
        return []
    if r.status_code != 200:
        return []
    data = r.json()
    return data.get("links", []) if data.get("success") else []


# ---- Cache check ----

def _is_fresh_cache(record: Optional[dict]) -> bool:
    if not record:
        return False
    if record.get("status") not in ("scraped", "analyzed"):
        return False
    scraped_at = record.get("scraped_at")
    if not scraped_at:
        return False
    try:
        ts = datetime.fromisoformat(str(scraped_at).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return False
    return (datetime.now(timezone.utc) - ts) < timedelta(days=CACHE_DAYS)


# ---- Public: single-URL scrape with cache + retry ----

def scrape_one(url: str, niche: str) -> dict:
    """Scrape one URL with caching and retry. Returns a status dict."""
    cached = get_scrape_result(url)
    if _is_fresh_cache(cached):
        return {"url": url, "status": "cached", "niche": niche}

    last_error: Optional[str] = None
    for attempt in range(MAX_RETRIES):
        try:
            scraped = _firecrawl_scrape(url)
            if scraped is None:
                raise RuntimeError("Firecrawl returned no data")

            # Map can be slow — limit it. Skip if scrape worked but map fails.
            try:
                links = _firecrawl_map(url, limit=20)
            except Exception:
                links = []

            payload = {
                "niche": niche,
                "raw_content": {
                    "markdown": scraped["markdown"],
                    "title": scraped["title"],
                    "description": scraped["description"],
                    "internal_links": links[:20],
                },
                "status": "scraped",
                "scraped_at": datetime.now(timezone.utc).isoformat(),
                "error_message": None,
                "retry_count": attempt,
            }
            upsert_scrape_result(url, payload)
            return {"url": url, "status": "scraped", "niche": niche}

        except Exception as e:
            last_error = str(e)
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)  # exponential backoff: 1s, 2s, 4s

    # All retries exhausted — record failure so the dashboard can show it.
    upsert_scrape_result(
        url,
        {
            "niche": niche,
            "status": "failed",
            "error_message": last_error or "unknown",
            "retry_count": MAX_RETRIES,
        },
    )
    return {"url": url, "status": "failed", "niche": niche, "error": last_error}


# ---- Public: scrape a whole niche (background job) ----

def scrape_niche(niche: str) -> None:
    """Scrape every URL for a niche. Designed to be run via FastAPI BackgroundTasks."""
    targets = get_niche_targets(niche)
    if not targets:
        return

    _active_jobs[niche] = {
        "niche": niche,
        "total": len(targets),
        "completed": 0,
        "failed": 0,
        "cached": 0,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "status": "running",
    }

    for url in targets:
        try:
            result = scrape_one(url, niche)
            if result["status"] == "scraped":
                _active_jobs[niche]["completed"] += 1
            elif result["status"] == "cached":
                _active_jobs[niche]["cached"] += 1
            else:
                _active_jobs[niche]["failed"] += 1
        except Exception as e:
            print(f"scrape_niche unhandled error for {url}: {e}")
            _active_jobs[niche]["failed"] += 1

        time.sleep(RATE_LIMIT_SECONDS)

    _active_jobs[niche]["status"] = "done"
    _active_jobs[niche]["finished_at"] = datetime.now(timezone.utc).isoformat()


def get_active_jobs() -> dict[str, dict]:
    return dict(_active_jobs)


def clear_finished_jobs() -> None:
    """Remove done jobs from the in-memory tracker."""
    for niche in list(_active_jobs.keys()):
        if _active_jobs[niche].get("status") == "done":
            del _active_jobs[niche]
