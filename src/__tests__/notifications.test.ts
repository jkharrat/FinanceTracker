import {
  getRelativeTime,
  isNotificationEnabled,
  getNotificationIcon,
  shouldFireMilestone,
  MILESTONE_THRESHOLDS,
  DEFAULT_PREFS,
} from '../utils/notifications';
import { NotificationPreferences, NotificationType } from '../types';

// ─── getRelativeTime ─────────────────────────────────────────────────────

describe('getRelativeTime', () => {
  it('returns "Just now" for events less than 60 seconds ago', () => {
    const now = new Date().toISOString();
    expect(getRelativeTime(now)).toBe('Just now');
  });

  it('returns "Just now" for events 30 seconds ago', () => {
    const date = new Date(Date.now() - 30 * 1000).toISOString();
    expect(getRelativeTime(date)).toBe('Just now');
  });

  it('returns minutes ago for events between 1-59 minutes', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(getRelativeTime(fiveMinAgo)).toBe('5m ago');
  });

  it('returns "1m ago" at exactly 60 seconds', () => {
    const oneMinAgo = new Date(Date.now() - 61 * 1000).toISOString();
    expect(getRelativeTime(oneMinAgo)).toBe('1m ago');
  });

  it('returns hours ago for events between 1-23 hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('returns "Yesterday" for events 1 day ago', () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(yesterday)).toBe('Yesterday');
  });

  it('returns "Xd ago" for events 2-6 days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(threeDaysAgo)).toBe('3d ago');
  });

  it('returns formatted date for events 7+ days ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const result = getRelativeTime(twoWeeksAgo);
    expect(result).not.toContain('ago');
    expect(result).not.toBe('Just now');
    expect(result).not.toBe('Yesterday');
    expect(result).toMatch(/\d/); // Contains at least one digit (date)
  });

  it('handles edge case at exactly 24 hours', () => {
    const exactly24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(exactly24h)).toBe('Yesterday');
  });
});

// ─── MILESTONE_THRESHOLDS ────────────────────────────────────────────────

describe('MILESTONE_THRESHOLDS', () => {
  it('has correct values', () => {
    expect(MILESTONE_THRESHOLDS).toEqual([25, 50, 75, 100]);
  });
});

// ─── DEFAULT_PREFS ───────────────────────────────────────────────────────

describe('DEFAULT_PREFS', () => {
  it('has all preferences enabled by default', () => {
    expect(DEFAULT_PREFS.allowance).toBe(true);
    expect(DEFAULT_PREFS.transactions).toBe(true);
    expect(DEFAULT_PREFS.transfers).toBe(true);
    expect(DEFAULT_PREFS.goalMilestones).toBe(true);
    expect(DEFAULT_PREFS.pushEnabled).toBe(true);
  });
});

// ─── isNotificationEnabled ───────────────────────────────────────────────

describe('isNotificationEnabled', () => {
  it('respects allowance preference', () => {
    expect(isNotificationEnabled('allowance_received', { ...DEFAULT_PREFS, allowance: true })).toBe(true);
    expect(isNotificationEnabled('allowance_received', { ...DEFAULT_PREFS, allowance: false })).toBe(false);
  });

  it('respects transactions preference for all transaction types', () => {
    const types: NotificationType[] = ['transaction_added', 'transaction_updated', 'transaction_deleted'];
    types.forEach((type) => {
      expect(isNotificationEnabled(type, { ...DEFAULT_PREFS, transactions: true })).toBe(true);
      expect(isNotificationEnabled(type, { ...DEFAULT_PREFS, transactions: false })).toBe(false);
    });
  });

  it('respects transfers preference', () => {
    expect(isNotificationEnabled('transfer_received', { ...DEFAULT_PREFS, transfers: true })).toBe(true);
    expect(isNotificationEnabled('transfer_received', { ...DEFAULT_PREFS, transfers: false })).toBe(false);
  });

  it('respects goalMilestones preference', () => {
    expect(isNotificationEnabled('goal_milestone', { ...DEFAULT_PREFS, goalMilestones: true })).toBe(true);
    expect(isNotificationEnabled('goal_milestone', { ...DEFAULT_PREFS, goalMilestones: false })).toBe(false);
  });

  it('returns true for unknown types', () => {
    expect(isNotificationEnabled('unknown_type' as NotificationType, DEFAULT_PREFS)).toBe(true);
  });

  it('works with all prefs disabled', () => {
    const allOff: NotificationPreferences = {
      allowance: false,
      transactions: false,
      transfers: false,
      goalMilestones: false,
      pushEnabled: false,
    };
    expect(isNotificationEnabled('allowance_received', allOff)).toBe(false);
    expect(isNotificationEnabled('transaction_added', allOff)).toBe(false);
    expect(isNotificationEnabled('transfer_received', allOff)).toBe(false);
    expect(isNotificationEnabled('goal_milestone', allOff)).toBe(false);
  });
});

