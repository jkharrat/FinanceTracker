import { useEffect, useRef, useCallback } from 'react';
import { Platform, ActivityIndicator, View } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { NotificationProvider, useNotifications } from '../src/context/NotificationContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { DataProvider } from '../src/context/DataContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

SplashScreen.preventAutoHideAsync();

function FamilySync() {
  const { familyId } = useAuth();
  const { setFamilyId } = useNotifications();

  useEffect(() => {
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
    if (userId && familyId && pushPermissionStatus === 'granted') {
      if (registeredRef.current !== userId) {
        registerPushToken(userId, familyId).then(() => {
          registeredRef.current = userId;
        }).catch((err) => {
          console.error('Push token registration failed:', err);
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
  const { isDark, colors } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = colors.background;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', colors.background);

      if (!document.getElementById('web-cursor-style')) {
        const style = document.createElement('style');
        style.id = 'web-cursor-style';
        style.textContent = '[role="button"] { cursor: pointer; }';
        document.head.appendChild(style);
      }
    }
  }, [colors.background]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
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
    </View>
  );
}
