import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { AppNotification, NotificationPreferences, NotificationType, Kid, NotificationRow } from '../types';
import { MILESTONE_THRESHOLDS, DEFAULT_PREFS } from '../utils/notifications';
import { rowToNotification } from '../utils/transforms';
import {
  registerPushToken as registerToken,
  unregisterPushToken as unregisterToken,
} from '../utils/pushTokens';

const MAX_NOTIFICATIONS = 200;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

interface NotificationContextType {
  notifications: AppNotification[];
  preferences: NotificationPreferences;
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'date'>, options?: { skipLocalPush?: boolean }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (kidId?: string) => Promise<void>;
  clearAll: (kidId?: string) => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  getNotificationsForKid: (kidId: string) => AppNotification[];
  getUnreadCountForKid: (kidId: string) => number;
  checkGoalMilestones: (kid: Kid, previousBalance: number) => Promise<void>;
  setFamilyId: (id: string | null) => void;
  registerPushToken: (userId: string, familyId: string) => Promise<void>;
  unregisterPushToken: (userId: string) => Promise<void>;
  pushPermissionStatus: 'undetermined' | 'granted' | 'denied';
  enablePushNotifications: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Finance Tracker',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [reachedMilestones, setReachedMilestones] = useState<Record<string, number[]>>({});
  const [currentFamilyId, setCurrentFamilyId] = useState<string | null>(null);

