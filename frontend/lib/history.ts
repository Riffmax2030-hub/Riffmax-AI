// lib/history.ts — localStorage-backed history of builds.
// Used by /dashboard to show past Riffs and by the home page to record new ones.

export type HistoryEntry = {
  id: string;
  businessName: string;
  industry: string;
  templateUsed: string | null;
  pageCount: number;
  createdAt: number; // ms epoch
  liveUrl: string | null;
};

const KEY = "riffmax_history_v1";
const MAX_ENTRIES = 50;

function safeRead(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // localStorage might be disabled or full — non-fatal
  }
}

export function saveBuild(
  entry: Omit<HistoryEntry, "id" | "createdAt">
): HistoryEntry {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newEntry: HistoryEntry = { ...entry, id, createdAt: Date.now() };
  const updated = [newEntry, ...safeRead()].slice(0, MAX_ENTRIES);
  safeWrite(updated);
  return newEntry;
}

export function updateLiveUrl(id: string, liveUrl: string) {
  const updated = safeRead().map((e) =>
    e.id === id ? { ...e, liveUrl } : e
  );
  safeWrite(updated);
}

export function getHistory(): HistoryEntry[] {
  return safeRead();
}

export function deleteFromHistory(id: string) {
  safeWrite(safeRead().filter((e) => e.id !== id));
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
