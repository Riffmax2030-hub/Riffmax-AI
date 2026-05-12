// Credit-based usage tracking — replaces the simple per-month Riff count.
// Different operations cost different credits, mirroring Base44/Hercules.
// Free tier: 50 credits/month. Resets on calendar month rollover.
//
// COSTS (rough — tuned to actual Anthropic spend):
//   BUILD   = 10 credits (~$0.20 of Claude tokens)
//   REFINE  =  2 credits (~$0.05 of Claude tokens — Haiku now)
//   DEPLOY  =  1 credit  (Vercel call, almost free)
//   PARSE   =  0 credits (Haiku, negligible — folded into BUILD)

export type CreditCost = 10 | 2 | 1 | 0;
export const CREDITS = {
  BUILD: 10 as CreditCost,
  REFINE: 2 as CreditCost,
  DEPLOY: 1 as CreditCost,
};

export const FREE_CREDITS_PER_MONTH = 50;

const KEY = "riffmax_credits_v1";

export type CreditState = {
  month: string; // YYYY-MM
  used: number;  // credits used this month
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function safeRead(): CreditState {
  if (typeof window === "undefined") {
    return { month: currentMonth(), used: 0 };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { month: currentMonth(), used: 0 };
    const parsed = JSON.parse(raw) as CreditState;
    if (parsed.month !== currentMonth()) {
      const fresh: CreditState = { month: currentMonth(), used: 0 };
      safeWrite(fresh);
      return fresh;
    }
    return parsed;
  } catch {
    return { month: currentMonth(), used: 0 };
  }
}

function safeWrite(state: CreditState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getCredits(): { used: number; remaining: number; total: number } {
  const state = safeRead();
  return {
    used: state.used,
    remaining: Math.max(0, FREE_CREDITS_PER_MONTH - state.used),
    total: FREE_CREDITS_PER_MONTH,
  };
}

export function consumeCredits(cost: CreditCost): { ok: boolean; remaining: number } {
  const state = safeRead();
  if (state.used + cost > FREE_CREDITS_PER_MONTH) {
    return { ok: false, remaining: Math.max(0, FREE_CREDITS_PER_MONTH - state.used) };
  }
  const next: CreditState = { month: currentMonth(), used: state.used + cost };
  safeWrite(next);
  return { ok: true, remaining: FREE_CREDITS_PER_MONTH - next.used };
}

// Read-only check (doesn't consume) — for showing "you can't afford this" UI
export function canAfford(cost: CreditCost): boolean {
  const state = safeRead();
  return state.used + cost <= FREE_CREDITS_PER_MONTH;
}

// Bring-Your-Own Anthropic key bypasses the credit limit because the user
// pays Anthropic directly. Stored in a separate localStorage key.
const BYO_KEY = "riffmax_byo_anthropic_key";

export function getByoKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(BYO_KEY);
  } catch {
    return null;
  }
}

export function setByoKey(key: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (key) window.localStorage.setItem(BYO_KEY, key);
    else window.localStorage.removeItem(BYO_KEY);
  } catch {
    // ignore
  }
}

export function hasByoKey(): boolean {
  return !!getByoKey();
}

// ---- Legacy compatibility (so old calls still work) ----
// Old code uses incrementUsage / isOverFreeLimit / FREE_RIFF_LIMIT.
// Map to the new credit system: a "Riff" = a build = 10 credits.

export const FREE_RIFF_LIMIT = Math.floor(FREE_CREDITS_PER_MONTH / CREDITS.BUILD);

export function incrementUsage() {
  const result = consumeCredits(CREDITS.BUILD);
  return {
    month: currentMonth(),
    count: Math.floor(safeRead().used / CREDITS.BUILD),
    remaining: result.remaining,
  };
}

export function isOverFreeLimit(): boolean {
  // Over limit if a build wouldn't fit AND no BYO key
  return !canAfford(CREDITS.BUILD) && !hasByoKey();
}
