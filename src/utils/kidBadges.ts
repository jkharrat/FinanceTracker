import { Transaction } from '../types';

export interface KidBadge {
  id: 'saved-more' | 'best-week' | 'no-spend';
  label: string;
  emoji: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const net = (t: Transaction) => (t.type === 'add' ? t.amount : -t.amount);
const monthKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();

/** Fun, kid-facing achievements derived from transaction history. Only returns badges that are true. */
export function computeKidBadges(transactions: Transaction[], now: Date = new Date()): KidBadge[] {
  if (transactions.length === 0) return [];
  const nowMs = now.getTime();
  const badges: KidBadge[] = [];

  const thisMonth = monthKey(now);
  let thisMonthNet = 0;
  let lastMonthNet = 0;
  let lastMonthActive = false;
  for (const t of transactions) {
    const key = monthKey(new Date(t.date));
    if (key === thisMonth) thisMonthNet += net(t);
    else if (key === thisMonth - 1) {
      lastMonthNet += net(t);
      lastMonthActive = true;
    }
  }
  if (lastMonthActive && thisMonthNet > 0 && thisMonthNet > lastMonthNet) {
    badges.push({ id: 'saved-more', label: 'You saved more than last month!', emoji: '🚀' });
  }

  const weekNets = new Map<number, number>();
  for (const t of transactions) {
    const age = nowMs - new Date(t.date).getTime();
    if (age < 0) continue;
    const week = Math.floor(age / WEEK_MS);
    weekNets.set(week, (weekNets.get(week) ?? 0) + net(t));
  }
  const thisWeek = weekNets.get(0) ?? 0;
  const otherWeeks = [...weekNets.entries()].filter(([week]) => week > 0).map(([, value]) => value);
  if (thisWeek > 0 && otherWeeks.length > 0 && otherWeeks.every((value) => thisWeek > value)) {
    badges.push({ id: 'best-week', label: 'Biggest savings week!', emoji: '🏆' });
  }

  const weekAgo = nowMs - WEEK_MS;
  const hasOlderHistory = transactions.some((t) => new Date(t.date).getTime() <= weekAgo);
  const spentRecently = transactions.some((t) => t.type === 'subtract' && new Date(t.date).getTime() > weekAgo);
  if (hasOlderHistory && !spentRecently) {
    badges.push({ id: 'no-spend', label: 'No spending for 7 days!', emoji: '🌟' });
  }

  return badges;
}