  const [pushPermissionStatus, setPushPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const prefsRef = useRef<NotificationPreferences>(DEFAULT_PREFS);
  const currentPushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    prefsRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const perm = Notification.permission;
          setPushPermissionStatus(perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'undetermined');
        }
      } else {
        const { status } = await Notifications.getPermissionsAsync();
        setPushPermissionStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
      }
    })();
  }, []);

  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    let granted = false;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        granted = permission === 'granted';
      }
    } else {
      granted = await requestPermissions();
    }
    setPushPermissionStatus(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  const setFamilyId = useCallback((id: string | null) => {
    setCurrentFamilyId(id);
  }, []);

  const registerPushToken = useCallback(async (userId: string, familyId: string) => {
    const token = await registerToken(userId, familyId);
    currentPushTokenRef.current = token;
  }, []);

  const unregisterPushToken = useCallback(async (userId: string) => {
    await unregisterToken(userId);
    currentPushTokenRef.current = null;
  }, []);

  const sendRemotePush = useCallback(async (title: string, message: string) => {
    if (!currentFamilyId) return;
    if (!prefsRef.current.pushEnabled) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase.functions.invoke('send-push', {
        body: {
          family_id: currentFamilyId,
          sender_token: currentPushTokenRef.current,
          notification: { title, message },
        },
      });
      if (error) {
        console.error('Remote push invocation error:', error);
      }
    } catch (error) {
      console.error('Failed to send remote push:', error);
    }
  }, [currentFamilyId]);

  const loadData = useCallback(async () => {
    if (!currentFamilyId) {
      setNotifications([]);
      setPreferences(DEFAULT_PREFS);
      return;
    }

    try {
      const [notifResult, prefsResult, milestoneResult] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('family_id', currentFamilyId)
          .order('date', { ascending: false })
          .limit(MAX_NOTIFICATIONS),
        supabase
          .from('notification_preferences')
          .select('*')
          .eq('family_id', currentFamilyId)
          .single(),
        supabase
          .from('reached_milestones')
          .select('kid_id, threshold'),
      ]);

      if (notifResult.data) {
        setNotifications(
          (notifResult.data as NotificationRow[]).map(rowToNotification)
        );
      }

      if (prefsResult.data) {
        const p = prefsResult.data;
        setPreferences({
          allowance: p.allowance ?? true,
          transactions: p.transactions ?? true,
          transfers: p.transfers ?? true,
          goalMilestones: p.goal_milestones ?? true,
          pushEnabled: p.push_enabled ?? true,
        });
        prefsRef.current = {
          allowance: p.allowance ?? true,
          transactions: p.transactions ?? true,
          transfers: p.transfers ?? true,
          goalMilestones: p.goal_milestones ?? true,
          pushEnabled: p.push_enabled ?? true,
        };
      }

      if (milestoneResult.data) {
        const map: Record<string, number[]> = {};
        for (const row of milestoneResult.data) {
          if (!map[row.kid_id]) map[row.kid_id] = [];
          map[row.kid_id].push(row.threshold);
        }
        setReachedMilestones(map);
      }
    } catch (error) {
      console.error('Failed to load notification data:', error);
    }
  }, [currentFamilyId]);

  const loadDataRef = useRef(loadData);
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    loadData();
    if (Platform.OS !== 'web') {
      setupAndroidChannel();
    }
  }, [loadData]);

  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedReload = useCallback(() => {
    if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
    realtimeTimerRef.current = setTimeout(() => {
      loadDataRef.current();
    }, 500);
  }, []);

  useEffect(() => {
    if (!currentFamilyId) return;

    const channel = supabase
      .channel(`family-notifs-${currentFamilyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `family_id=eq.${currentFamilyId}` },
        debouncedReload,
      )
      .subscribe();

    return () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [currentFamilyId, debouncedReload]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          loadDataRef.current();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadDataRef.current();
      }
    });

    return () => subscription.remove();
  }, []);

  const scheduleLocalPush = useCallback(async (title: string, body: string) => {
    if (!prefsRef.current.pushEnabled) return;
    if (Platform.OS === 'web') {
      try {
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification(title, { body, icon: '/assets/icon.png' });
        }
      } catch (error) {
        console.error('Failed to show web notification:', error);
      }
      return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: null,
      });
    } catch (error) {
      console.error('Failed to schedule push notification:', error);
    }
  }, []);

  const isNotificationEnabled = useCallback((type: NotificationType): boolean => {
    const prefs = prefsRef.current;
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
  }, []);

  const addNotification = useCallback(async (
    notification: Omit<AppNotification, 'id' | 'read' | 'date'>,
    options?: { skipLocalPush?: boolean }
  ) => {
    if (!isNotificationEnabled(notification.type)) return;
    if (!currentFamilyId) return;

    const { data: row } = await supabase
      .from('notifications')
      .insert({
        family_id: currentFamilyId,
        kid_id: notification.kidId || null,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data ?? null,
      })
      .select()
      .single();

    if (row) {
      const newNotif = rowToNotification(row as NotificationRow);
      setNotifications((prev) => [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS));
    }

    if (!options?.skipLocalPush) {
      await scheduleLocalPush(notification.title, notification.message);
    }
    await sendRemotePush(notification.title, notification.message);
  }, [isNotificationEnabled, currentFamilyId, scheduleLocalPush, sendRemotePush]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async (kidId?: string) => {
    if (!currentFamilyId) return;
    let query = supabase
      .from('notifications')
      .update({ read: true })
      .eq('family_id', currentFamilyId);
    if (kidId) query = query.eq('kid_id', kidId);
    await query;

    setNotifications((prev) =>
      prev.map((n) => {
        if (kidId && n.kidId !== kidId) return n;
        return { ...n, read: true };
      })
    );
  }, [currentFamilyId]);

  const clearAll = useCallback(async (kidId?: string) => {
    if (!currentFamilyId) return;
    let query = supabase.from('notifications').delete().eq('family_id', currentFamilyId);
    if (kidId) query = query.eq('kid_id', kidId);
    await query;

    setNotifications((prev) =>
      kidId ? prev.filter((n) => n.kidId !== kidId) : []
    );
  }, [currentFamilyId]);

  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    if (!currentFamilyId) return;

    const updated = { ...prefsRef.current, ...prefs };
    setPreferences(updated);
    prefsRef.current = updated;

    await supabase
      .from('notification_preferences')
      .upsert({
        family_id: currentFamilyId,
        allowance: updated.allowance,
        transactions: updated.transactions,
        transfers: updated.transfers,
        goal_milestones: updated.goalMilestones,
        push_enabled: updated.pushEnabled,
      });

    if (prefs.pushEnabled === true) {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          await Notification.requestPermission();
        }
      } else {
        await requestPermissions();
      }
    }
  }, [currentFamilyId]);

  const getNotificationsForKid = useCallback(
    (kidId: string): AppNotification[] => notifications.filter((n) => n.kidId === kidId),
    [notifications]
  );

  const getUnreadCountForKid = useCallback(
    (kidId: string): number => notifications.filter((n) => n.kidId === kidId && !n.read).length,
    [notifications]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const checkGoalMilestones = useCallback(async (kid: Kid, previousBalance: number) => {
    if (!kid.savingsGoal || kid.savingsGoal.targetAmount <= 0) return;
    if (!prefsRef.current.goalMilestones) return;
    if (!currentFamilyId) return;

    const target = kid.savingsGoal.targetAmount;
    const prevPercent = (previousBalance / target) * 100;
    const currPercent = (kid.balance / target) * 100;

    const kidMilestones = reachedMilestones[kid.id] || [];

    for (const threshold of MILESTONE_THRESHOLDS) {
      if (kidMilestones.includes(threshold)) continue;
      if (currPercent >= threshold && prevPercent < threshold) {
        const title = threshold === 100
          ? `${kid.name} reached their goal!`
          : `${kid.name} hit ${threshold}% of their goal!`;
        const message = threshold === 100
          ? `${kid.name} saved $${kid.balance.toFixed(2)} and reached their "${kid.savingsGoal.name}" goal of $${target.toFixed(2)}!`
          : `${kid.name} is ${threshold}% of the way to their "${kid.savingsGoal.name}" goal ($${kid.balance.toFixed(2)} / $${target.toFixed(2)}).`;

        const { data: row } = await supabase
          .from('notifications')
          .insert({
            family_id: currentFamilyId,
            kid_id: kid.id,
            type: 'goal_milestone',
            title,
            message,
            data: { milestonePercent: threshold, amount: kid.balance },
          })
          .select()
          .single();

        if (row) {
          const newNotif = rowToNotification(row as NotificationRow);
          setNotifications((prev) => [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS));
        }

        await scheduleLocalPush(title, message);
        await sendRemotePush(title, message);

        await supabase.from('reached_milestones').insert({
          kid_id: kid.id,
          threshold,
        });

        setReachedMilestones((prev) => ({
          ...prev,
          [kid.id]: [...(prev[kid.id] || []), threshold],
        }));
      }
    }
  }, [reachedMilestones, currentFamilyId, scheduleLocalPush, sendRemotePush]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        preferences,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        updatePreferences,
        getNotificationsForKid,
        getUnreadCountForKid,
        checkGoalMilestones,
        setFamilyId,
        registerPushToken,
        unregisterPushToken,
        pushPermissionStatus,
        enablePushNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
