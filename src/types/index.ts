export type AllowanceFrequency = 'weekly' | 'monthly';

export const CATEGORIES = [
  { id: 'allowance', label: 'Allowance', emoji: '💰' },
  { id: 'fines', label: 'Fines', emoji: '🚫' },
  { id: 'gift', label: 'Gift', emoji: '🎁' },
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'toys', label: 'Toys', emoji: '🎮' },
  { id: 'clothing', label: 'Clothing', emoji: '👕' },
  { id: 'savings', label: 'Savings', emoji: '🏦' },
  { id: 'education', label: 'Education', emoji: '📚' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'transfer', label: 'Transfer', emoji: '🤝' },
  { id: 'other', label: 'Other', emoji: '📌' },
] as const;

export type TransactionCategory = (typeof CATEGORIES)[number]['id'];

export interface TransferInfo {
  transferId: string;
  fromKidId: string;
  toKidId: string;
  fromKidName: string;
  toKidName: string;
}

export interface Transaction {
  id: string;
  type: 'add' | 'subtract';
  amount: number;
  description: string;
  category: TransactionCategory;
  date: string;
  transfer?: TransferInfo;
  transfer_id?: string;
}

export interface SavingsGoal {
  name: string;
  targetAmount: number;
}

export interface Kid {
  id: string;
  family_id: string;
  user_id?: string | null;
  name: string;
  avatar: string;
  password: string;
  allowanceAmount: number;
  allowanceFrequency: AllowanceFrequency;
  balance: number;
  transactions: Transaction[];
  createdAt: string;
  lastAllowanceDate: string | null;
  savingsGoal?: SavingsGoal;
}

export interface AdminAccount {
  username: string;
  passwordHash: string;
  email?: string;
}

export interface Family {
  id: string;
  join_code: string;
  created_at: string;
}

export interface Profile {
  id: string;
  family_id: string;
  role: 'admin' | 'kid';
  display_name: string;
  created_at: string;
}

export type NotificationType =
  | 'allowance_received'
  | 'transaction_added'
  | 'transaction_updated'
  | 'transaction_deleted'
  | 'transfer_received'
  | 'goal_milestone';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  kidId: string;
  read: boolean;
  date: string;
  data?: {
    milestonePercent?: number;
    transactionId?: string;
    amount?: number;
  };
}

export interface NotificationPreferences {
  allowance: boolean;
  transactions: boolean;
  transfers: boolean;
  goalMilestones: boolean;
  pushEnabled: boolean;
}

/** Row shape coming directly from Supabase kids table */
export interface KidRow {
  id: string;
  family_id: string;
  user_id: string | null;
  name: string;
  avatar: string;
  allowance_amount: number;
  allowance_frequency: AllowanceFrequency;
  balance: number;
  savings_goal_name: string | null;
  savings_goal_target: number | null;
  last_allowance_date: string | null;
  created_at: string;
}

/** Row shape from Supabase transactions table */
export interface TransactionRow {
  id: string;
  kid_id: string;
  type: 'add' | 'subtract';
  amount: number;
  description: string;
  category: string;
  date: string;
  transfer_id: string | null;
}

/** Row shape from Supabase notifications table */
export interface NotificationRow {
  id: string;
  family_id: string;
  kid_id: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  date: string;
  data: Record<string, unknown> | null;
}
