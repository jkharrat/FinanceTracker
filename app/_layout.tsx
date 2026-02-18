import { useEffect, useRef } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NotificationProvider, useNotifications } from '../src/context/NotificationContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { DataProvider } from '../src/context/DataContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

function FamilySync() {
  const { familyId } = useAuth();
  const { setFamilyId } = useNotifications();

  useEffect(() => {
    console.log('[push-debug] FamilySync: familyId =', familyId);
    setFamilyId(familyId);
  }, [familyId, setFamilyId]);

  return null;
}

function PushTokenSync() {
  const { session, familyId } = useAuth();
  const { registerPushToken, unregisterPushToken, pushPermissionStatus } = useNotifications();
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    console.log('[push-debug] PushTokenSync: userId =', userId, 'familyId =', familyId, 'permission =', pushPermissionStatus);
    if (userId && familyId && pushPermissionStatus === 'granted') {
      if (registeredRef.current !== userId) {
        registerPushToken(userId, familyId).then(() => {
          console.log('[push-debug] Push token registered successfully');
          registeredRef.current = userId;
        }).catch((err) => {
          console.error('[push-debug] Push token registration failed:', err);
          registeredRef.current = null;
        });
      }
    } else if (registeredRef.current) {
      const prevUserId = registeredRef.current;
      registeredRef.current = null;
      unregisterPushToken(prevUserId);
    }
  }, [session, familyId, registerPushToken, unregisterPushToken, pushPermissionStatus]);

  return null;
}

function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <FamilySync />
          <PushTokenSync />
          <DataProvider>
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
