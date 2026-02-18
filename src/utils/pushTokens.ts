import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getMobileToken(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('Push tokens: missing eas.projectId in app config');
      return null;
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (error) {
    console.error('Failed to get mobile push token:', error);
    return null;
  }
}

async function getWebPushSubscription(): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const vapidPublicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.warn('Push tokens: missing EXPO_PUBLIC_VAPID_PUBLIC_KEY env var');
      return null;
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    return JSON.stringify(subscription.toJSON());
  } catch (error) {
    console.error('Failed to get web push subscription:', error);
    return null;
  }
}

export async function registerPushToken(
  userId: string,
  familyId: string,
): Promise<string | null> {
  const platform = Platform.OS as string;
  let token: string | null = null;

  if (platform === 'web') {
    token = await getWebPushSubscription();
  } else {
    token = await getMobileToken();
  }

  if (!token) return null;

  const resolvedPlatform = platform === 'web' ? 'web' : Platform.OS === 'ios' ? 'ios' : 'android';

  try {
    await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          family_id: familyId,
          token,
          platform: resolvedPlatform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' },
      );
  } catch (error) {
    console.error('Failed to store push token:', error);
  }

  return token;
}

export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    let token: string | null = null;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          token = JSON.stringify(subscription.toJSON());
          await subscription.unsubscribe();
        }
      }
    } else {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (projectId) {
        const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
        token = data;
      }
    }

    if (token) {
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);
    }
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}
