import { NotificationType, NotificationPreferences } from '../types';

export const MILESTONE_THRESHOLDS = [25, 50, 75, 100];

export const DEFAULT_PREFS: NotificationPreferences = {
  allowance: true,
  transactions: true,
  transfers: true,
  goalMilestones: true,
  pushEnabled: true,
};

export function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;

  if (diffMs < 0) return 'Upcoming';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function isNotificationEnabled(type: NotificationType, prefs: NotificationPreferences): boolean {
  switch (type) {
    case 'allowance_received':
      return prefs.allowance;
    case 'transaction_added':
    case 'transaction_updated':
    case 'transaction_deleted':
      return prefs.transactions;
    case 'transfer_received':
      return prefs.transfers;
    case 'goal_milestone':
      return prefs.goalMilestones;
    default:
      return true;
  }
}

export function getNotificationIcon(type: NotificationType): {
  name: string;
  colorKey: string;
} {
  switch (type) {
    case 'allowance_received':
      return { name: 'cash-outline', colorKey: 'success' };
    case 'transaction_added':
      return { name: 'add-circle-outline', colorKey: 'primary' };
    case 'transaction_updated':
      return { name: 'create-outline', colorKey: 'warning' };
    case 'transaction_deleted':
      return { name: 'trash-outline', colorKey: 'danger' };
    case 'transfer_received':
      return { name: 'swap-horizontal-outline', colorKey: 'primary' };
    case 'goal_milestone':
      return { name: 'trophy-outline', colorKey: 'warning' };
    default:
      return { name: 'notifications-outline', colorKey: 'textSecondary' };
  }
}

export function shouldFireMilestone(
  currentBalance: number,
  previousBalance: number,
  targetAmount: number,
  threshold: number,
  reachedMilestones: number[]
): boolean {
  if (reachedMilestones.includes(threshold)) return false;
  if (targetAmount <= 0) return false;
  const prevPercent = (previousBalance / targetAmount) * 100;
  const currPercent = (currentBalance / targetAmount) * 100;
  return currPercent >= threshold && prevPercent < threshold;
}
