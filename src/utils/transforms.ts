import { Kid, Transaction, TransactionCategory, KidRow, TransactionRow, NotificationRow, AppNotification, NotificationType } from '../types';

export function rowToKid(row: KidRow, transactions: Transaction[]): Kid {
  return {
    id: row.id,
    family_id: row.family_id,
    user_id: row.user_id,
    name: row.name,
    avatar: row.avatar,
    password: '',
    allowanceAmount: Number(row.allowance_amount),
    allowanceFrequency: row.allowance_frequency,
    balance: Number(row.balance),
    transactions,
    createdAt: row.created_at,
    lastAllowanceDate: row.last_allowance_date,
    savingsGoal:
      row.savings_goal_name && row.savings_goal_target
        ? { name: row.savings_goal_name, targetAmount: Number(row.savings_goal_target) }
        : undefined,
  };
}

export function txRowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    category: row.category as TransactionCategory,
    date: row.date,
    transfer_id: row.transfer_id ?? undefined,
  };
}

export function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    kidId: row.kid_id ?? '',
    read: row.read,
    date: row.date,
    data: row.data as AppNotification['data'],
  };
}
