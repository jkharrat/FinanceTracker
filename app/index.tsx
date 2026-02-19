import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { useColors } from '../src/context/ThemeContext';

export default function Index() {
  const { user, session, loading, isPasswordRecovery } = useAuth();
  const colors = useColors();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isPasswordRecovery) {
    return <Redirect href="/(auth)/reset-password" />;
  }

  if (!session || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === 'admin') {
    return <Redirect href="/(admin)" />;
  }

  if (user.role === 'kid') {
    return <Redirect href="/(kid)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
