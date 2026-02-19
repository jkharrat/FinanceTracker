import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../src/context/DataContext';
import { useTheme, useColors } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { KidCard } from '../../src/components/KidCard';
import { EmptyState } from '../../src/components/EmptyState';
import NotificationBell from '../../src/components/NotificationBell';
import NotificationPrompt from '../../src/components/NotificationPrompt';
import AnimatedPressable from '../../src/components/AnimatedPressable';
import GradientCard from '../../src/components/GradientCard';
import AnimatedNumber from '../../src/components/AnimatedNumber';
import { AdminDashboardSkeleton } from '../../src/components/Skeleton';
import { ThemeColors } from '../../src/constants/colors';
import type { ThemeMode } from '../../src/context/ThemeContext';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';
import { SIDEBAR_BREAKPOINT } from '../../src/components/WebSidebar';

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
  const { kids, loading, refreshData } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const { mode, setMode } = useTheme();
  const { logout } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const showHeaderBell = Platform.OS !== 'web' || width < SIDEBAR_BREAKPOINT;

  const totalBalance = kids.reduce((sum, kid) => sum + kid.balance, 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshData(); } finally { setRefreshing(false); }
  }, [refreshData]);

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
        <AdminDashboardSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <AnimatedPressable variant="button" onPress={handleLogout} style={styles.logoutButton} accessibilityLabel="Logout">
              <Ionicons name="log-out-outline" size={22} color={colors.dangerDark} />
            </AnimatedPressable>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <AnimatedPressable variant="button" onPress={cycleTheme} style={styles.themeButton} accessibilityLabel={THEME_LABELS[mode]}>
                <Ionicons name={THEME_ICONS[mode]} size={22} color={colors.primary} />
              </AnimatedPressable>
              {showHeaderBell && <NotificationBell />}
            </View>
          ),
        }}
      />

      {kids.length > 0 && (
        <GradientCard
          colors={[colors.primary, colors.primaryDark]}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryLabel}>Total Balance</Text>
          <AnimatedNumber
            value={totalBalance}
            style={[styles.summaryAmount, totalBalance < 0 && styles.summaryNegative]}
          />
          <Text style={styles.summaryCount}>
            {kids.length} {kids.length === 1 ? 'person' : 'people'} tracked
          </Text>
        </GradientCard>
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
          <>
            <NotificationPrompt />
            <AnimatedPressable
              variant="row"
              style={styles.addParentButton}
              onPress={() => router.push('/(admin)/add-admin')}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              <Text style={styles.addParentText}>Add Parent</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </AnimatedPressable>
          </>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      />

      <AnimatedPressable
        variant="button"
        style={styles.fab}
        onPress={() => router.push('/(admin)/add-kid')}
        accessibilityLabel="Add Person"
      >
        <Ionicons name="add" size={28} color={colors.textWhite} />
      </AnimatedPressable>
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
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      marginLeft: Spacing.sm,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginRight: Spacing.sm,
    },
    themeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
    },
    summaryCard: {
      marginHorizontal: Spacing.xl,
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 14,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.75)',
      marginBottom: 6,
    },
    summaryAmount: {
      fontSize: 36,
      fontFamily: FontFamily.extraBold,
      fontWeight: '800',
      color: colors.textWhite,
      marginBottom: Spacing.xs,
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
      marginBottom: Spacing.lg,
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
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.primary,
    },
    listContent: {
      padding: Spacing.xl,
      paddingBottom: 100,
    },
    emptyListContent: {
      flex: 1,
      justifyContent: 'center',
    },
    fab: {
      position: 'absolute',
      bottom: Spacing.xxxl,
      right: Spacing.xxl,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
  });
