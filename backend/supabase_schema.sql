-- Riffmax AI — Supabase schema for the pattern-learning system.
-- Run this in the Supabase SQL editor (dashboard → SQL Editor → new query).

-- Enable UUID generation if not already on (gen_random_uuid is in pg_catalog by default).
create extension if not exists "pgcrypto";

-- ============================================================
-- niche_patterns
-- One row per niche (saas, restaurant, fintech, etc.). Holds the
-- aggregated learnings from analyzing every site in that niche.
-- ============================================================
create table if not exists niche_patterns (
  id              uuid primary key default gen_random_uuid(),
  niche           text not null unique,
  pattern_data    jsonb,
  sites_analyzed  int  not null default 0,
  last_updated    timestamptz not null default now(),

  -- Aggregated insights (denormalized for fast read in /api/build)
  top_headlines           text[] default '{}',
  top_cta_texts           text[] default '{}',
  recommended_sections    text[] default '{}',
  color_recommendations   jsonb,
  tone_profile            text
);

-- ============================================================
-- scrape_results
-- One row per URL we've scraped. Cached so we don't re-scrape
-- the same URL within 7 days. Status tracks the pipeline stage.
-- ============================================================
create table if not exists scrape_results (
  id            uuid primary key default gen_random_uuid(),
  url           text not null unique,
  niche         text not null,
  raw_content   jsonb,                  -- raw Firecrawl scrape output
  analyzed_data jsonb,                  -- structured pattern from Claude
  status        text not null default 'pending',  -- pending | scraped | analyzed | failed
  error_message text,
  retry_count   int  not null default 0,
  scraped_at    timestamptz,
  analyzed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists scrape_results_niche_idx  on scrape_results (niche);
create index if not exists scrape_results_status_idx on scrape_results (status);

-- ============================================================
-- Row Level Security (RLS)
--
-- We're using the Supabase service-role key from the BACKEND only.
-- The service key bypasses RLS, so we can leave RLS off for both
-- tables. We just won't expose these tables to the anon/public key.
-- If you ever expose them client-side, turn RLS on with the
-- commented policies below as a starting point.
-- ============================================================
-- alter table niche_patterns enable row level security;
-- alter table scrape_results enable row level security;
-- create policy "anon read niche_patterns" on niche_patterns for select using (true);
