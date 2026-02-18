import { Stack } from 'expo-router';
import { useColors } from '../../src/context/ThemeContext';

export default function AuthLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'none',
      }}
    />
  );
}
