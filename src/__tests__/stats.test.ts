import { computeStats } from '../utils/stats';
import { Transaction } from '../types';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2),
    type: 'add',
    amount: 10,
    description: 'Test',
    category: 'other',
    date: '2025-06-15T10:00:00.000Z',
    ...overrides,
  };
}

// ─── computeStats ────────────────────────────────────────────────────────

describe('computeStats', () => {
  describe('empty transactions', () => {
    it('returns zero stats for empty array', () => {
      const stats = computeStats([]);
      expect(stats.totalIncome).toBe(0);
      expect(stats.totalExpense).toBe(0);
      expect(stats.transactionCount).toBe(0);
      expect(stats.avgAmount).toBe(0);
      expect(stats.categoryStats).toHaveLength(0);
      expect(stats.monthlyStats).toHaveLength(0);
      expect(stats.balanceOverTime).toHaveLength(0);
    });
  });

  describe('income and expense totals', () => {
    it('sums all income correctly', () => {
      const txs = [
        makeTx({ type: 'add', amount: 10 }),
        makeTx({ type: 'add', amount: 20.5 }),
        makeTx({ type: 'add', amount: 5.25 }),
      ];
      const stats = computeStats(txs);
      expect(stats.totalIncome).toBe(35.75);
      expect(stats.totalExpense).toBe(0);
    });

    it('sums all expenses correctly', () => {
      const txs = [
        makeTx({ type: 'subtract', amount: 7, category: 'food' }),
        makeTx({ type: 'subtract', amount: 3.5, category: 'toys' }),
      ];
      const stats = computeStats(txs);
      expect(stats.totalIncome).toBe(0);
      expect(stats.totalExpense).toBe(10.5);
    });

    it('calculates both income and expense', () => {
      const txs = [
        makeTx({ type: 'add', amount: 100 }),
        makeTx({ type: 'subtract', amount: 30, category: 'food' }),
        makeTx({ type: 'subtract', amount: 20, category: 'toys' }),
      ];
      const stats = computeStats(txs);
      expect(stats.totalIncome).toBe(100);
      expect(stats.totalExpense).toBe(50);
    });

    it('handles floating point precision correctly', () => {
      const txs = [
        makeTx({ type: 'add', amount: 0.1 }),
        makeTx({ type: 'add', amount: 0.2 }),
      ];
      const stats = computeStats(txs);
      expect(stats.totalIncome).toBe(0.3);
    });
  });

  describe('transaction counts and averages', () => {
    it('counts transactions correctly', () => {
      const txs = [makeTx(), makeTx(), makeTx()];
      const stats = computeStats(txs);
      expect(stats.transactionCount).toBe(3);
    });

    it('calculates average amount correctly', () => {
      const txs = [
        makeTx({ type: 'add', amount: 10 }),
        makeTx({ type: 'subtract', amount: 20, category: 'food' }),
      ];
      const stats = computeStats(txs);
      expect(stats.avgAmount).toBe(15); // (10 + 20) / 2
    });
  });

  describe('category stats', () => {
    it('tracks spending by category', () => {
      const txs = [
        makeTx({ type: 'subtract', amount: 30, category: 'food' }),
        makeTx({ type: 'subtract', amount: 20, category: 'toys' }),
        makeTx({ type: 'subtract', amount: 50, category: 'food' }),
      ];
      const stats = computeStats(txs);

      expect(stats.categoryStats.length).toBeGreaterThan(0);
      const food = stats.categoryStats.find((c) => c.id === 'food');
      const toys = stats.categoryStats.find((c) => c.id === 'toys');
      expect(food).toBeDefined();
      expect(food!.amount).toBe(80);
      expect(toys).toBeDefined();
      expect(toys!.amount).toBe(20);
    });

    it('sorts categories by amount descending', () => {
      const txs = [
        makeTx({ type: 'subtract', amount: 10, category: 'food' }),
        makeTx({ type: 'subtract', amount: 50, category: 'toys' }),
        makeTx({ type: 'subtract', amount: 30, category: 'clothing' }),
      ];
      const stats = computeStats(txs);

      expect(stats.categoryStats[0].id).toBe('toys');
      expect(stats.categoryStats[1].id).toBe('clothing');
      expect(stats.categoryStats[2].id).toBe('food');
    });

    it('calculates percentages correctly', () => {
      const txs = [
        makeTx({ type: 'subtract', amount: 75, category: 'food' }),
        makeTx({ type: 'subtract', amount: 25, category: 'toys' }),
      ];
      const stats = computeStats(txs);

      const food = stats.categoryStats.find((c) => c.id === 'food');
      const toys = stats.categoryStats.find((c) => c.id === 'toys');
      expect(food!.percentage).toBe(75);
      expect(toys!.percentage).toBe(25);
    });

    it('excludes categories with zero spending', () => {
      const txs = [
        makeTx({ type: 'subtract', amount: 10, category: 'food' }),
        makeTx({ type: 'add', amount: 50 }), // income doesn't count as category spending
      ];
      const stats = computeStats(txs);

      expect(stats.categoryStats).toHaveLength(1);
      expect(stats.categoryStats[0].id).toBe('food');
    });

    it('only counts subtract transactions in category stats', () => {
      const txs = [
        makeTx({ type: 'add', amount: 100, category: 'allowance' }),
        makeTx({ type: 'subtract', amount: 20, category: 'food' }),
      ];
      const stats = computeStats(txs);

      const allowance = stats.categoryStats.find((c) => c.id === 'allowance');
      expect(allowance).toBeUndefined();
    });

    it('includes emoji and label for categories', () => {
      const txs = [
        makeTx({ type: 'subtract', amount: 10, category: 'food' }),
      ];
      const stats = computeStats(txs);

      expect(stats.categoryStats[0].emoji).toBe('🍔');
      expect(stats.categoryStats[0].label).toBe('Food');
    });
  });

  describe('monthly stats', () => {
    it('groups transactions by month', () => {
      const txs = [
        makeTx({ type: 'add', amount: 10, date: '2025-01-15T10:00:00.000Z' }),
        makeTx({ type: 'add', amount: 20, date: '2025-01-20T10:00:00.000Z' }),
        makeTx({ type: 'subtract', amount: 5, date: '2025-02-10T10:00:00.000Z', category: 'food' }),
      ];
      const stats = computeStats(txs);

      expect(stats.monthlyStats).toHaveLength(2);
      expect(stats.monthlyStats[0].label).toBe('Jan');
      expect(stats.monthlyStats[0].income).toBe(30);
      expect(stats.monthlyStats[0].expense).toBe(0);
      expect(stats.monthlyStats[1].label).toBe('Feb');
      expect(stats.monthlyStats[1].income).toBe(0);
      expect(stats.monthlyStats[1].expense).toBe(5);
    });

    it('limits to 6 most recent months', () => {
      const txs: Transaction[] = [];
      for (let m = 0; m < 8; m++) {
        txs.push(makeTx({
          type: 'add',
          amount: 10,
          date: `2025-${String(m + 1).padStart(2, '0')}-15T10:00:00.000Z`,
        }));
      }
      const stats = computeStats(txs);
      expect(stats.monthlyStats).toHaveLength(6);
      expect(stats.monthlyStats[0].label).toBe('Mar');
      expect(stats.monthlyStats[5].label).toBe('Aug');
    });

    it('calculates net correctly (income - expense)', () => {
      const txs = [
        makeTx({ type: 'add', amount: 100, date: '2025-03-10T10:00:00.000Z' }),
        makeTx({ type: 'subtract', amount: 40, date: '2025-03-15T10:00:00.000Z', category: 'food' }),
      ];
      const stats = computeStats(txs);

      expect(stats.monthlyStats[0].net).toBe(60);
    });
  });

  describe('balance over time', () => {
    it('tracks running balance chronologically', () => {
      const txs = [
        makeTx({ type: 'add', amount: 100, date: '2025-01-10T10:00:00.000Z' }),
        makeTx({ type: 'subtract', amount: 30, date: '2025-01-15T10:00:00.000Z', category: 'food' }),
        makeTx({ type: 'add', amount: 50, date: '2025-01-20T10:00:00.000Z' }),
      ];
      const stats = computeStats(txs);

      expect(stats.balanceOverTime).toHaveLength(3);
      expect(stats.balanceOverTime[0].balance).toBe(100);
      expect(stats.balanceOverTime[1].balance).toBe(70);
      expect(stats.balanceOverTime[2].balance).toBe(120);
    });

    it('consolidates multiple transactions on the same day', () => {
      const txs = [
        makeTx({ type: 'add', amount: 50, date: '2025-01-10T08:00:00.000Z' }),
        makeTx({ type: 'add', amount: 30, date: '2025-01-10T16:00:00.000Z' }),
        makeTx({ type: 'subtract', amount: 10, date: '2025-01-11T10:00:00.000Z', category: 'food' }),
      ];
      const stats = computeStats(txs);

      expect(stats.balanceOverTime).toHaveLength(2);
      expect(stats.balanceOverTime[0].balance).toBe(80); // 50 + 30
      expect(stats.balanceOverTime[1].balance).toBe(70); // 80 - 10
    });

    it('limits to MAX_BALANCE_POINTS when there are many data points', () => {
      const txs: Transaction[] = [];
      for (let d = 1; d <= 60; d++) {
        txs.push(makeTx({
          type: 'add',
          amount: 1,
          date: `2025-${String(Math.ceil(d / 30)).padStart(2, '0')}-${String(((d - 1) % 28) + 1).padStart(2, '0')}T10:00:00.000Z`,
        }));
      }
      const stats = computeStats(txs);
      expect(stats.balanceOverTime.length).toBeLessThanOrEqual(30);
    });

    it('includes formatted date labels', () => {
      const txs = [
        makeTx({ type: 'add', amount: 10, date: '2025-03-15T10:00:00.000Z' }),
      ];
      const stats = computeStats(txs);

      expect(stats.balanceOverTime[0].label).toBe('Mar 15');
    });

    it('handles negative running balance', () => {
      const txs = [
        makeTx({ type: 'subtract', amount: 50, date: '2025-01-10T10:00:00.000Z', category: 'food' }),
      ];
      const stats = computeStats(txs);

      expect(stats.balanceOverTime[0].balance).toBe(-50);
    });
  });

  describe('rounding', () => {
    it('rounds all monetary values to 2 decimal places', () => {
      const txs = [
        makeTx({ type: 'add', amount: 10.333 }),
        makeTx({ type: 'add', amount: 10.337 }),
        makeTx({ type: 'subtract', amount: 3.333, category: 'food' }),
        makeTx({ type: 'subtract', amount: 3.337, category: 'food' }),
      ];
      const stats = computeStats(txs);

      const incomeDecimals = stats.totalIncome.toString().split('.')[1]?.length ?? 0;
      const expenseDecimals = stats.totalExpense.toString().split('.')[1]?.length ?? 0;
      expect(incomeDecimals).toBeLessThanOrEqual(2);
      expect(expenseDecimals).toBeLessThanOrEqual(2);
    });
  });
});
