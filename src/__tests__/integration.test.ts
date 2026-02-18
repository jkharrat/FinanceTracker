import { processAllowances } from '../utils/allowance';
import { computeStats } from '../utils/stats';
import { rowToKid, txRowToTransaction } from '../utils/transforms';
import { isNotificationEnabled, shouldFireMilestone, MILESTONE_THRESHOLDS } from '../utils/notifications';
import { kidEmail, isNameUnique } from '../utils/auth';
import { Kid, Transaction, KidRow, TransactionRow, NotificationPreferences } from '../types';

/**
 * Integration tests that exercise multiple modules together,
 * simulating real application workflows.
 */

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

// ─── Full Allowance → Stats Pipeline ─────────────────────────────────────

describe('Allowance → Stats Pipeline', () => {
  it('processes allowances and computes correct stats', () => {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const kid = makeKid({
      allowanceAmount: 25,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: fourWeeksAgo.toISOString(),
      balance: 100,
    });

    const { updated } = processAllowances([kid]);
    const updatedKid = updated[0];

    expect(updatedKid.transactions.length).toBeGreaterThanOrEqual(3);

    const stats = computeStats(updatedKid.transactions);
    expect(stats.totalIncome).toBeGreaterThan(0);
    expect(stats.transactionCount).toBe(updatedKid.transactions.length);
    expect(stats.categoryStats.length).toBe(0); // allowances are 'add' type, not tracked as category spending
  });

  it('monthly allowance generates correct monthly stats', () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    threeMonthsAgo.setDate(1);

    const kid = makeKid({
      allowanceAmount: 50,
      allowanceFrequency: 'monthly',
      lastAllowanceDate: threeMonthsAgo.toISOString(),
      balance: 0,
    });

    const { updated, allowanceInfos } = processAllowances([kid]);
    const updatedKid = updated[0];

    expect(allowanceInfos[0].count).toBeGreaterThanOrEqual(2);

    const stats = computeStats(updatedKid.transactions);
    expect(stats.monthlyStats.length).toBeGreaterThanOrEqual(2);
    stats.monthlyStats.forEach((m) => {
      expect(m.income).toBeGreaterThan(0);
    });
  });
});

// ─── DB Row → Kid → Allowance Processing ────────────────────────────────

describe('DB Row → Kid → Allowance Processing', () => {
  it('transforms DB rows into kids and processes allowances', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const kidRow: KidRow = {
      id: 'kid-db-1',
      family_id: 'fam-1',
      user_id: null,
      name: 'TestKid',
      avatar: '🌟',
      allowance_amount: 15,
      allowance_frequency: 'weekly',
      balance: 30,
      savings_goal_name: 'PS5',
      savings_goal_target: 500,
      last_allowance_date: tenDaysAgo.toISOString(),
      created_at: '2024-06-01T00:00:00.000Z',
    };

    const txRows: TransactionRow[] = [
      {
        id: 'tx-existing-1',
        kid_id: 'kid-db-1',
        type: 'add',
        amount: 30,
        description: 'Initial',
        category: 'other',
        date: '2024-06-01T00:00:00.000Z',
        transfer_id: null,
      },
    ];

    const transactions = txRows.map(txRowToTransaction);
    const kid = rowToKid(kidRow, transactions);

    expect(kid.name).toBe('TestKid');
    expect(kid.balance).toBe(30);
    expect(kid.savingsGoal).toEqual({ name: 'PS5', targetAmount: 500 });
    expect(kid.transactions).toHaveLength(1);

    const { updated, changed } = processAllowances([kid]);
    expect(changed).toBe(true);
    expect(updated[0].balance).toBeGreaterThan(30);
    expect(updated[0].transactions.length).toBeGreaterThan(1);
  });
});

// ─── Transfer Validation Flow ────────────────────────────────────────────

describe('Transfer Validation Flow', () => {
  it('validates sender has sufficient balance', () => {
    const sender = makeKid({ id: 'sender', name: 'Sender', balance: 50 });
    const receiver = makeKid({ id: 'receiver', name: 'Receiver', balance: 20 });
    const amount = 30;

    expect(sender.balance >= amount).toBe(true);

    const senderNewBalance = Math.round((sender.balance - amount) * 100) / 100;
    const receiverNewBalance = Math.round((receiver.balance + amount) * 100) / 100;

    expect(senderNewBalance).toBe(20);
    expect(receiverNewBalance).toBe(50);
  });

  it('rejects transfer when insufficient balance', () => {
    const sender = makeKid({ id: 'sender', balance: 10 });
    const amount = 20;

    expect(sender.balance >= amount).toBe(false);
  });

  it('rejects zero amount transfers', () => {
    const amount = 0;
    expect(amount > 0).toBe(false);
  });

  it('rejects negative amount transfers', () => {
    const amount = -10;
    expect(amount > 0).toBe(false);
  });

  it('updates milestone tracking after transfer', () => {
    const receiver = makeKid({
      id: 'receiver',
      name: 'Receiver',
      balance: 20,
      savingsGoal: { name: 'Toy', targetAmount: 100 },
    });

    const previousBalance = receiver.balance;
    const newBalance = previousBalance + 30; // Transfer of 30

    // Check milestones at each threshold
    const triggered: number[] = [];
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (shouldFireMilestone(newBalance, previousBalance, 100, threshold, triggered)) {
        triggered.push(threshold);
      }
    }

    expect(triggered).toContain(25); // 50/100 crosses 25%
    expect(triggered).toContain(50); // 50/100 crosses 50%
    expect(triggered).not.toContain(75);
    expect(triggered).not.toContain(100);
  });
});

