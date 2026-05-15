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
-- niche_patterns + scrape_results are accessed via service-role key
-- from the backend only — RLS off is fine.
-- riffs is accessed by the FRONTEND with the anon key — RLS REQUIRED.
-- ============================================================

-- ============================================================
-- riffs — one row per user-generated website (Phase 13.B).
-- Frontend writes via anon key + user JWT. RLS scopes everything
-- to auth.uid() so a user only ever sees their own rows.
-- ============================================================
create table if not exists riffs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  business_name   text not null,
  industry        text,
  template_used   text,
  niche_used      text,
  reference_url   text,
  page_count      int  not null default 0,
  live_url        text,
  created_at      timestamptz not null default now()
);

create index if not exists riffs_user_id_idx    on riffs (user_id);
create index if not exists riffs_created_at_idx on riffs (created_at desc);

alter table riffs enable row level security;

-- Drop existing policies so this script can be re-run safely.
drop policy if exists "users read own riffs"    on riffs;
drop policy if exists "users insert own riffs"  on riffs;
drop policy if exists "users update own riffs"  on riffs;
drop policy if exists "users delete own riffs"  on riffs;

create policy "users read own riffs"   on riffs for select using (auth.uid() = user_id);
create policy "users insert own riffs" on riffs for insert with check (auth.uid() = user_id);
create policy "users update own riffs" on riffs for update using (auth.uid() = user_id);
create policy "users delete own riffs" on riffs for delete using (auth.uid() = user_id);

-- ============================================================
-- subscriptions — one row per active Paystack subscription per user.
-- Updated by Paystack webhooks (Phase 18.B).
-- Frontend reads to gate Pro features. RLS scopes to owner.
-- ============================================================
create table if not exists subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users(id) on delete cascade not null,
  paystack_customer_code   text,
  paystack_subscription_code text,
  plan_code                text,                  -- e.g. "PLN_xxx" from Paystack
  plan_name                text,                  -- "hobby" | "pro" | "agency"
  status                   text not null default 'pending',  -- pending | active | cancelled | expired
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create unique index if not exists subscriptions_user_idx on subscriptions (user_id);

alter table subscriptions enable row level security;

drop policy if exists "users read own subscription" on subscriptions;
create policy "users read own subscription" on subscriptions
  for select using (auth.uid() = user_id);
-- Inserts/updates happen via service-role from backend webhook only.
