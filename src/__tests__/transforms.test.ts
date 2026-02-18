import { rowToKid, txRowToTransaction, rowToNotification } from '../utils/transforms';
import { KidRow, TransactionRow, NotificationRow } from '../types';

// ─── rowToKid ────────────────────────────────────────────────────────────

describe('rowToKid', () => {
  const baseRow: KidRow = {
    id: 'kid-123',
    family_id: 'fam-456',
    user_id: 'user-789',
    name: 'Alice',
    avatar: '😊',
    allowance_amount: 15.5,
    allowance_frequency: 'weekly',
    balance: 42.75,
    savings_goal_name: 'Bicycle',
    savings_goal_target: 100,
    last_allowance_date: '2025-06-01T00:00:00.000Z',
    created_at: '2025-01-01T00:00:00.000Z',
  };

  it('maps all basic fields correctly', () => {
    const kid = rowToKid(baseRow, []);
    expect(kid.id).toBe('kid-123');
    expect(kid.family_id).toBe('fam-456');
    expect(kid.user_id).toBe('user-789');
    expect(kid.name).toBe('Alice');
    expect(kid.avatar).toBe('😊');
    expect(kid.allowanceAmount).toBe(15.5);
    expect(kid.allowanceFrequency).toBe('weekly');
    expect(kid.balance).toBe(42.75);
    expect(kid.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(kid.lastAllowanceDate).toBe('2025-06-01T00:00:00.000Z');
  });

  it('converts numeric strings to numbers', () => {
    const row = { ...baseRow, allowance_amount: '15.5' as any, balance: '42.75' as any };
    const kid = rowToKid(row, []);
    expect(kid.allowanceAmount).toBe(15.5);
    expect(kid.balance).toBe(42.75);
  });

  it('creates savingsGoal when both name and target are present', () => {
    const kid = rowToKid(baseRow, []);
    expect(kid.savingsGoal).toEqual({ name: 'Bicycle', targetAmount: 100 });
  });

  it('returns undefined savingsGoal when name is null', () => {
    const row = { ...baseRow, savings_goal_name: null };
    const kid = rowToKid(row, []);
    expect(kid.savingsGoal).toBeUndefined();
  });

  it('returns undefined savingsGoal when target is null', () => {
    const row = { ...baseRow, savings_goal_target: null };
    const kid = rowToKid(row, []);
    expect(kid.savingsGoal).toBeUndefined();
  });

  it('returns undefined savingsGoal when both are null', () => {
    const row = { ...baseRow, savings_goal_name: null, savings_goal_target: null };
    const kid = rowToKid(row, []);
    expect(kid.savingsGoal).toBeUndefined();
  });

  it('includes provided transactions', () => {
    const txs = [
      { id: 'tx-1', type: 'add' as const, amount: 10, description: 'Test', category: 'gift' as const, date: '2025-01-01' },
      { id: 'tx-2', type: 'subtract' as const, amount: 5, description: 'Toy', category: 'toys' as const, date: '2025-01-02' },
    ];
    const kid = rowToKid(baseRow, txs);
    expect(kid.transactions).toHaveLength(2);
    expect(kid.transactions[0].id).toBe('tx-1');
    expect(kid.transactions[1].id).toBe('tx-2');
  });

  it('sets password to empty string', () => {
    const kid = rowToKid(baseRow, []);
    expect(kid.password).toBe('');
  });

  it('handles null user_id', () => {
    const row = { ...baseRow, user_id: null };
    const kid = rowToKid(row, []);
    expect(kid.user_id).toBeNull();
  });

  it('handles null last_allowance_date', () => {
    const row = { ...baseRow, last_allowance_date: null };
    const kid = rowToKid(row, []);
    expect(kid.lastAllowanceDate).toBeNull();
  });

  it('handles monthly frequency', () => {
    const row = { ...baseRow, allowance_frequency: 'monthly' as const };
    const kid = rowToKid(row, []);
    expect(kid.allowanceFrequency).toBe('monthly');
  });

  it('handles zero balance', () => {
    const row = { ...baseRow, balance: 0 };
    const kid = rowToKid(row, []);
    expect(kid.balance).toBe(0);
  });

  it('handles negative balance', () => {
    const row = { ...baseRow, balance: -10.5 };
    const kid = rowToKid(row, []);
    expect(kid.balance).toBe(-10.5);
  });
});

// ─── txRowToTransaction ──────────────────────────────────────────────────

describe('txRowToTransaction', () => {
  it('maps add transaction correctly', () => {
    const row: TransactionRow = {
      id: 'tx-1',
      kid_id: 'kid-1',
      type: 'add',
      amount: 25.5,
      description: 'Birthday money',
      category: 'gift',
      date: '2025-06-15T10:00:00.000Z',
      transfer_id: null,
    };

    const tx = txRowToTransaction(row);
    expect(tx.id).toBe('tx-1');
    expect(tx.type).toBe('add');
    expect(tx.amount).toBe(25.5);
    expect(tx.description).toBe('Birthday money');
    expect(tx.category).toBe('gift');
    expect(tx.date).toBe('2025-06-15T10:00:00.000Z');
    expect(tx.transfer_id).toBeUndefined();
  });

  it('maps subtract transaction correctly', () => {
    const row: TransactionRow = {
      id: 'tx-2',
      kid_id: 'kid-1',
      type: 'subtract',
      amount: 10,
      description: 'Toy purchase',
      category: 'toys',
      date: '2025-06-15T14:00:00.000Z',
      transfer_id: null,
    };

    const tx = txRowToTransaction(row);
    expect(tx.type).toBe('subtract');
    expect(tx.amount).toBe(10);
    expect(tx.category).toBe('toys');
  });

  it('includes transfer_id when present', () => {
    const row: TransactionRow = {
      id: 'tx-3',
      kid_id: 'kid-1',
      type: 'subtract',
      amount: 15,
      description: 'Transfer to Bob',
      category: 'transfer',
      date: '2025-06-15T14:00:00.000Z',
      transfer_id: 'transfer-xyz',
    };

    const tx = txRowToTransaction(row);
    expect(tx.transfer_id).toBe('transfer-xyz');
  });

  it('converts numeric string amounts to number', () => {
    const row: TransactionRow = {
      id: 'tx-4',
      kid_id: 'kid-1',
      type: 'add',
      amount: '7.99' as any,
      description: 'Test',
      category: 'other',
      date: '2025-01-01',
      transfer_id: null,
    };

    const tx = txRowToTransaction(row);
    expect(tx.amount).toBe(7.99);
    expect(typeof tx.amount).toBe('number');
  });

  it('handles all transaction categories', () => {
    const categories = ['allowance', 'fines', 'gift', 'food', 'toys', 'clothing', 'savings', 'education', 'entertainment', 'transfer', 'other'];
    categories.forEach((cat) => {
      const row: TransactionRow = {
        id: `tx-${cat}`,
        kid_id: 'kid-1',
        type: 'subtract',
        amount: 1,
        description: `${cat} test`,
        category: cat,
        date: '2025-01-01',
        transfer_id: null,
      };
      const tx = txRowToTransaction(row);
      expect(tx.category).toBe(cat);
    });
  });
});

// ─── rowToNotification ───────────────────────────────────────────────────

describe('rowToNotification', () => {
  it('maps basic notification correctly', () => {
    const row: NotificationRow = {
      id: 'notif-1',
      family_id: 'fam-1',
      kid_id: 'kid-1',
      type: 'transaction_added',
      title: 'Transaction Added',
      message: '$10.00 added to Alice',
      read: false,
      date: '2025-06-15T10:00:00.000Z',
      data: { amount: 10, transactionId: 'tx-1' },
    };

    const notif = rowToNotification(row);
    expect(notif.id).toBe('notif-1');
    expect(notif.type).toBe('transaction_added');
    expect(notif.title).toBe('Transaction Added');
    expect(notif.message).toBe('$10.00 added to Alice');
    expect(notif.kidId).toBe('kid-1');
    expect(notif.read).toBe(false);
    expect(notif.date).toBe('2025-06-15T10:00:00.000Z');
    expect(notif.data).toEqual({ amount: 10, transactionId: 'tx-1' });
  });

  it('handles null kid_id as empty string', () => {
    const row: NotificationRow = {
      id: 'notif-2',
      family_id: 'fam-1',
      kid_id: null,
      type: 'allowance_received',
      title: 'Allowance',
      message: 'Test',
      read: true,
      date: '2025-01-01',
      data: null,
    };

    const notif = rowToNotification(row);
    expect(notif.kidId).toBe('');
  });

  it('handles null data', () => {
    const row: NotificationRow = {
      id: 'notif-3',
      family_id: 'fam-1',
      kid_id: 'kid-1',
      type: 'goal_milestone',
      title: 'Goal!',
      message: 'Reached 100%',
      read: false,
      date: '2025-01-01',
      data: null,
    };

    const notif = rowToNotification(row);
    expect(notif.data).toBeNull();
  });

  it('maps read notification correctly', () => {
    const row: NotificationRow = {
      id: 'notif-4',
      family_id: 'fam-1',
      kid_id: 'kid-1',
      type: 'transfer_received',
      title: 'Transfer',
      message: 'Received $5',
      read: true,
      date: '2025-01-01',
      data: { amount: 5 },
    };

    const notif = rowToNotification(row);
    expect(notif.read).toBe(true);
  });

  it('maps all notification types', () => {
    const types = [
      'allowance_received',
      'transaction_added',
      'transaction_updated',
      'transaction_deleted',
      'transfer_received',
      'goal_milestone',
    ];

    types.forEach((type) => {
      const row: NotificationRow = {
        id: `notif-${type}`,
        family_id: 'fam-1',
        kid_id: 'kid-1',
        type,
        title: 'Test',
        message: 'Test',
        read: false,
        date: '2025-01-01',
        data: null,
      };
      const notif = rowToNotification(row);
      expect(notif.type).toBe(type);
    });
  });
});
