import { View, ActivityIndicator } from 'react-native';
import { Stack, Redirect, usePathname } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useColors, useTheme, KidThemeScope } from '../../src/context/ThemeContext';
import { stackScreenOptions, rootTitleOptions, modalScreenOptions } from '../../src/constants/navigation';
import WebSidebarLayout from '../../src/components/WebSidebar';

function KidStack() {
  const { isDark } = useTheme();
  const colors = useColors();

  return (
    <WebSidebarLayout role="kid">
    <Stack screenOptions={stackScreenOptions(colors, isDark)}>
      <Stack.Screen
        name="index"
        options={{ title: 'My Dashboard', ...rootTitleOptions }}
      />
      <Stack.Screen
        name="send"
        options={{ title: 'Send Money', ...modalScreenOptions }}
      />
      <Stack.Screen
        name="stats"
        options={{ title: 'My Insights', ...modalScreenOptions }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: 'Notifications' }}
      />
    </Stack>
    </WebSidebarLayout>
  );
}

export default function KidLayout() {
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

  if (user.role === 'admin') {
    return <Redirect href={`/(admin)${pathname}` as any} />;
  }

  return (
    <KidThemeScope>
      <KidStack />
    </KidThemeScope>
  );
}
