import { Transaction } from '../types';

export interface TransactionSection {
  title: string;
  data: Transaction[];
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getDateLabel(date: Date, today: Date): string {
  const dayStart = startOfDay(date);
  const todayStart = startOfDay(today);
  const diffDays = Math.round((todayStart - dayStart) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function groupTransactionsByDate(transactions: Transaction[]): TransactionSection[] {
  if (transactions.length === 0) return [];

  const today = new Date();
  const grouped = new Map<string, Transaction[]>();

  for (const t of transactions) {
    const date = new Date(t.date);
    const label = getDateLabel(date, today);
    const existing = grouped.get(label);
    if (existing) {
      existing.push(t);
    } else {
      grouped.set(label, [t]);
    }
  }

  return Array.from(grouped.entries()).map(([title, data]) => ({ title, data }));
}
