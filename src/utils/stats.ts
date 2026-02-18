import { Transaction, CATEGORIES, TransactionCategory } from '../types';

export interface CategoryStat {
  id: TransactionCategory;
  label: string;
  emoji: string;
  amount: number;
  percentage: number;
}

export interface MonthStat {
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface BalancePoint {
  label: string;
  balance: number;
}

const MAX_BALANCE_POINTS = 30;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function computeStats(transactions: Transaction[]) {
  let totalIncome = 0;
  let totalExpense = 0;

  const categoryMap = new Map<TransactionCategory, number>();
  const monthMap = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    if (t.type === 'add') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
      categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount);
    }

    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthMap.get(monthKey) ?? { income: 0, expense: 0 };
    if (t.type === 'add') {
      existing.income += t.amount;
    } else {
      existing.expense += t.amount;
    }
    monthMap.set(monthKey, existing);
  }

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;

  const categoryStats: CategoryStat[] = CATEGORIES
    .map((cat) => ({
      id: cat.id,
      label: cat.label,
      emoji: cat.emoji,
      amount: Math.round((categoryMap.get(cat.id) ?? 0) * 100) / 100,
      percentage: totalExpense > 0
        ? Math.round(((categoryMap.get(cat.id) ?? 0) / totalExpense) * 100)
        : 0,
    }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const sortedMonthKeys = [...monthMap.keys()].sort();
  const recentMonths = sortedMonthKeys.slice(-6);

  const monthlyStats: MonthStat[] = recentMonths.map((key) => {
    const [, monthStr] = key.split('-');
    const data = monthMap.get(key)!;
    return {
      label: MONTH_NAMES[parseInt(monthStr, 10) - 1],
      income: Math.round(data.income * 100) / 100,
      expense: Math.round(data.expense * 100) / 100,
      net: Math.round((data.income - data.expense) * 100) / 100,
    };
  });

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dayBalanceMap = new Map<string, number>();
  let runningBalance = 0;

  for (const t of sorted) {
    runningBalance += t.type === 'add' ? t.amount : -t.amount;
    runningBalance = Math.round(runningBalance * 100) / 100;
    const d = new Date(t.date);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayBalanceMap.set(dayKey, runningBalance);
  }

  const sortedDays = [...dayBalanceMap.keys()].sort();
  const allBalancePoints: BalancePoint[] = sortedDays.map((key) => {
    const [, m, day] = key.split('-');
    return {
      label: `${MONTH_NAMES[parseInt(m, 10) - 1]} ${parseInt(day, 10)}`,
      balance: dayBalanceMap.get(key)!,
    };
  });

  let balanceOverTime: BalancePoint[];
  if (allBalancePoints.length <= MAX_BALANCE_POINTS) {
    balanceOverTime = allBalancePoints;
  } else {
    balanceOverTime = [];
    for (let i = 0; i < MAX_BALANCE_POINTS; i++) {
      const idx = Math.round((i / (MAX_BALANCE_POINTS - 1)) * (allBalancePoints.length - 1));
      balanceOverTime.push(allBalancePoints[idx]);
    }
  }

  return {
    totalIncome,
    totalExpense,
    transactionCount: transactions.length,
    avgAmount: transactions.length > 0
      ? Math.round(((totalIncome + totalExpense) / transactions.length) * 100) / 100
      : 0,
    categoryStats,
    monthlyStats,
    balanceOverTime,
  };
}
