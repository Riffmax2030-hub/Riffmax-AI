# db.py — Supabase client wrapper for the Riffmax backend.
#
# We use the SERVICE-ROLE key (not the anon key) because all writes happen
# server-side and the service key bypasses Row Level Security. The service
# key MUST never leave the backend — never include it in the frontend bundle.

import os
from typing import Optional, Any
from supabase import create_client, Client

_supabase: Optional[Client] = None


def get_client() -> Optional[Client]:
    """Lazy-initialize the Supabase client. Returns None if env not set."""
    global _supabase
    if _supabase is not None:
        return _supabase

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or url == "PASTE_YOUR_URL_HERE":
        print("WARNING: SUPABASE_URL not set. Pattern DB disabled.")
        return None
    if not key or key == "PASTE_YOUR_KEY_HERE":
        print("WARNING: SUPABASE_SERVICE_KEY not set. Pattern DB disabled.")
        return None

    try:
        _supabase = create_client(url, key)
        return _supabase
    except Exception as e:
        print(f"WARNING: Supabase client init failed: {e}")
        return None


# ---- niche_patterns ----

def get_niche_pattern(niche: str) -> Optional[dict[str, Any]]:
    """Look up the aggregated pattern profile for a niche."""
    client = get_client()
    if client is None:
        return None
    try:
        result = (
            client.table("niche_patterns")
            .select("*")
            .eq("niche", niche)
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None
    except Exception as e:
        print(f"get_niche_pattern error: {e}")
        return None


def upsert_niche_pattern(niche: str, fields: dict[str, Any]) -> bool:
    client = get_client()
    if client is None:
        return False
    try:
        payload = {"niche": niche, **fields}
        client.table("niche_patterns").upsert(payload, on_conflict="niche").execute()
        return True
    except Exception as e:
        print(f"upsert_niche_pattern error: {e}")
        return False


# ---- scrape_results ----

def get_scrape_result(url: str) -> Optional[dict[str, Any]]:
    client = get_client()
    if client is None:
        return None
    try:
        result = (
            client.table("scrape_results")
            .select("*")
            .eq("url", url)
            .maybe_single()
            .execute()
        )
        return result.data if result and result.data else None
    except Exception as e:
        print(f"get_scrape_result error: {e}")
        return None


def upsert_scrape_result(url: str, fields: dict[str, Any]) -> bool:
    client = get_client()
    if client is None:
        return False
    try:
        payload = {"url": url, **fields}
        client.table("scrape_results").upsert(payload, on_conflict="url").execute()
        return True
    except Exception as e:
        print(f"upsert_scrape_result error: {e}")
        return False


def list_scrape_results(niche: Optional[str] = None) -> list[dict[str, Any]]:
    client = get_client()
    if client is None:
        return []
    try:
        query = client.table("scrape_results").select("*")
        if niche:
            query = query.eq("niche", niche)
        result = query.order("created_at", desc=True).execute()
        return result.data or []
    except Exception as e:
        print(f"list_scrape_results error: {e}")
        return []
