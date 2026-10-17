export type RecentAttempt = {
  id: string;
  at: number;
  title: string;
  language: string;
  score: number;
  code: string;
  intent?: string;
};

const KEY = "teachback.recent.v1";
const MAX = 5;

const EMPTY: RecentAttempt[] = [];
let cache: RecentAttempt[] | null = null;
const listeners = new Set<() => void>();

function emit(list: RecentAttempt[]) {
  cache = list;
  listeners.forEach((l) => l());
}

/** useSyncExternalStore adapters: the list lives in localStorage, read once and cached. */
export function subscribeRecent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getRecentSnapshot(): RecentAttempt[] {
  if (cache === null) cache = loadRecent();
  return cache;
}
export function getRecentServerSnapshot(): RecentAttempt[] {
  return EMPTY;
}

export function loadRecent(): RecentAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as RecentAttempt[]) : [];
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveRecent(attempt: Omit<RecentAttempt, "id" | "at">): RecentAttempt[] {
  const entry: RecentAttempt = { ...attempt, id: crypto.randomUUID(), at: Date.now() };
  const list = [entry, ...loadRecent()].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or disabled: recent list is a nice-to-have.
  }
  emit(list);
  return list;
}

export function clearRecent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
  emit(EMPTY);
}

/** First meaningful line of code, trimmed, as a human title. */
export function titleFor(code: string): string {
  const line =
    code
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !/^(\/\/|#|\/\*|\*|"""|import |from |using )/.test(l)) ?? "Untitled snippet";
  return line.length > 48 ? line.slice(0, 47) + "…" : line;
}

export function timeAgo(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
