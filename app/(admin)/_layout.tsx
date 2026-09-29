import { View, ActivityIndicator } from 'react-native';
import { Stack, Redirect, usePathname } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useColors, useTheme, KidThemeScope } from '../../src/context/ThemeContext';
import { stackScreenOptions, rootTitleOptions, modalScreenOptions } from '../../src/constants/navigation';
import WebSidebarLayout from '../../src/components/WebSidebar';

function AdminStack() {
  const { isDark } = useTheme();
  const colors = useColors();

  return (
    <WebSidebarLayout role="admin">
    <Stack screenOptions={stackScreenOptions(colors, isDark)}>
      <Stack.Screen
        name="index"
        options={{ title: 'Finance Tracker', ...rootTitleOptions }}
      />
      <Stack.Screen
        name="add-kid"
        options={{ title: 'Add Person', ...modalScreenOptions }}
      />
      <Stack.Screen
        name="add-admin"
        options={{ title: 'Add Parent', ...modalScreenOptions }}
      />
      <Stack.Screen
        name="edit-kid"
        options={{ title: 'Edit Details', ...modalScreenOptions }}
      />
      <Stack.Screen
        name="kid/[id]"
        options={{ title: '' }}
      />
      <Stack.Screen
        name="stats"
        options={{ title: 'Spending Insights', ...modalScreenOptions }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="notification-settings"
        options={{ title: 'Notification Settings', ...modalScreenOptions }}
      />
    </Stack>
    </WebSidebarLayout>
  );
}

export default function AdminLayout() {
  const { user, session, loading } = useAuth();
  const colors = useColors();
  const pathname = usePathname();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === 'kid') {
    return <Redirect href={`/(kid)${pathname}` as any} />;
  }

  return (
    <KidThemeScope>
      <AdminStack />
    </KidThemeScope>
  );
}
