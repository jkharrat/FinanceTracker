import { Platform, View, ActivityIndicator } from 'react-native';
import { Stack, Redirect, usePathname } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useColors, useTheme } from '../../src/context/ThemeContext';
import { FontFamily } from '../../src/constants/fonts';
import WebSidebarLayout from '../../src/components/WebSidebar';

export default function KidLayout() {
  const { user, session, loading } = useAuth();
  const { isDark } = useTheme();
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

  const blurEffect = isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial';
  const iosBlur = Platform.OS === 'ios'
    ? {
        headerTransparent: true as const,
        headerBlurEffect: blurEffect as 'systemChromeMaterialDark' | 'systemChromeMaterial',
        headerStyle: { backgroundColor: 'transparent' },
      }
    : {
        headerStyle: { backgroundColor: colors.background },
      };

  return (
    <WebSidebarLayout role="kid">
    <Stack
      screenOptions={{
        ...iosBlur,
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: FontFamily.bold,
          fontWeight: '700',
          fontSize: 18,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'My Dashboard',
          headerTitleStyle: {
            fontFamily: FontFamily.extraBold,
            fontWeight: '800',
            fontSize: 22,
          },
        }}
      />
      <Stack.Screen
        name="send"
        options={{
          title: 'Send Money',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="stats"
        options={{
          title: 'My Insights',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notifications',
        }}
      />
    </Stack>
    </WebSidebarLayout>
  );
}
