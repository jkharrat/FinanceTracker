import { useEffect } from 'react';
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
    setFamilyId(familyId);
  }, [familyId, setFamilyId]);

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
          <DataProvider>
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