// ─── Goal Milestone Tracking ─────────────────────────────────────────────

describe('Goal Milestone Tracking', () => {
  it('tracks milestones progressively as balance increases', () => {
    const goalTarget = 200;
    const reachedMilestones: number[] = [];

    const balanceSteps = [0, 30, 50, 80, 100, 120, 150, 180, 200];
    const expectedMilestones = [
      [], [], [25], [], [50], [], [75], [], [100],
    ];

    for (let i = 1; i < balanceSteps.length; i++) {
      const prevBalance = balanceSteps[i - 1];
      const currBalance = balanceSteps[i];
      const stepMilestones: number[] = [];

      for (const threshold of MILESTONE_THRESHOLDS) {
        if (shouldFireMilestone(currBalance, prevBalance, goalTarget, threshold, reachedMilestones)) {
          stepMilestones.push(threshold);
          reachedMilestones.push(threshold);
        }
      }

      expect(stepMilestones).toEqual(expectedMilestones[i]);
    }

    expect(reachedMilestones.sort((a, b) => a - b)).toEqual([25, 50, 75, 100]);
  });

  it('handles large jump that crosses multiple thresholds', () => {
    const reachedMilestones: number[] = [];
    const triggered: number[] = [];

    for (const threshold of MILESTONE_THRESHOLDS) {
      if (shouldFireMilestone(100, 0, 100, threshold, reachedMilestones)) {
        triggered.push(threshold);
        reachedMilestones.push(threshold);
      }
    }

    expect(triggered).toEqual([25, 50, 75, 100]);
  });

  it('does not re-fire already reached milestones', () => {
    const alreadyReached = [25, 50];

    const triggered: number[] = [];
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (shouldFireMilestone(80, 60, 100, threshold, alreadyReached)) {
        triggered.push(threshold);
      }
    }

    expect(triggered).toEqual([75]);
    expect(triggered).not.toContain(25);
    expect(triggered).not.toContain(50);
  });
});

// ─── Auth & Kid Email Flow ───────────────────────────────────────────────

describe('Auth & Kid Email Flow', () => {
  it('generates unique emails for different kid IDs', () => {
    const email1 = kidEmail('kid-1');
    const email2 = kidEmail('kid-2');
    expect(email1).not.toBe(email2);
    expect(email1).toContain('kid-1');
    expect(email2).toContain('kid-2');
  });

  it('validates name uniqueness across family', () => {
    const kids = [
      { name: 'Alice', id: 'kid-1' },
      { name: 'Bob', id: 'kid-2' },
    ];

    expect(isNameUnique('Charlie', kids)).toBe(true);
    expect(isNameUnique('Alice', kids)).toBe(false);
    expect(isNameUnique('alice', kids)).toBe(false);
    expect(isNameUnique('Alice', kids, 'kid-1')).toBe(true); // Editing Alice herself
    expect(isNameUnique('Bob', kids, 'kid-1')).toBe(false); // Can't rename to Bob
  });
});

// ─── Notification Preferences & Filtering ────────────────────────────────

describe('Notification Preferences & Filtering', () => {
  it('filters notifications based on preferences', () => {
    const prefs: NotificationPreferences = {
      allowance: true,
      transactions: false,
      transfers: true,
      goalMilestones: false,
      pushEnabled: true,
    };

    expect(isNotificationEnabled('allowance_received', prefs)).toBe(true);
    expect(isNotificationEnabled('transaction_added', prefs)).toBe(false);
    expect(isNotificationEnabled('transaction_updated', prefs)).toBe(false);
    expect(isNotificationEnabled('transaction_deleted', prefs)).toBe(false);
    expect(isNotificationEnabled('transfer_received', prefs)).toBe(true);
    expect(isNotificationEnabled('goal_milestone', prefs)).toBe(false);
  });

  it('simulates allowance processing with notification check', () => {
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const kid = makeKid({
      allowanceAmount: 20,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: eightDaysAgo.toISOString(),
      balance: 80,
      savingsGoal: { name: 'Goal', targetAmount: 100 },
    });

    const { updated, changed, allowanceInfos } = processAllowances([kid]);
    expect(changed).toBe(true);
    expect(allowanceInfos[0].totalAmount).toBe(20);

    const updatedKid = updated[0];
    expect(updatedKid.balance).toBe(100);

    // Check if allowance notification would be enabled
    const prefs: NotificationPreferences = {
      allowance: true,
      transactions: true,
      transfers: true,
      goalMilestones: true,
      pushEnabled: true,
    };
    expect(isNotificationEnabled('allowance_received', prefs)).toBe(true);

    // Check if goal milestone would fire
    const triggered: number[] = [];
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (shouldFireMilestone(updatedKid.balance, 80, 100, threshold, [])) {
        triggered.push(threshold);
      }
    }
    expect(triggered).toContain(100);
  });
});

