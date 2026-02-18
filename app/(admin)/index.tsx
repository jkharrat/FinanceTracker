import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../src/context/DataContext';
import { useTheme, useColors } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { KidCard } from '../../src/components/KidCard';
import { EmptyState } from '../../src/components/EmptyState';
import NotificationBell from '../../src/components/NotificationBell';
import { ThemeColors } from '../../src/constants/colors';
import type { ThemeMode } from '../../src/context/ThemeContext';

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system'];
const THEME_ICONS: Record<ThemeMode, keyof typeof Ionicons.glyphMap> = {
  light: 'sunny',
  dark: 'moon',
  system: 'phone-portrait-outline',
};
const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'Auto',
};

export default function AdminHomeScreen() {
  const { kids, loading } = useData();
  const { mode, setMode } = useTheme();
  const { logout } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const totalBalance = kids.reduce((sum, kid) => sum + kid.balance, 0);

  const cycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(mode);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setMode(THEME_CYCLE[nextIndex]);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={styles.logoutLabel}>Logout</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={cycleTheme} style={styles.themeButton} activeOpacity={0.7}>
                <Ionicons name={THEME_ICONS[mode]} size={20} color={colors.primary} />
                <Text style={styles.themeLabel}>{THEME_LABELS[mode]}</Text>
              </TouchableOpacity>
              <NotificationBell />
            </View>
          ),
        }}
      />

      {kids.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Balance</Text>
          <Text style={[styles.summaryAmount, totalBalance < 0 && styles.summaryNegative]}>
            {totalBalance < 0 ? '-' : ''}${Math.abs(totalBalance).toFixed(2)}
          </Text>
          <Text style={styles.summaryCount}>
            {kids.length} {kids.length === 1 ? 'person' : 'people'} tracked
          </Text>
        </View>
      )}

      <FlatList
        data={kids}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <KidCard
            kid={item}
            onPress={() => router.push(`/(admin)/kid/${item.id}`)}
          />
        )}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.addParentButton}
            onPress={() => router.push('/(admin)/add-admin')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            <Text style={styles.addParentText}>Add Parent</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </TouchableOpacity>
        }
        contentContainerStyle={[
          styles.listContent,
          kids.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="💰"
            title="No one here yet"
            subtitle="Tap the button below to add someone and start tracking their finances."
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(admin)/add-kid')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.dangerLight,
    },
    logoutLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.danger,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    themeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
    },
    themeLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    summaryCard: {
      backgroundColor: colors.primary,
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 4,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    summaryLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.75)',
      marginBottom: 6,
    },
    summaryAmount: {
      fontSize: 36,
      fontWeight: '800',
      color: colors.textWhite,
      marginBottom: 4,
    },
    summaryNegative: {
      color: '#FFB4B4',
    },
    summaryCount: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.6)',
    },
    addParentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      gap: 10,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    addParentText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    listContent: {
      padding: 20,
      paddingBottom: 100,
    },
    emptyListContent: {
      flex: 1,
      justifyContent: 'center',
    },
    fab: {
      position: 'absolute',
      bottom: 32,
      right: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    fabIcon: {
      fontSize: 30,
      color: colors.textWhite,
      fontWeight: '300',
      marginTop: -2,
    },
  });
