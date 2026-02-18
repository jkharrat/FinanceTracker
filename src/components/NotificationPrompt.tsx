import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../context/ThemeContext';
import { isIOSPWA } from '../utils/pushTokens';
import AnimatedPressable from './AnimatedPressable';
import { ThemeColors } from '../constants/colors';

const DISMISSED_KEY = 'notification_prompt_dismissed';

export default function NotificationPrompt() {
  const { pushPermissionStatus, enablePushNotifications, registerPushToken } = useNotifications();
  const { session, familyId } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((val) => {
      setDismissed(val === 'true');
    });
  }, []);

  const visible =
    !dismissed &&
    pushPermissionStatus === 'undetermined' &&
    !!session?.user?.id;

  const handleEnable = useCallback(async () => {
    const userId = session?.user?.id;
    const granted = await enablePushNotifications(userId ?? undefined, familyId ?? undefined);
    if (granted && userId && familyId && !isIOSPWA()) {
      await registerPushToken(userId, familyId);
    }
    setDismissed(true);
    await AsyncStorage.setItem(DISMISSED_KEY, 'true');
  }, [enablePushNotifications, registerPushToken, session, familyId]);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    await AsyncStorage.setItem(DISMISSED_KEY, 'true');
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.textSection}>
          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.subtitle}>
            {Platform.OS === 'web'
              ? 'Get browser alerts for allowances, transfers, and goal milestones.'
              : 'Get notified about allowances, transfers, and goal milestones.'}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <AnimatedPressable variant="button" style={styles.dismissButton} onPress={handleDismiss}>
          <Text style={styles.dismissText}>Not now</Text>
        </AnimatedPressable>
        <AnimatedPressable variant="button" style={styles.enableButton} onPress={handleEnable}>
          <Ionicons name="notifications" size={16} color={colors.textWhite} style={{ marginRight: 6 }} />
          <Text style={styles.enableText}>Enable</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: colors.borderLight,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryLight + '22',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    textSection: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    dismissButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
    },
    dismissText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    enableButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    enableText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textWhite,
    },
  });
