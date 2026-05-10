// Free tier usage tracking — counts Riffs per calendar month, stored in
// localStorage. This is the trust-based front-end gate. The backend will
// also enforce per-user limits in Phase 13.B once Supabase tracks Riffs.

export const FREE_RIFF_LIMIT = 5;

const KEY = "riffmax_usage_v1";

export type Usage = {
  month: string; // YYYY-MM
  count: number;
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getUsage(): Usage {
  if (typeof window === "undefined") {
    return { month: currentMonth(), count: 0 };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { month: currentMonth(), count: 0 };
    const parsed = JSON.parse(raw) as Usage;
    if (parsed.month !== currentMonth()) {
      // New month — reset
      const fresh = { month: currentMonth(), count: 0 };
      safeWrite(fresh);
      return fresh;
    }
    return parsed;
  } catch {
    return { month: currentMonth(), count: 0 };
  }
}

function safeWrite(usage: Usage) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(usage));
  } catch {
    // localStorage might be disabled — non-fatal
  }
}

export function incrementUsage(): Usage {
  const current = getUsage();
  const next: Usage = {
    month: currentMonth(),
    count: current.count + 1,
  };
  safeWrite(next);
  return next;
}

export function isOverFreeLimit(): boolean {
  return getUsage().count >= FREE_RIFF_LIMIT;
}
