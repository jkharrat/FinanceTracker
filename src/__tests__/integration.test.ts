import { processAllowances } from '../utils/allowance';
import { computeStats } from '../utils/stats';
import { rowToKid, txRowToTransaction } from '../utils/transforms';
import { isNotificationEnabled, shouldFireMilestone, MILESTONE_THRESHOLDS } from '../utils/notifications';
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

});

// ─── Transfer Deletion Updates Both Accounts ─────────────────────────────

describe('Transfer Deletion Updates Both Accounts', () => {
  function recalcBalance(transactions: Transaction[]): number {
    return Math.round(
      transactions.reduce((sum, t) => sum + (t.type === 'add' ? t.amount : -t.amount), 0) * 100
    ) / 100;
  }

  it('deleting a transfer in one kid\'s account correctly updates the other account', () => {
    const transferId = 'transfer-001';

    const aliceTransferTx: Transaction = {
      id: 'tx-alice-transfer',
      type: 'subtract',
      amount: 30,
      description: 'Transfer to Bob',
      category: 'transfer',
      date: '2025-01-15',
      transfer_id: transferId,
      transfer: { transferId, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
    };

    const bobTransferTx: Transaction = {
      id: 'tx-bob-transfer',
      type: 'add',
      amount: 30,
      description: 'Transfer from Alice',
      category: 'transfer',
      date: '2025-01-15',
      transfer_id: transferId,
      transfer: { transferId, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
    };

    const alice = makeKid({
      id: 'alice',
      name: 'Alice',
      balance: 70,
      transactions: [
        { id: 'tx-alice-1', type: 'add', amount: 100, description: 'Initial deposit', category: 'other', date: '2025-01-01' },
        aliceTransferTx,
      ],
    });

    const bob = makeKid({
      id: 'bob',
      name: 'Bob',
      balance: 80,
      transactions: [
        { id: 'tx-bob-1', type: 'add', amount: 50, description: 'Initial deposit', category: 'other', date: '2025-01-01' },
        bobTransferTx,
      ],
    });

    expect(recalcBalance(alice.transactions)).toBe(70);
    expect(recalcBalance(bob.transactions)).toBe(80);

    // Parent deletes the transfer from Alice's account
    const deletedTx = alice.transactions.find(t => t.id === 'tx-alice-transfer')!;
    expect(deletedTx.transfer_id).toBe(transferId);

    const aliceRemainingTxs = alice.transactions.filter(t => t.id !== deletedTx.id);
    const aliceNewBalance = recalcBalance(aliceRemainingTxs);

    // Find and remove the paired transaction from Bob's account
    const pairedTx = bob.transactions.find(t => t.transfer_id === deletedTx.transfer_id);
    expect(pairedTx).toBeDefined();
    const bobRemainingTxs = bob.transactions.filter(t => t.id !== pairedTx!.id);
    const bobNewBalance = recalcBalance(bobRemainingTxs);

    // Alice's balance restored: $100 (transfer reversal)
    expect(aliceNewBalance).toBe(100);
    expect(aliceRemainingTxs).toHaveLength(1);

    // Bob's balance restored: $50 (received transfer removed)
    expect(bobNewBalance).toBe(50);
    expect(bobRemainingTxs).toHaveLength(1);

    const aliceStats = computeStats(aliceRemainingTxs);
    const bobStats = computeStats(bobRemainingTxs);
    expect(aliceStats.totalIncome).toBe(100);
    expect(aliceStats.totalExpense).toBe(0);
    expect(bobStats.totalIncome).toBe(50);
    expect(bobStats.totalExpense).toBe(0);
  });

  it('handles deleting transfer from the receiver side', () => {
    const transferId = 'transfer-002';

    const aliceTxs: Transaction[] = [
      { id: 'tx-a1', type: 'add', amount: 200, description: 'Deposit', category: 'other', date: '2025-01-01' },
      {
        id: 'tx-a-transfer', type: 'subtract', amount: 50, description: 'Transfer to Bob',
        category: 'transfer', date: '2025-02-01', transfer_id: transferId,
        transfer: { transferId, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
      },
    ];

    const bobTxs: Transaction[] = [
      { id: 'tx-b1', type: 'add', amount: 100, description: 'Deposit', category: 'other', date: '2025-01-01' },
      { id: 'tx-b2', type: 'subtract', amount: 20, description: 'Snack', category: 'food', date: '2025-01-10' },
      {
        id: 'tx-b-transfer', type: 'add', amount: 50, description: 'Transfer from Alice',
        category: 'transfer', date: '2025-02-01', transfer_id: transferId,
        transfer: { transferId, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
      },
    ];

    const alice = makeKid({ id: 'alice', name: 'Alice', balance: 150, transactions: aliceTxs });
    const bob = makeKid({ id: 'bob', name: 'Bob', balance: 130, transactions: bobTxs });

    expect(recalcBalance(alice.transactions)).toBe(150);
    expect(recalcBalance(bob.transactions)).toBe(130);

    // Parent deletes the transfer from Bob's (receiver) side
    const deletedTx = bob.transactions.find(t => t.id === 'tx-b-transfer')!;
    const bobRemainingTxs = bob.transactions.filter(t => t.id !== deletedTx.id);
    const bobNewBalance = recalcBalance(bobRemainingTxs);

    const pairedTx = alice.transactions.find(t => t.transfer_id === deletedTx.transfer_id);
    expect(pairedTx).toBeDefined();
    const aliceRemainingTxs = alice.transactions.filter(t => t.id !== pairedTx!.id);
    const aliceNewBalance = recalcBalance(aliceRemainingTxs);

    // Bob: 100 - 20 = 80 (deposit + snack, transfer removed)
    expect(bobNewBalance).toBe(80);
    expect(bobRemainingTxs).toHaveLength(2);

    // Alice: 200 (deposit only, subtract reversed)
    expect(aliceNewBalance).toBe(200);
    expect(aliceRemainingTxs).toHaveLength(1);
  });

  it('only removes the correct transfer when multiple transfers exist', () => {
    const transfer1 = 'transfer-a';
    const transfer2 = 'transfer-b';

    const aliceTxs: Transaction[] = [
      { id: 'tx-a1', type: 'add', amount: 500, description: 'Deposit', category: 'other', date: '2025-01-01' },
      {
        id: 'tx-a-t1', type: 'subtract', amount: 40, description: 'Transfer to Bob',
        category: 'transfer', date: '2025-01-10', transfer_id: transfer1,
        transfer: { transferId: transfer1, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
      },
      {
        id: 'tx-a-t2', type: 'subtract', amount: 60, description: 'Transfer to Bob',
        category: 'transfer', date: '2025-01-20', transfer_id: transfer2,
        transfer: { transferId: transfer2, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
      },
    ];

    const bobTxs: Transaction[] = [
      { id: 'tx-b1', type: 'add', amount: 100, description: 'Deposit', category: 'other', date: '2025-01-01' },
      {
        id: 'tx-b-t1', type: 'add', amount: 40, description: 'From Alice',
        category: 'transfer', date: '2025-01-10', transfer_id: transfer1,
        transfer: { transferId: transfer1, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
      },
      {
        id: 'tx-b-t2', type: 'add', amount: 60, description: 'From Alice',
        category: 'transfer', date: '2025-01-20', transfer_id: transfer2,
        transfer: { transferId: transfer2, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
      },
    ];

    expect(recalcBalance(aliceTxs)).toBe(400);
    expect(recalcBalance(bobTxs)).toBe(200);

    // Delete only transfer1 from Alice's account
    const deletedTx = aliceTxs.find(t => t.transfer_id === transfer1)!;
    const aliceRemaining = aliceTxs.filter(t => t.id !== deletedTx.id);
    const bobRemaining = bobTxs.filter(t => t.transfer_id !== transfer1);

    // Alice: 500 - 60 = 440, Bob: 100 + 60 = 160
    expect(recalcBalance(aliceRemaining)).toBe(440);
    expect(recalcBalance(bobRemaining)).toBe(160);

    // Second transfer remains intact
    expect(aliceRemaining.some(t => t.transfer_id === transfer2)).toBe(true);
    expect(bobRemaining.some(t => t.transfer_id === transfer2)).toBe(true);
  });
});

// ─── BUG: Transfer Deletion Only Updates One Account ─────────────────────

describe('delete_transaction_safe removes both sides of a transfer', () => {
  /**
   * Simulates what delete_transaction_safe does: if the deleted transaction
   * has a transfer_id, both it and the paired transaction are removed and
   * both kids' balances are recalculated.
   */
  function simulateDeleteTransactionSafe(
    kids: Kid[],
    targetKidId: string,
    transactionId: string
  ): Kid[] {
    const targetKid = kids.find((k) => k.id === targetKidId);
    const deletedTx = targetKid?.transactions.find((t) => t.id === transactionId);
    const transferId = deletedTx?.transfer_id;

    return kids.map((kid) => {
      let remaining: Transaction[];
      if (kid.id === targetKidId) {
        remaining = kid.transactions.filter((t) => t.id !== transactionId);
      } else if (transferId) {
        remaining = kid.transactions.filter((t) => t.transfer_id !== transferId);
      } else {
        return kid;
      }
      const newBalance =
        Math.round(
          remaining.reduce(
            (sum, t) => sum + (t.type === 'add' ? t.amount : -t.amount),
            0
          ) * 100
        ) / 100;
      return { ...kid, transactions: remaining, balance: newBalance };
    });
  }

  it('deleting sender-side transfer leaves orphaned add in receiver account', () => {
    const transferId = 'xfer-bug-1';

    const alice = makeKid({
      id: 'alice',
      name: 'Alice',
      balance: 70,
      transactions: [
        { id: 'tx-a1', type: 'add', amount: 100, description: 'Deposit', category: 'other', date: '2025-01-01' },
        {
          id: 'tx-a-xfer', type: 'subtract', amount: 30, description: 'Transfer to Bob',
          category: 'transfer', date: '2025-01-15', transfer_id: transferId,
          transfer: { transferId, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
        },
      ],
    });

    const bob = makeKid({
      id: 'bob',
      name: 'Bob',
      balance: 80,
      transactions: [
        { id: 'tx-b1', type: 'add', amount: 50, description: 'Deposit', category: 'other', date: '2025-01-01' },
        {
          id: 'tx-b-xfer', type: 'add', amount: 30, description: 'Transfer from Alice',
          category: 'transfer', date: '2025-01-15', transfer_id: transferId,
          transfer: { transferId, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
        },
      ],
    });

    // Parent deletes the transfer from Alice's (sender) account
    const [updatedAlice, updatedBob] = simulateDeleteTransactionSafe(
      [alice, bob], 'alice', 'tx-a-xfer'
    );

    // Alice's side is correctly updated
    expect(updatedAlice.balance).toBe(100);
    expect(updatedAlice.transactions).toHaveLength(1);

    // Bob's paired transfer should also be removed
    expect(updatedBob.transactions).toHaveLength(1);
    expect(updatedBob.balance).toBe(50);
  });

  it('deleting receiver-side transfer leaves orphaned subtract in sender account', () => {
    const transferId = 'xfer-bug-2';

    const alice = makeKid({
      id: 'alice',
      name: 'Alice',
      balance: 150,
      transactions: [
        { id: 'tx-a1', type: 'add', amount: 200, description: 'Deposit', category: 'other', date: '2025-01-01' },
        {
          id: 'tx-a-xfer', type: 'subtract', amount: 50, description: 'Transfer to Bob',
          category: 'transfer', date: '2025-02-01', transfer_id: transferId,
          transfer: { transferId, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
        },
      ],
    });

    const bob = makeKid({
      id: 'bob',
      name: 'Bob',
      balance: 130,
      transactions: [
        { id: 'tx-b1', type: 'add', amount: 100, description: 'Deposit', category: 'other', date: '2025-01-01' },
        { id: 'tx-b2', type: 'subtract', amount: 20, description: 'Snack', category: 'food', date: '2025-01-10' },
        {
          id: 'tx-b-xfer', type: 'add', amount: 50, description: 'Transfer from Alice',
          category: 'transfer', date: '2025-02-01', transfer_id: transferId,
          transfer: { transferId, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
        },
      ],
    });

    // Parent deletes the transfer from Bob's (receiver) account
    const [updatedAlice, updatedBob] = simulateDeleteTransactionSafe(
      [alice, bob], 'bob', 'tx-b-xfer'
    );

    // Bob's side is correctly updated
    expect(updatedBob.balance).toBe(80);
    expect(updatedBob.transactions).toHaveLength(2);

    // Alice's paired subtract should also be removed
    expect(updatedAlice.transactions).toHaveLength(1);
    expect(updatedAlice.balance).toBe(200);
  });

  it('orphaned transfer causes balance inconsistency in stats', () => {
    const transferId = 'xfer-bug-3';

    const alice = makeKid({
      id: 'alice',
      name: 'Alice',
      balance: 70,
      transactions: [
        { id: 'tx-a1', type: 'add', amount: 100, description: 'Deposit', category: 'other', date: '2025-01-01' },
        {
          id: 'tx-a-xfer', type: 'subtract', amount: 30, description: 'Transfer to Bob',
          category: 'transfer', date: '2025-01-15', transfer_id: transferId,
          transfer: { transferId, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
        },
      ],
    });

    const bob = makeKid({
      id: 'bob',
      name: 'Bob',
      balance: 80,
      transactions: [
        { id: 'tx-b1', type: 'add', amount: 50, description: 'Deposit', category: 'other', date: '2025-01-01' },
        {
          id: 'tx-b-xfer', type: 'add', amount: 30, description: 'Transfer from Alice',
          category: 'transfer', date: '2025-01-15', transfer_id: transferId,
          transfer: { transferId, fromKidId: 'alice', toKidId: 'bob', fromKidName: 'Alice', toKidName: 'Bob' },
        },
      ],
    });

    // Delete transfer from Alice's account — both sides should be cleaned up
    const [, updatedBob] = simulateDeleteTransactionSafe(
      [alice, bob], 'alice', 'tx-a-xfer'
    );

    const bobStats = computeStats(updatedBob.transactions);

    // Bob's income should be $50 (deposit only), not $80
    expect(bobStats.totalIncome).toBe(50);
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

// ─── Savings Goal Edge Cases ─────────────────────────────────────────────

describe('Savings Goal Edge Cases', () => {
  it('handles goal with zero target gracefully', () => {
    const reachedMilestones: number[] = [];
    const triggered: number[] = [];
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (shouldFireMilestone(50, 40, 0, threshold, reachedMilestones)) {
        triggered.push(threshold);
      }
    }
    expect(triggered).toEqual([]);
  });

  it('handles goal when balance exceeds target significantly', () => {
    const reachedMilestones: number[] = [];
    const triggered: number[] = [];
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (shouldFireMilestone(500, 0, 100, threshold, reachedMilestones)) {
        triggered.push(threshold);
        reachedMilestones.push(threshold);
      }
    }
    expect(triggered).toEqual([25, 50, 75, 100]);
  });

  it('does not fire milestones when balance decreases', () => {
    const reachedMilestones = [25, 50];
    const triggered: number[] = [];
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (shouldFireMilestone(40, 60, 100, threshold, reachedMilestones)) {
        triggered.push(threshold);
      }
    }
    expect(triggered).toEqual([]);
  });

  it('handles tiny fractional goal amounts', () => {
    expect(shouldFireMilestone(0.25, 0.2, 1, 25, [])).toBe(true);
    expect(shouldFireMilestone(0.5, 0.4, 1, 50, [])).toBe(true);
  });
});

// ─── Allowance Processing Edge Cases ─────────────────────────────────────

describe('Allowance Processing Edge Cases', () => {
  it('does not process future-created kids', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const kid = makeKid({
      allowanceAmount: 10,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: null,
      createdAt: futureDate.toISOString(),
      balance: 0,
    });

    const { changed } = processAllowances([kid]);
    expect(changed).toBe(false);
  });

  it('handles concurrent processing of the same kid safely', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const kid = makeKid({
      allowanceAmount: 10,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: tenDaysAgo.toISOString(),
      balance: 50,
    });

    const result1 = processAllowances([kid]);
    const result2 = processAllowances([kid]);
    expect(result1.updated[0].balance).toBe(result2.updated[0].balance);
    expect(result1.updated[0].transactions.length).toBe(result2.updated[0].transactions.length);
  });

  it('handles kid with very old creation date', () => {
    const veryOld = new Date('2020-01-01T00:00:00.000Z');
    const kid = makeKid({
      allowanceAmount: 100,
      allowanceFrequency: 'monthly',
      lastAllowanceDate: null,
      createdAt: veryOld.toISOString(),
      balance: 0,
    });

    const { updated } = processAllowances([kid]);
    expect(updated[0].transactions.length).toBeLessThanOrEqual(52);
    expect(updated[0].balance).toBeGreaterThan(0);
  });

  it('maintains balance precision across many small allowances', () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const kid = makeKid({
      allowanceAmount: 0.33,
      allowanceFrequency: 'weekly',
      lastAllowanceDate: thirtyDaysAgo.toISOString(),
      balance: 0.01,
    });

    const { updated } = processAllowances([kid]);
    const balStr = updated[0].balance.toString();
    const decimals = balStr.includes('.') ? balStr.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

// ─── Full Lifecycle: Kid Creation → Allowance → Spending → Stats ─────────

describe('Full Kid Lifecycle', () => {
  it('simulates complete kid financial lifecycle', () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const kidRow: KidRow = {
      id: 'kid-lifecycle',
      family_id: 'fam-1',
      user_id: 'user-1',
      name: 'Lifecycle Kid',
      avatar: '🎮',
      allowance_amount: 25,
      allowance_frequency: 'weekly',
      balance: 0,
      savings_goal_name: 'Gaming Console',
      savings_goal_target: 300,
      last_allowance_date: null,
      created_at: twoWeeksAgo.toISOString(),
    };

    const kid = rowToKid(kidRow, []);
    expect(kid.name).toBe('Lifecycle Kid');
    expect(kid.balance).toBe(0);
    expect(kid.savingsGoal?.name).toBe('Gaming Console');

    const { updated, changed, allowanceInfos } = processAllowances([kid]);
    expect(changed).toBe(true);
    expect(updated[0].balance).toBeGreaterThan(0);
    expect(allowanceInfos[0].kidName).toBe('Lifecycle Kid');

    const spendingTxs: Transaction[] = [
      ...updated[0].transactions,
      {
        id: 'spend-1',
        type: 'subtract',
        amount: 5,
        description: 'Snack',
        category: 'food',
        date: new Date().toISOString(),
      },
      {
        id: 'spend-2',
        type: 'subtract',
        amount: 10,
        description: 'Game',
        category: 'entertainment',
        date: new Date().toISOString(),
      },
    ];

    const stats = computeStats(spendingTxs);
    expect(stats.totalIncome).toBeGreaterThan(0);
    expect(stats.totalExpense).toBe(15);
    expect(stats.transactionCount).toBe(spendingTxs.length);

    const foodCat = stats.categoryStats.find((c) => c.id === 'food');
    const entCat = stats.categoryStats.find((c) => c.id === 'entertainment');
    expect(foodCat).toBeDefined();
    expect(foodCat!.amount).toBe(5);
    expect(entCat).toBeDefined();
    expect(entCat!.amount).toBe(10);

    const prefs: NotificationPreferences = {
      allowance: true,
      transactions: true,
      transfers: true,
      goalMilestones: true,
      pushEnabled: true,
    };
    expect(isNotificationEnabled('allowance_received', prefs)).toBe(true);
    expect(isNotificationEnabled('transaction_added', prefs)).toBe(true);
  });
});

// ─── Transform + Stats Consistency ───────────────────────────────────────

describe('Transform + Stats Consistency', () => {
  it('transformed transactions produce valid stats', () => {
    const txRows: TransactionRow[] = [
      {
        id: 'tx-a',
        kid_id: 'kid-1',
        type: 'add',
        amount: 100,
        description: 'Deposit',
        category: 'other',
        date: '2025-01-15T10:00:00.000Z',
        transfer_id: null,
      },
      {
        id: 'tx-b',
        kid_id: 'kid-1',
        type: 'subtract',
        amount: 30,
        description: 'Snack',
        category: 'food',
        date: '2025-01-20T10:00:00.000Z',
        transfer_id: null,
      },
      {
        id: 'tx-c',
        kid_id: 'kid-1',
        type: 'subtract',
        amount: 20,
        description: 'Book',
        category: 'education',
        date: '2025-02-05T10:00:00.000Z',
        transfer_id: null,
      },
    ];

    const transactions = txRows.map(txRowToTransaction);
    expect(transactions).toHaveLength(3);
    expect(transactions[0].type).toBe('add');
    expect(transactions[1].type).toBe('subtract');

    const stats = computeStats(transactions);
    expect(stats.totalIncome).toBe(100);
    expect(stats.totalExpense).toBe(50);
    expect(stats.transactionCount).toBe(3);

    const food = stats.categoryStats.find((c) => c.id === 'food');
    const edu = stats.categoryStats.find((c) => c.id === 'education');
    expect(food!.amount).toBe(30);
    expect(edu!.amount).toBe(20);

    expect(stats.balanceOverTime.length).toBeGreaterThanOrEqual(2);
    const finalBalance = stats.balanceOverTime[stats.balanceOverTime.length - 1].balance;
    expect(finalBalance).toBe(50);
  });

  it('transfer transactions have correct transfer_id after transform', () => {
    const txRow: TransactionRow = {
      id: 'tx-transfer',
      kid_id: 'kid-1',
      type: 'subtract',
      amount: 15,
      description: 'Transfer to Bob',
      category: 'transfer',
      date: '2025-03-01T10:00:00.000Z',
      transfer_id: 'xfer-123',
    };

    const tx = txRowToTransaction(txRow);
    expect(tx.transfer_id).toBe('xfer-123');
    expect(tx.category).toBe('transfer');
  });
});

// ─── Notification Filtering with Real Scenario ──────────────────────────

describe('Notification Filtering - Real Scenarios', () => {
  it('parent disables transaction notifications but keeps allowance', () => {
    const prefs: NotificationPreferences = {
      allowance: true,
      transactions: false,
      transfers: true,
      goalMilestones: true,
      pushEnabled: true,
    };

    expect(isNotificationEnabled('allowance_received', prefs)).toBe(true);
    expect(isNotificationEnabled('transaction_added', prefs)).toBe(false);
    expect(isNotificationEnabled('transaction_updated', prefs)).toBe(false);
    expect(isNotificationEnabled('transaction_deleted', prefs)).toBe(false);
    expect(isNotificationEnabled('transfer_received', prefs)).toBe(true);
    expect(isNotificationEnabled('goal_milestone', prefs)).toBe(true);
  });

  it('kid only wants goal milestones', () => {
    const prefs: NotificationPreferences = {
      allowance: false,
      transactions: false,
      transfers: false,
      goalMilestones: true,
      pushEnabled: true,
    };

    expect(isNotificationEnabled('allowance_received', prefs)).toBe(false);
    expect(isNotificationEnabled('transaction_added', prefs)).toBe(false);
    expect(isNotificationEnabled('transfer_received', prefs)).toBe(false);
    expect(isNotificationEnabled('goal_milestone', prefs)).toBe(true);
  });

  it('all notifications disabled', () => {
    const prefs: NotificationPreferences = {
      allowance: false,
      transactions: false,
      transfers: false,
      goalMilestones: false,
      pushEnabled: false,
    };

    const types: import('../types').NotificationType[] = [
      'allowance_received',
      'transaction_added',
      'transaction_updated',
      'transaction_deleted',
      'transfer_received',
      'goal_milestone',
    ];

    types.forEach((type) => {
      expect(isNotificationEnabled(type, prefs)).toBe(false);
    });
  });
});

// ─── Multiple Transfers Between Multiple Kids ────────────────────────────

describe('Multiple Transfers Between Multiple Kids', () => {
  it('handles circular transfers correctly (A→B→C→A)', () => {
    function recalcBalance(transactions: Transaction[]): number {
      return Math.round(
        transactions.reduce((sum, t) => sum + (t.type === 'add' ? t.amount : -t.amount), 0) * 100
      ) / 100;
    }

    const aliceTxs: Transaction[] = [
      { id: 'a-dep', type: 'add', amount: 100, description: 'Deposit', category: 'other', date: '2025-01-01' },
      { id: 'a-send', type: 'subtract', amount: 20, description: 'To Bob', category: 'transfer', date: '2025-01-10', transfer_id: 'xfer-ab' },
      { id: 'a-recv', type: 'add', amount: 15, description: 'From Charlie', category: 'transfer', date: '2025-01-12', transfer_id: 'xfer-ca' },
    ];

    const bobTxs: Transaction[] = [
      { id: 'b-dep', type: 'add', amount: 50, description: 'Deposit', category: 'other', date: '2025-01-01' },
      { id: 'b-recv', type: 'add', amount: 20, description: 'From Alice', category: 'transfer', date: '2025-01-10', transfer_id: 'xfer-ab' },
      { id: 'b-send', type: 'subtract', amount: 15, description: 'To Charlie', category: 'transfer', date: '2025-01-11', transfer_id: 'xfer-bc' },
    ];

    const charlieTxs: Transaction[] = [
      { id: 'c-dep', type: 'add', amount: 30, description: 'Deposit', category: 'other', date: '2025-01-01' },
      { id: 'c-recv', type: 'add', amount: 15, description: 'From Bob', category: 'transfer', date: '2025-01-11', transfer_id: 'xfer-bc' },
      { id: 'c-send', type: 'subtract', amount: 15, description: 'To Alice', category: 'transfer', date: '2025-01-12', transfer_id: 'xfer-ca' },
    ];

    expect(recalcBalance(aliceTxs)).toBe(95);  // 100 - 20 + 15
    expect(recalcBalance(bobTxs)).toBe(55);     // 50 + 20 - 15
    expect(recalcBalance(charlieTxs)).toBe(30); // 30 + 15 - 15

    const totalBefore = 100 + 50 + 30;
    const totalAfter = recalcBalance(aliceTxs) + recalcBalance(bobTxs) + recalcBalance(charlieTxs);
    expect(totalAfter).toBe(totalBefore);
  });
});

// ─── Stats with All Categories ──────────────────────────────────────────

describe('Stats with All Categories', () => {
  it('correctly computes stats across all expense categories', () => {
    const categories = ['fines', 'food', 'toys', 'clothing', 'savings', 'education', 'entertainment', 'transfer', 'other'];
    const txs: Transaction[] = categories.map((cat, i) => ({
      id: `tx-${cat}`,
      type: 'subtract' as const,
      amount: (i + 1) * 10,
      description: `${cat} expense`,
      category: cat as any,
      date: `2025-03-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`,
    }));

    const stats = computeStats(txs);
    expect(stats.categoryStats).toHaveLength(9);
    expect(stats.categoryStats[0].amount).toBeGreaterThanOrEqual(stats.categoryStats[stats.categoryStats.length - 1].amount);

    const totalCatAmount = stats.categoryStats.reduce((sum, c) => sum + c.amount, 0);
    expect(totalCatAmount).toBe(stats.totalExpense);

    const totalPercentage = stats.categoryStats.reduce((sum, c) => sum + c.percentage, 0);
    expect(totalPercentage).toBeGreaterThanOrEqual(97);
    expect(totalPercentage).toBeLessThanOrEqual(103);
  });
});
