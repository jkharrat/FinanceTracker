import {
  getNextMonday,
  advanceDueDate,
  getFirstDueDate,
  processAllowances,
  FREQUENCY_LABELS,
} from '../utils/allowance';
import { Kid } from '../types';

function makeKid(overrides: Partial<Kid> = {}): Kid {
  return {
    id: 'kid-1',
    family_id: 'fam-1',
    name: 'Alice',
    avatar: '😊',
    password: '',
    allowanceAmount: 10,
    allowanceFrequency: 'weekly',
    balance: 0,
    transactions: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    lastAllowanceDate: null,
    ...overrides,
  };
}

// ─── getNextMonday ───────────────────────────────────────────────────────

describe('getNextMonday', () => {
  it('returns next Monday when given a Wednesday', () => {
    const wed = new Date('2025-06-04T15:30:00'); // Wednesday
    const result = getNextMonday(wed);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(9); // June 9
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('returns the very next day when given a Sunday', () => {
    const sun = new Date('2025-06-08T10:00:00'); // Sunday
    const result = getNextMonday(sun);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(9);
  });

  it('returns next Monday when given a Monday (not the same day)', () => {
    const mon = new Date('2025-06-02T10:00:00'); // Monday
    const result = getNextMonday(mon);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(9); // Next Monday
  });

  it('returns next Monday when given a Saturday', () => {
    const sat = new Date('2025-06-07T10:00:00'); // Saturday
    const result = getNextMonday(sat);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(9);
  });

  it('returns next Monday when given a Friday', () => {
    const fri = new Date('2025-06-06T10:00:00'); // Friday
    const result = getNextMonday(fri);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(9);
  });

  it('handles month boundary correctly', () => {
    const date = new Date('2025-01-29T10:00:00'); // Wednesday
    const result = getNextMonday(date);
    expect(result.getDay()).toBe(1);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(3);
  });

  it('handles year boundary correctly', () => {
    const date = new Date('2025-12-29T10:00:00'); // Monday
    const result = getNextMonday(date);
    expect(result.getDay()).toBe(1);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(5);
  });

  it('zeroes out hours, minutes, seconds, milliseconds', () => {
    const date = new Date('2025-06-04T23:59:59.999');
    const result = getNextMonday(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

// ─── advanceDueDate ──────────────────────────────────────────────────────

describe('advanceDueDate', () => {
  it('advances weekly by exactly 7 days', () => {
    const start = new Date('2025-06-02T00:00:00');
    const result = advanceDueDate(start, 'weekly');
    expect(result.getDate()).toBe(9);
    expect(result.getMonth()).toBe(5); // June
  });

  it('advances monthly to the first of next month', () => {
    const start = new Date('2025-06-01T00:00:00');
    const result = advanceDueDate(start, 'monthly');
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(6); // July
  });

  it('handles monthly year boundary', () => {
    const dec = new Date('2025-12-01T00:00:00');
    const result = advanceDueDate(dec, 'monthly');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(1);
  });

  it('weekly advance preserves time', () => {
    const start = new Date('2025-06-02T14:30:00');
    const result = advanceDueDate(start, 'weekly');
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });

  it('handles weekly month boundary', () => {
    const date = new Date('2025-01-28T00:00:00');
    const result = advanceDueDate(date, 'weekly');
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(4);
  });
});

// ─── getFirstDueDate ─────────────────────────────────────────────────────

describe('getFirstDueDate', () => {
  it('returns next Monday for weekly frequency', () => {
    const created = new Date('2025-06-04T12:00:00'); // Wednesday
    const result = getFirstDueDate(created, 'weekly');
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(9);
  });

  it('returns first of next month for monthly frequency', () => {
    const created = new Date('2025-06-15T12:00:00');
    const result = getFirstDueDate(created, 'monthly');
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(6); // July
  });

  it('monthly: handles December creation → January first', () => {
    const created = new Date('2025-12-20T12:00:00');
    const result = getFirstDueDate(created, 'monthly');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
  });
});

// ─── FREQUENCY_LABELS ────────────────────────────────────────────────────

describe('FREQUENCY_LABELS', () => {
  it('has correct labels for weekly', () => {
    expect(FREQUENCY_LABELS.weekly).toBe('Weekly allowance');
  });

  it('has correct labels for monthly', () => {
    expect(FREQUENCY_LABELS.monthly).toBe('Monthly allowance');
  });
});

// ─── processAllowances ──────────────────────────────────────────────────

describe('processAllowances', () => {
  it('returns unchanged when kid has zero allowance', () => {
    const kid = makeKid({ allowanceAmount: 0 });
    const { updated, changed, allowanceInfos } = processAllowances([kid]);
    expect(changed).toBe(false);
    expect(allowanceInfos).toHaveLength(0);
    expect(updated[0].balance).toBe(0);
    expect(updated[0].transactions).toHaveLength(0);
  });

  it('returns unchanged when kid has negative allowance', () => {
    const kid = makeKid({ allowanceAmount: -5 });
    const { changed } = processAllowances([kid]);
    expect(changed).toBe(false);
  });

  it('returns unchanged when allowance not yet due', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const kid = makeKid({
      lastAllowanceDate: new Date().toISOString(),
      allowanceFrequency: 'weekly',
    });
    const { changed } = processAllowances([kid]);
    expect(changed).toBe(false);
  });

  it('creates single weekly allowance when one is overdue', () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const kid = makeKid({
      allowanceAmount: 10,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: eightDaysAgo.toISOString(),
      balance: 50,
    });

    const { updated, changed, allowanceInfos } = processAllowances([kid]);

    expect(changed).toBe(true);
    expect(allowanceInfos).toHaveLength(1);
    expect(allowanceInfos[0].kidId).toBe('kid-1');
    expect(allowanceInfos[0].totalAmount).toBe(10);
    expect(allowanceInfos[0].count).toBe(1);
    expect(allowanceInfos[0].previousBalance).toBe(50);
    expect(updated[0].balance).toBe(60);
    expect(updated[0].transactions).toHaveLength(1);
    expect(updated[0].transactions[0].type).toBe('add');
    expect(updated[0].transactions[0].amount).toBe(10);
    expect(updated[0].transactions[0].category).toBe('allowance');
    expect(updated[0].transactions[0].description).toBe('Weekly allowance');
  });

  it('creates multiple weekly allowances for extended absence', () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const kid = makeKid({
      allowanceAmount: 5,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: thirtyDaysAgo.toISOString(),
      balance: 10,
    });

    const { updated, changed, allowanceInfos } = processAllowances([kid]);

    expect(changed).toBe(true);
    const expectedCount = allowanceInfos[0].count;
    expect(expectedCount).toBeGreaterThanOrEqual(3);
    expect(expectedCount).toBeLessThanOrEqual(5);
    expect(updated[0].balance).toBe(10 + expectedCount * 5);
    expect(updated[0].transactions).toHaveLength(expectedCount);
  });

  it('creates monthly allowance when one month has passed', () => {
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
    fortyDaysAgo.setDate(1); // First of month

    const kid = makeKid({
      allowanceAmount: 100,
      allowanceFrequency: 'monthly',
      lastAllowanceDate: fortyDaysAgo.toISOString(),
      balance: 200,
    });

    const { updated, changed, allowanceInfos } = processAllowances([kid]);

    expect(changed).toBe(true);
    expect(allowanceInfos[0].count).toBeGreaterThanOrEqual(1);
    expect(updated[0].balance).toBeGreaterThan(200);
    expect(updated[0].transactions.every((t) => t.description === 'Monthly allowance')).toBe(true);
  });

  it('uses createdAt for first-ever allowance (no lastAllowanceDate)', () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const kid = makeKid({
      allowanceAmount: 10,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: null,
      createdAt: twoWeeksAgo.toISOString(),
      balance: 0,
    });

    const { updated, changed } = processAllowances([kid]);

    expect(changed).toBe(true);
    expect(updated[0].balance).toBeGreaterThan(0);
    expect(updated[0].transactions.length).toBeGreaterThanOrEqual(1);
  });

  it('handles multiple kids with different frequencies', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const kids = [
      makeKid({
        id: 'kid-1',
        name: 'Alice',
        allowanceAmount: 10,
        allowanceFrequency: 'weekly',
        lastAllowanceDate: tenDaysAgo.toISOString(),
        balance: 50,
      }),
      makeKid({
        id: 'kid-2',
        name: 'Bob',
        allowanceAmount: 0,
        balance: 30,
      }),
    ];

    const { updated, changed, allowanceInfos } = processAllowances(kids);

    expect(changed).toBe(true);
    expect(allowanceInfos).toHaveLength(1);
    expect(allowanceInfos[0].kidId).toBe('kid-1');
    expect(updated[0].balance).toBeGreaterThan(50);
    expect(updated[1].balance).toBe(30);
  });

  it('correctly rounds balance to 2 decimal places', () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const kid = makeKid({
      allowanceAmount: 3.33,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: eightDaysAgo.toISOString(),
      balance: 0.01,
    });

    const { updated } = processAllowances([kid]);
    const balanceStr = updated[0].balance.toString();
    const decimals = balanceStr.includes('.') ? balanceStr.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it('preserves existing transactions', () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const existingTx = {
      id: 'existing-tx',
      type: 'add' as const,
      amount: 5,
      description: 'Gift',
      category: 'gift' as const,
      date: '2025-01-01T00:00:00.000Z',
    };

    const kid = makeKid({
      allowanceAmount: 10,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: eightDaysAgo.toISOString(),
      transactions: [existingTx],
    });

    const { updated } = processAllowances([kid]);
    expect(updated[0].transactions.length).toBeGreaterThan(1);
    expect(updated[0].transactions.some((t) => t.id === 'existing-tx')).toBe(true);
  });

  it('updates lastAllowanceDate to the most recent allowance', () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const kid = makeKid({
      allowanceAmount: 10,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: eightDaysAgo.toISOString(),
      balance: 0,
    });

    const { updated } = processAllowances([kid]);
    expect(updated[0].lastAllowanceDate).not.toBe(eightDaysAgo.toISOString());
    expect(new Date(updated[0].lastAllowanceDate!).getTime()).toBeGreaterThan(eightDaysAgo.getTime());
  });

  it('all new transactions have unique IDs', () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const kid = makeKid({
      allowanceAmount: 5,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: thirtyDaysAgo.toISOString(),
    });

    const { updated } = processAllowances([kid]);
    const ids = updated[0].transactions.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