// ─── getNotificationIcon ─────────────────────────────────────────────────

describe('getNotificationIcon', () => {
  it('returns correct icon for allowance_received', () => {
    const result = getNotificationIcon('allowance_received');
    expect(result.name).toBe('cash-outline');
    expect(result.colorKey).toBe('success');
  });

  it('returns correct icon for transaction_added', () => {
    const result = getNotificationIcon('transaction_added');
    expect(result.name).toBe('add-circle-outline');
    expect(result.colorKey).toBe('primary');
  });

  it('returns correct icon for transaction_updated', () => {
    const result = getNotificationIcon('transaction_updated');
    expect(result.name).toBe('create-outline');
    expect(result.colorKey).toBe('warning');
  });

  it('returns correct icon for transaction_deleted', () => {
    const result = getNotificationIcon('transaction_deleted');
    expect(result.name).toBe('trash-outline');
    expect(result.colorKey).toBe('danger');
  });

  it('returns correct icon for transfer_received', () => {
    const result = getNotificationIcon('transfer_received');
    expect(result.name).toBe('swap-horizontal-outline');
    expect(result.colorKey).toBe('primary');
  });

  it('returns correct icon for goal_milestone', () => {
    const result = getNotificationIcon('goal_milestone');
    expect(result.name).toBe('trophy-outline');
    expect(result.colorKey).toBe('warning');
  });

  it('returns default icon for unknown type', () => {
    const result = getNotificationIcon('unknown_type' as NotificationType);
    expect(result.name).toBe('notifications-outline');
    expect(result.colorKey).toBe('textSecondary');
  });
});

// ─── shouldFireMilestone ─────────────────────────────────────────────────

describe('shouldFireMilestone', () => {
  it('fires at 25% threshold', () => {
    expect(shouldFireMilestone(25, 20, 100, 25, [])).toBe(true);
  });

  it('fires at 50% threshold', () => {
    expect(shouldFireMilestone(50, 45, 100, 50, [])).toBe(true);
  });

  it('fires at 75% threshold', () => {
    expect(shouldFireMilestone(75, 70, 100, 75, [])).toBe(true);
  });

  it('fires at 100% threshold', () => {
    expect(shouldFireMilestone(100, 95, 100, 100, [])).toBe(true);
  });

  it('does not fire when already reached', () => {
    expect(shouldFireMilestone(30, 20, 100, 25, [25])).toBe(false);
  });

  it('does not fire when threshold not crossed', () => {
    expect(shouldFireMilestone(20, 15, 100, 25, [])).toBe(false);
  });

  it('does not fire when previous balance was already above threshold', () => {
    expect(shouldFireMilestone(30, 26, 100, 25, [])).toBe(false);
  });

  it('does not fire for zero target amount', () => {
    expect(shouldFireMilestone(50, 40, 0, 25, [])).toBe(false);
  });

  it('does not fire for negative target amount', () => {
    expect(shouldFireMilestone(50, 40, -100, 25, [])).toBe(false);
  });

  it('fires exactly at threshold boundary', () => {
    expect(shouldFireMilestone(25, 24.99, 100, 25, [])).toBe(true);
  });

  it('fires when balance exceeds threshold significantly', () => {
    expect(shouldFireMilestone(80, 20, 100, 25, [])).toBe(true);
    expect(shouldFireMilestone(80, 20, 100, 50, [])).toBe(true);
    expect(shouldFireMilestone(80, 20, 100, 75, [])).toBe(true);
  });

  it('handles multiple already-reached milestones', () => {
    expect(shouldFireMilestone(80, 70, 100, 75, [25, 50])).toBe(true);
    expect(shouldFireMilestone(80, 70, 100, 25, [25, 50])).toBe(false);
    expect(shouldFireMilestone(80, 70, 100, 50, [25, 50])).toBe(false);
  });

  it('works with non-round target amounts', () => {
    expect(shouldFireMilestone(12.5, 10, 50, 25, [])).toBe(true);
    expect(shouldFireMilestone(12.4, 10, 50, 25, [])).toBe(false);
  });

  it('handles zero balance', () => {
    expect(shouldFireMilestone(0, 0, 100, 25, [])).toBe(false);
  });
});
