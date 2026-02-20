import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../src/context/DataContext';
import { useColors } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { KidCard } from '../../src/components/KidCard';
import NotificationBell from '../../src/components/NotificationBell';
import NotificationPrompt from '../../src/components/NotificationPrompt';
import AnimatedPressable from '../../src/components/AnimatedPressable';
import GradientCard from '../../src/components/GradientCard';
import AnimatedNumber from '../../src/components/AnimatedNumber';
import ProfileAvatar from '../../src/components/ProfileAvatar';
import ProfileSheet from '../../src/components/ProfileSheet';
import { AdminDashboardSkeleton } from '../../src/components/Skeleton';
import AnimatedListItem from '../../src/components/AnimatedListItem';
import { ThemeColors } from '../../src/constants/colors';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';
import { SIDEBAR_BREAKPOINT } from '../../src/components/WebSidebar';
import { supabase } from '../../src/lib/supabase';

interface AdminProfile {
  id: string;
  display_name: string;
}

export default function AdminHomeScreen() {
  const { kids, loading, refreshData } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const { user, familyId, session } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const showHeaderBell = Platform.OS !== 'web' || width < SIDEBAR_BREAKPOINT;

  const displayName = user?.role === 'admin' ? user.displayName : '';
  const currentUserId = session?.user?.id;
  const totalBalance = kids.reduce((sum, kid) => sum + kid.balance, 0);

  const loadAdmins = useCallback(async () => {
    if (!familyId) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('family_id', familyId)
      .eq('role', 'admin')
      .order('created_at');
    if (data) setAdmins(data);
  }, [familyId]);

  useFocusEffect(
    useCallback(() => {
      loadAdmins();
    }, [loadAdmins])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refreshData(), loadAdmins()]); } finally { setRefreshing(false); }
  }, [refreshData, loadAdmins]);

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
          title: showHeaderBell ? 'Finance Tracker' : 'Dashboard',
          headerLeft: showHeaderBell
            ? () => (
                <AnimatedPressable
                  variant="button"
                  onPress={() => setProfileOpen(true)}
                  style={styles.avatarButton}
                  accessibilityLabel="Profile"
                >
                  <ProfileAvatar name={displayName || '?'} size={34} />
                </AnimatedPressable>
              )
            : undefined,
          headerRight: () => (
            <View style={styles.headerRight}>
              {showHeaderBell && <NotificationBell />}
            </View>
          ),
        }}
      />

      <ProfileSheet visible={profileOpen} onClose={() => setProfileOpen(false)} />

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
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index}>
            <KidCard
              kid={item}
              onPress={() => router.push(`/(admin)/kid/${item.id}`)}
            />
          </AnimatedListItem>
        )}
        ListHeaderComponent={
          <>
            <NotificationPrompt />
            <View style={styles.parentsSection}>
              <Text style={styles.parentsSectionTitle}>Parents</Text>
              <View style={styles.parentsRow}>
                {admins.map((admin) => {
                  const isYou = admin.id === currentUserId;
                  return (
                    <View
                      key={admin.id}
                      style={[styles.parentChip, isYou && styles.parentChipYou]}
                    >
                      <ProfileAvatar name={admin.display_name} size={24} />
                      <Text style={styles.parentChipName} numberOfLines={1}>
                        {admin.display_name}{isYou ? ' (You)' : ''}
                      </Text>
                    </View>
                  );
                })}
                <AnimatedPressable
                  variant="button"
                  style={styles.addParentChip}
                  onPress={() => router.push('/(admin)/add-admin')}
                  accessibilityLabel="Add Parent"
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={styles.addParentChipText}>Add</Text>
                </AnimatedPressable>
              </View>
            </View>
          </>
        }
        contentContainerStyle={[
          styles.listContent,
          kids.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={
          <View style={styles.welcomeContainer}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeCard}
            >
              <View style={styles.welcomeDecorCircle} />
              <Text style={styles.welcomeEmoji}>👋</Text>
              <Text style={styles.welcomeTitle}>
                Welcome{displayName ? `, ${displayName}` : ''}!
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Let's get you set up in three easy steps
              </Text>
            </LinearGradient>

            <View style={styles.stepsContainer}>
              {[
                { num: '1', icon: 'person-add-outline' as const, label: 'Add a kid', desc: 'Create their profile and avatar' },
                { num: '2', icon: 'calendar-outline' as const, label: 'Set their allowance', desc: 'Choose an amount and frequency' },
                { num: '3', icon: 'bar-chart-outline' as const, label: 'Track spending', desc: 'Monitor balances and insights' },
              ].map((step, i) => (
                <View key={step.num} style={styles.stepRow}>
                  <View style={[styles.stepBadge, i === 0 && styles.stepBadgeActive]}>
                    <Ionicons
                      name={step.icon}
                      size={18}
                      color={i === 0 ? colors.textWhite : colors.primary}
                    />
                  </View>
                  <View style={styles.stepText}>
                    <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>
                      {step.label}
                    </Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <AnimatedPressable
              variant="button"
              style={styles.welcomeCta}
              onPress={() => router.push('/(admin)/add-kid')}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.textWhite} />
              <Text style={styles.welcomeCtaText}>Add Your First Kid</Text>
            </AnimatedPressable>
          </View>
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
    avatarButton: {
      marginLeft: Spacing.sm,
      ...(Platform.OS === 'ios' && { marginRight: Spacing.sm }),
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginRight: Spacing.sm,
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
    parentsSection: {
      marginBottom: Spacing.lg,
    },
    parentsSectionTitle: {
      fontSize: 11,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textLight,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: Spacing.sm,
    },
    parentsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    parentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingVertical: 6,
      paddingLeft: 6,
      paddingRight: Spacing.md,
      gap: Spacing.sm,
    },
    parentChipYou: {
      backgroundColor: colors.primaryLight + '18',
    },
    parentChipName: {
      fontSize: 13,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.text,
      maxWidth: 120,
    },
    addParentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: Spacing.md,
      gap: Spacing.xs,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primary + '50',
    },
    addParentChipText: {
      fontSize: 13,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.primary,
    },
    listContent: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Platform.OS === 'ios' ? Spacing.sm : Spacing.xl,
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

    welcomeContainer: {
      gap: Spacing.xl,
    },
    welcomeCard: {
      borderRadius: 20,
      padding: Spacing.xxl,
      alignItems: 'center',
      overflow: 'hidden',
    },
    welcomeDecorCircle: {
      position: 'absolute',
      top: -30,
      right: -20,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    welcomeEmoji: {
      fontSize: 48,
      marginBottom: Spacing.md,
    },
    welcomeTitle: {
      fontSize: 24,
      fontFamily: FontFamily.extraBold,
      fontWeight: '800',
      color: colors.textWhite,
      textAlign: 'center',
      marginBottom: Spacing.xs,
    },
    welcomeSubtitle: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
    },

    stepsContainer: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: Spacing.xl,
      gap: Spacing.lg,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    stepBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.shadow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBadgeActive: {
      backgroundColor: colors.primary,
    },
    stepText: {
      flex: 1,
      gap: 2,
    },
    stepLabel: {
      fontSize: 15,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.text,
    },
    stepLabelActive: {
      color: colors.primary,
    },
    stepDesc: {
      fontSize: 13,
      color: colors.textSecondary,
    },

    welcomeCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 18,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 4,
    },
    welcomeCtaText: {
      fontSize: 17,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.textWhite,
    },
  });
