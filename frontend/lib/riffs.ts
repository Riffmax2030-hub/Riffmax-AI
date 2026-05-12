// lib/riffs.ts — Supabase CRUD for the riffs table.
// All calls go directly from the browser via the Supabase client. RLS in the
// database scopes everything to auth.uid() so a user can only see their own.

import { createClient } from "./supabase/client";

export type RiffRow = {
  id: string;
  user_id: string;
  business_name: string;
  industry: string | null;
  template_used: string | null;
  niche_used: string | null;
  reference_url: string | null;
  page_count: number;
  live_url: string | null;
  created_at: string;
};

export type NewRiff = {
  business_name: string;
  industry?: string | null;
  template_used?: string | null;
  niche_used?: string | null;
  reference_url?: string | null;
  page_count: number;
};

/** Insert a riff for the currently authenticated user. Returns the new row, or null on failure. */
export async function saveRiff(data: NewRiff): Promise<RiffRow | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row, error } = await supabase
    .from("riffs")
    .insert({
      user_id: user.id,
      business_name: data.business_name,
      industry: data.industry ?? null,
      template_used: data.template_used ?? null,
      niche_used: data.niche_used ?? null,
      reference_url: data.reference_url ?? null,
      page_count: data.page_count,
    })
    .select()
    .single();

  if (error) {
    console.error("saveRiff error:", error.message);
    return null;
  }
  return row as RiffRow;
}

/** List riffs for the current user, newest first. */
export async function getRiffs(): Promise<RiffRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("riffs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getRiffs error:", error.message);
    return [];
  }
  return (data || []) as RiffRow[];
}

/** Set the live deployment URL on a riff after deployment succeeds. */
export async function updateRiffLiveUrl(id: string, liveUrl: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("riffs")
    .update({ live_url: liveUrl })
    .eq("id", id);

  if (error) {
    console.error("updateRiffLiveUrl error:", error.message);
    return false;
  }
  return true;
}

/** Delete a riff (RLS only allows the owner). */
export async function deleteRiff(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("riffs").delete().eq("id", id);
  if (error) {
    console.error("deleteRiff error:", error.message);
    return false;
  }
  return true;
}

/** Count how many riffs the current user has built this calendar month. */
export async function getRiffCountThisMonth(): Promise<number> {
  const supabase = createClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("riffs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfMonth.toISOString());

  if (error) {
    console.error("getRiffCountThisMonth error:", error.message);
    return 0;
  }
  return count || 0;
}
