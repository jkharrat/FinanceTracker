import { Stack } from 'expo-router';
import { useColors } from '../../src/context/ThemeContext';

export default function KidLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
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
  );
}
