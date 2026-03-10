import { groupTransactionsByDate, TransactionSection } from '../utils/dateGrouping';
import { Transaction } from '../types';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2),
    type: 'add',
    amount: 10,
    description: 'Test',
    category: 'other',
    date: new Date().toISOString(),
    ...overrides,
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

describe('groupTransactionsByDate', () => {
  it('returns empty array for no transactions', () => {
    expect(groupTransactionsByDate([])).toEqual([]);
  });

  it('groups a single transaction as "Today"', () => {
    const tx = makeTx({ date: new Date().toISOString() });
    const sections = groupTransactionsByDate([tx]);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Today');
    expect(sections[0].data).toHaveLength(1);
  });

  it('groups yesterday transactions as "Yesterday"', () => {
    const tx = makeTx({ date: daysAgo(1) });
    const sections = groupTransactionsByDate([tx]);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Yesterday');
  });

  it('labels transactions 2-6 days ago with weekday name', () => {
    const tx = makeTx({ date: daysAgo(3) });
    const sections = groupTransactionsByDate([tx]);
    expect(sections).toHaveLength(1);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    expect(weekdays).toContain(sections[0].title);
  });

  it('labels transactions 7+ days ago with formatted date', () => {
    const tx = makeTx({ date: daysAgo(10) });
    const sections = groupTransactionsByDate([tx]);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toMatch(/\w+ \d+, \d{4}/);
  });

  it('groups multiple transactions on the same day together', () => {
    const today = new Date();
    const tx1 = makeTx({ id: 'tx-1', date: today.toISOString() });
    today.setHours(today.getHours() - 1);
    const tx2 = makeTx({ id: 'tx-2', date: today.toISOString() });
    const sections = groupTransactionsByDate([tx1, tx2]);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Today');
    expect(sections[0].data).toHaveLength(2);
  });

  it('separates transactions from different days into different groups', () => {
    const tx1 = makeTx({ id: 'tx-1', date: daysAgo(0) });
    const tx2 = makeTx({ id: 'tx-2', date: daysAgo(1) });
    const sections = groupTransactionsByDate([tx1, tx2]);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('Today');
    expect(sections[1].title).toBe('Yesterday');
  });

  it('preserves insertion order of groups', () => {
    const tx1 = makeTx({ id: 'tx-1', date: daysAgo(1) });
    const tx2 = makeTx({ id: 'tx-2', date: daysAgo(0) });
    const sections = groupTransactionsByDate([tx1, tx2]);
    expect(sections[0].title).toBe('Yesterday');
    expect(sections[1].title).toBe('Today');
  });

  it('handles transactions spanning weeks', () => {
    const txs = [
      makeTx({ id: 'a', date: daysAgo(0) }),
      makeTx({ id: 'b', date: daysAgo(1) }),
      makeTx({ id: 'c', date: daysAgo(4) }),
      makeTx({ id: 'd', date: daysAgo(14) }),
      makeTx({ id: 'e', date: daysAgo(30) }),
    ];
    const sections = groupTransactionsByDate(txs);
    expect(sections.length).toBeGreaterThanOrEqual(4);
    expect(sections[0].title).toBe('Today');
    expect(sections[1].title).toBe('Yesterday');
  });

  it('produces correct TransactionSection shape', () => {
    const tx = makeTx({ date: daysAgo(0) });
    const sections: TransactionSection[] = groupTransactionsByDate([tx]);
    expect(sections[0]).toHaveProperty('title');
    expect(sections[0]).toHaveProperty('data');
    expect(Array.isArray(sections[0].data)).toBe(true);
    expect(sections[0].data[0]).toHaveProperty('id');
    expect(sections[0].data[0]).toHaveProperty('amount');
  });

  it('handles transactions at midnight boundary', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tx = makeTx({ date: today.toISOString() });
    const sections = groupTransactionsByDate([tx]);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Today');
  });

  it('handles transactions at end of day', () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const tx = makeTx({ date: today.toISOString() });
    const sections = groupTransactionsByDate([tx]);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Today');
  });

  it('handles old transactions (months ago)', () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 6);
    const tx = makeTx({ date: oldDate.toISOString() });
    const sections = groupTransactionsByDate([tx]);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toMatch(/\w+ \d+, \d{4}/);
  });

  it('correctly counts all transactions across groups', () => {
    const txs = [
      makeTx({ id: 'a', date: daysAgo(0) }),
      makeTx({ id: 'b', date: daysAgo(0) }),
      makeTx({ id: 'c', date: daysAgo(1) }),
      makeTx({ id: 'd', date: daysAgo(10) }),
    ];
    const sections = groupTransactionsByDate(txs);
    const totalCount = sections.reduce((sum, s) => sum + s.data.length, 0);
    expect(totalCount).toBe(4);
  });
});
