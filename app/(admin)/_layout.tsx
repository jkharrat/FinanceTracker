import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useColors, useTheme } from '../../src/context/ThemeContext';
import { FontFamily } from '../../src/constants/fonts';
import WebSidebarLayout from '../../src/components/WebSidebar';

export default function AdminLayout() {
  const { isDark } = useTheme();
  const colors = useColors();

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
    <WebSidebarLayout role="admin">
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
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Finance Tracker',
          headerTitleStyle: {
            fontFamily: FontFamily.extraBold,
            fontWeight: '800',
            fontSize: 22,
          },
        }}
      />
      <Stack.Screen
        name="add-kid"
        options={{
          title: 'Add Person',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="add-admin"
        options={{
          title: 'Add Parent',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="edit-kid"
        options={{
          title: 'Edit Details',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="kid/[id]"
        options={{
          title: '',
        }}
      />
      <Stack.Screen
        name="stats"
        options={{
          title: 'Spending Insights',
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
      <Stack.Screen
        name="notification-settings"
        options={{
          title: 'Notification Settings',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
    </WebSidebarLayout>
  );
}