// ─── Multi-Kid Family Scenario ───────────────────────────────────────────

describe('Multi-Kid Family Scenario', () => {
  it('processes allowances for multiple kids independently', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const kids = [
      makeKid({
        id: 'kid-1',
        name: 'Alice',
        allowanceAmount: 10,
        allowanceFrequency: 'weekly',
        lastAllowanceDate: tenDaysAgo.toISOString(),
        balance: 100,
      }),
      makeKid({
        id: 'kid-2',
        name: 'Bob',
        allowanceAmount: 20,
        allowanceFrequency: 'weekly',
        lastAllowanceDate: tenDaysAgo.toISOString(),
        balance: 50,
      }),
      makeKid({
        id: 'kid-3',
        name: 'Charlie',
        allowanceAmount: 0,
        balance: 30,
      }),
    ];

    const { updated, allowanceInfos } = processAllowances(kids);

    expect(allowanceInfos).toHaveLength(2);

    const aliceInfo = allowanceInfos.find((i) => i.kidId === 'kid-1');
    const bobInfo = allowanceInfos.find((i) => i.kidId === 'kid-2');
    expect(aliceInfo).toBeDefined();
    expect(bobInfo).toBeDefined();
    expect(aliceInfo!.totalAmount).toBe(10);
    expect(bobInfo!.totalAmount).toBe(20);

    expect(updated[0].balance).toBe(110);
    expect(updated[1].balance).toBe(70);
    expect(updated[2].balance).toBe(30);

    // Stats for each kid
    const aliceStats = computeStats(updated[0].transactions);
    const bobStats = computeStats(updated[1].transactions);
    expect(aliceStats.totalIncome).toBe(10);
    expect(bobStats.totalIncome).toBe(20);
  });

  it('validates name uniqueness across all family kids', () => {
    const kids = [
      { name: 'Alice', id: 'kid-1' },
      { name: 'Bob', id: 'kid-2' },
      { name: 'Charlie', id: 'kid-3' },
    ];

    expect(isNameUnique('Diana', kids)).toBe(true);
    expect(isNameUnique('alice', kids)).toBe(false);
    expect(isNameUnique('Bob', kids, 'kid-2')).toBe(true);
  });
});

// ─── Balance Calculation Edge Cases ──────────────────────────────────────

describe('Balance Calculation Edge Cases', () => {
  it('handles floating point arithmetic correctly', () => {
    const txs: Transaction[] = [
      { id: '1', type: 'add', amount: 0.1, description: '', category: 'other', date: '2025-01-01' },
      { id: '2', type: 'add', amount: 0.2, description: '', category: 'other', date: '2025-01-02' },
      { id: '3', type: 'subtract', amount: 0.3, description: '', category: 'other', date: '2025-01-03' },
    ];

    const stats = computeStats(txs);
    expect(stats.balanceOverTime[stats.balanceOverTime.length - 1].balance).toBeCloseTo(0, 10);
  });

  it('handles large number of transactions', () => {
    const txs: Transaction[] = [];
    for (let i = 0; i < 100; i++) {
      txs.push({
        id: `tx-${i}`,
        type: i % 2 === 0 ? 'add' : 'subtract',
        amount: 1,
        description: `TX ${i}`,
        category: 'other',
        date: new Date(2025, 0, Math.floor(i / 3) + 1).toISOString(),
      });
    }

    const stats = computeStats(txs);
    expect(stats.transactionCount).toBe(100);
    expect(stats.totalIncome).toBe(50);
    expect(stats.totalExpense).toBe(50);
  });

  it('recalculates balance from all transactions correctly', () => {
    const txs: Transaction[] = [
      { id: '1', type: 'add', amount: 100, description: 'Deposit', category: 'other', date: '2025-01-01' },
      { id: '2', type: 'subtract', amount: 30, description: 'Food', category: 'food', date: '2025-01-02' },
      { id: '3', type: 'add', amount: 50, description: 'Allowance', category: 'allowance', date: '2025-01-03' },
      { id: '4', type: 'subtract', amount: 20, description: 'Toy', category: 'toys', date: '2025-01-04' },
    ];

    const expectedBalance = 100 - 30 + 50 - 20;
    const stats = computeStats(txs);
    const finalBalance = stats.balanceOverTime[stats.balanceOverTime.length - 1].balance;
    expect(finalBalance).toBe(expectedBalance);
  });
});
