import { CATEGORIES, Kid, Transaction } from '../types';

/** What the kid had already seen on their dashboard: the newest transaction and the balance. */
export interface SeenMarker {
  txId: string | null;
  date: string | null;
  balance: number;
}

export interface ArrivalSource {
  /** Who or what the money came from, e.g. "Leo", "Allowance", "Grandma". */
  label: string;
  /** Short line under the amount, e.g. "from Leo" or "Birthday money". */
  subtitle: string;
  emoji: string;
  amount: number;
}

export interface MoneyArrival {
  total: number;
  /** Grouped by label, biggest first. */
  sources: ArrivalSource[];
  previousBalance: number;
  balance: number;
}

export const lastSeenKey = (kidId: string) => `@finance_tracker_last_seen_${kidId}`;

const round2 = (n: number) => Math.round(n * 100) / 100;

function newestFirst(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function markerFor(kid: Kid): SeenMarker {
  const newest = newestFirst(kid.transactions)[0];
  return { txId: newest?.id ?? null, date: newest?.date ?? null, balance: kid.balance };
}

export function sameMarker(a: SeenMarker, b: SeenMarker) {
  return a.txId === b.txId && a.balance === b.balance;
}

export function parseMarker(raw: string | null): SeenMarker | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.balance !== 'number') return null;
    return {
      txId: typeof parsed.txId === 'string' ? parsed.txId : null,
      date: typeof parsed.date === 'string' ? parsed.date : null,
      balance: parsed.balance,
    };
  } catch {
    return null;
  }
}

const FROM_NAME = /\bfrom\s+(.+?)\s*[.!]*$/i;

export function describeSource(tx: Transaction): Omit<ArrivalSource, 'amount'> {
  if (tx.transfer) {
    const name = tx.transfer.fromKidName;
    return { label: name, subtitle: `from ${name}`, emoji: '🤝' };
  }
  const category = CATEGORIES.find((c) => c.id === tx.category);
  const emoji = category?.emoji ?? '💰';
  if (tx.category === 'allowance') {
    return { label: 'Allowance', subtitle: 'from Allowance', emoji };
  }
  const named = tx.description.match(FROM_NAME)?.[1];
  if (named) return { label: named, subtitle: `from ${named}`, emoji };
  const label = tx.description.trim() || category?.label || 'Money';
  return { label, subtitle: label, emoji };
}

/**
 * Money that came in since `seen`. Only incoming (`add`) entries count, so the kid's own
 * sends never trigger it. Returns null when nothing new arrived.
 */
export function findArrivals(kid: Kid, seen: SeenMarker): MoneyArrival | null {
  const sorted = newestFirst(kid.transactions);
  let fresh: Transaction[];
  if (seen.txId === null) {
    fresh = sorted;
  } else {
    const seenIndex = sorted.findIndex((t) => t.id === seen.txId);
    fresh = seenIndex >= 0
      ? sorted.slice(0, seenIndex)
      : sorted.filter((t) => seen.date !== null && t.date > seen.date);
  }

  const incoming = fresh.filter((t) => t.type === 'add' && t.transfer?.fromKidId !== kid.id && t.amount > 0);
  if (incoming.length === 0) return null;

  const groups = new Map<string, ArrivalSource>();
  for (const tx of incoming) {
    const source = describeSource(tx);
    const existing = groups.get(source.label);
    if (existing) existing.amount = round2(existing.amount + tx.amount);
    else groups.set(source.label, { ...source, amount: tx.amount });
  }

  const total = round2(incoming.reduce((sum, t) => sum + t.amount, 0));
  return {
    total,
    sources: [...groups.values()].sort((a, b) => b.amount - a.amount),
    previousBalance: round2(kid.balance - total),
    balance: kid.balance,
  };
}
