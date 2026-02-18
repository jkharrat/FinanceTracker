import { Kid, Transaction, AllowanceFrequency } from '../types';

const FREQUENCY_LABELS: Record<AllowanceFrequency, string> = {
  weekly: 'Weekly allowance',
  monthly: 'Monthly allowance',
};

export function getNextMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const daysUntilMonday = day === 0 ? 1 : (8 - day);
  result.setDate(result.getDate() + daysUntilMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function advanceDueDate(current: Date, frequency: AllowanceFrequency): Date {
  if (frequency === 'weekly') {
    const next = new Date(current);
    next.setDate(next.getDate() + 7);
    return next;
  }
  return new Date(current.getFullYear(), current.getMonth() + 1, 1);
}

export function getFirstDueDate(createdAt: Date, frequency: AllowanceFrequency): Date {
  if (frequency === 'weekly') {
    return getNextMonday(createdAt);
  }
  return new Date(createdAt.getFullYear(), createdAt.getMonth() + 1, 1);
}

export interface AllowanceInfo {
  kidId: string;
  kidName: string;
  totalAmount: number;
  count: number;
  previousBalance: number;
}

export function processAllowances(kidsList: Kid[]): { updated: Kid[]; changed: boolean; allowanceInfos: AllowanceInfo[] } {
  const now = new Date();
  let changed = false;
  const allowanceInfos: AllowanceInfo[] = [];

  const updated = kidsList.map((kid) => {
    if (kid.allowanceAmount <= 0) return kid;

    let nextDue: Date;
    if (kid.lastAllowanceDate) {
      nextDue = advanceDueDate(new Date(kid.lastAllowanceDate), kid.allowanceFrequency);
    } else {
      nextDue = getFirstDueDate(new Date(kid.createdAt), kid.allowanceFrequency);
    }

    const newTransactions: Transaction[] = [];
    const previousBalance = kid.balance;
    let newBalance = kid.balance;
    let lastDate = kid.lastAllowanceDate;

    while (nextDue <= now) {
      const txId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      newTransactions.push({
        id: txId,
        type: 'add',
        amount: kid.allowanceAmount,
        description: FREQUENCY_LABELS[kid.allowanceFrequency],
        category: 'allowance',
        date: nextDue.toISOString(),
      });
      newBalance = Math.round((newBalance + kid.allowanceAmount) * 100) / 100;
      lastDate = nextDue.toISOString();
      nextDue = advanceDueDate(nextDue, kid.allowanceFrequency);
    }

    if (newTransactions.length > 0) {
      changed = true;
      allowanceInfos.push({
        kidId: kid.id,
        kidName: kid.name,
        totalAmount: Math.round((newBalance - previousBalance) * 100) / 100,
        count: newTransactions.length,
        previousBalance,
      });
      return {
        ...kid,
        balance: newBalance,
        lastAllowanceDate: lastDate,
        transactions: [...newTransactions.reverse(), ...kid.transactions],
      };
    }

    return kid;
  });

  return { updated, changed, allowanceInfos };
}

export { FREQUENCY_LABELS };
