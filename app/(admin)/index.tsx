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
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../src/context/DataContext';
import { useColors } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { KidCard } from '../../src/components/KidCard';
import NotificationBell from '../../src/components/NotificationBell';
import NotificationPrompt from '../../src/components/NotificationPrompt';
import AnimatedPressable from '../../src/components/AnimatedPressable';
import BalanceCard from '../../src/components/BalanceCard';
import ProfileAvatar from '../../src/components/ProfileAvatar';
import ProfileSheet from '../../src/components/ProfileSheet';
import { AdminDashboardSkeleton } from '../../src/components/Skeleton';
import AnimatedListItem, { useEntranceWindow } from '../../src/components/AnimatedListItem';
import { Card, Button, SectionHeader } from '../../src/components/ui';
import { ThemeColors } from '../../src/constants/colors';
import { Radius, Type, Elevation } from '../../src/constants/theme';
import { Spacing } from '../../src/constants/spacing';
import { SIDEBAR_BREAKPOINT } from '../../src/components/WebSidebar';
import { supabase } from '../../src/lib/supabase';

interface AdminProfile {
  id: string;
  display_name: string;
}

const SETUP_STEPS = [
  { icon: 'person-add-outline' as const, label: 'Add a kid', desc: 'Create their profile and avatar' },
  { icon: 'calendar-outline' as const, label: 'Set their allowance', desc: 'Choose an amount and frequency' },
  { icon: 'bar-chart-outline' as const, label: 'Track spending', desc: 'Monitor balances and insights' },
];

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
  const entranceOpen = useEntranceWindow(!loading);

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

  const addPerson = () => router.push('/(admin)/add-kid');

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: showHeaderBell ? 'Family' : 'Dashboard',
          ...(Platform.OS === 'ios' && {
            headerTransparent: false,
            headerStyle: { backgroundColor: colors.background },
          }),
          headerLeft: showHeaderBell
            ? () => (
                <AnimatedPressable
                  variant="button"
                  onPress={() => setProfileOpen(true)}
                  style={styles.avatarButton}
                  accessibilityLabel="Profile"
                >
                  <ProfileAvatar name={displayName || '?'} size={32} />
                </AnimatedPressable>
              )
            : undefined,
          headerRight: showHeaderBell
            ? () => (
                <View style={styles.headerRight}>
                  <NotificationBell />
                </View>
              )
            : undefined,
        }}
      />

      <ProfileSheet visible={profileOpen} onClose={() => setProfileOpen(false)} />

      <FlatList
        data={kids}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index} stagger={entranceOpen}>
            <KidCard
              kid={item}
              onPress={() => router.push(`/(admin)/kid/${item.id}`)}
            />
          </AnimatedListItem>
        )}
        ListHeaderComponent={
          <>
            <NotificationPrompt />
            {kids.length > 0 && (
              <BalanceCard
                label="Family balance"
                value={totalBalance}
                caption={`Across ${kids.length} ${kids.length === 1 ? 'person' : 'people'}`}
                style={styles.summaryCard}
              />
            )}

            <View style={styles.parentsSection}>
              <Text style={styles.sectionLabel}>Parents</Text>
              <View style={styles.parentsRow}>
                {admins.map((admin) => {
                  const isYou = admin.id === currentUserId;
                  return (
                    <View key={admin.id} style={styles.parentChip}>
                      <ProfileAvatar name={admin.display_name} size={22} />
                      <Text style={styles.parentChipName} numberOfLines={1}>
                        {admin.display_name}
                      </Text>
                      {isYou && <Text style={styles.parentChipYou}>You</Text>}
                    </View>
                  );
                })}
                <AnimatedPressable
                  variant="button"
                  style={styles.addParentChip}
                  hoverBackground={colors.surfaceAlt}
                  onPress={() => router.push('/(admin)/add-admin')}
                  accessibilityLabel="Add Parent"
                >
                  <Ionicons name="add" size={16} color={colors.textSecondary} />
                  <Text style={styles.addParentChipText}>Add</Text>
                </AnimatedPressable>
              </View>
            </View>

            {kids.length > 0 && (
              <SectionHeader
                title="People"
                size="large"
                style={styles.peopleHeader}
                right={<Button title="Add" icon="add" size="sm" variant="ghost" onPress={addPerson} />}
              />
            )}
          </>
        }
        contentContainerStyle={[
          styles.listContent,
          kids.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={
          <Card style={styles.welcomeCard}>
            <Text style={styles.welcomeEmoji}>👋</Text>
            <Text style={styles.welcomeTitle}>
              Welcome{displayName ? `, ${displayName}` : ''}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Get set up in three quick steps.
            </Text>

            <View style={styles.stepsContainer}>
              {SETUP_STEPS.map((step, i) => (
                <View key={step.label} style={styles.stepRow}>
                  <View style={[styles.stepBadge, i === 0 && styles.stepBadgeActive]}>
                    <Ionicons
                      name={step.icon}
                      size={18}
                      color={i === 0 ? colors.textWhite : colors.textSecondary}
                    />
                  </View>
                  <View style={styles.stepText}>
                    <Text style={styles.stepLabel}>{step.label}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Button title="Add your first kid" icon="add" fullWidth onPress={addPerson} />
          </Card>
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textLight} colors={[colors.primary]} />
        }
      />

      {kids.length > 0 && (
        <AnimatedPressable
          variant="button"
          style={styles.fab}
          hoverBackground={colors.primaryDark}
          onPress={addPerson}
          accessibilityLabel="Add Person"
        >
          <Ionicons name="add" size={26} color={colors.textWhite} />
        </AnimatedPressable>
      )}
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
      borderRadius: 16,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginRight: Platform.OS === 'ios' ? 0 : Spacing.sm,
    },
    summaryCard: {
      marginBottom: Spacing.xl,
    },
    parentsSection: {
      marginBottom: Spacing.xl,
    },
    sectionLabel: {
      ...Type.overline,
      color: colors.textSecondary,
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
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      borderRadius: Radius.pill,
      height: 34,
      paddingLeft: 6,
      paddingRight: Spacing.md,
      gap: Spacing.sm,
    },
    parentChipName: {
      ...Type.label,
      color: colors.text,
      maxWidth: 120,
    },
    parentChipYou: {
      ...Type.caption,
      color: colors.textLight,
    },
    addParentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: Radius.pill,
      height: 34,
      paddingHorizontal: Spacing.md,
      gap: Spacing.xs,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    addParentChipText: {
      ...Type.label,
      color: colors.textSecondary,
    },
    peopleHeader: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: Spacing.sm,
    },
    listContent: {
      padding: Spacing.xl,
      paddingTop: Spacing.sm,
      paddingBottom: 110,
    },
    emptyListContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    fab: {
      position: 'absolute',
      bottom: Spacing.xxxl,
      right: Spacing.xxl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...Elevation.raised,
    },

    welcomeCard: {
      padding: Spacing.xxl,
      alignItems: 'stretch',
    },
    welcomeEmoji: {
      fontSize: 36,
      marginBottom: Spacing.md,
    },
    welcomeTitle: {
      ...Type.title,
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    welcomeSubtitle: {
      ...Type.body,
      color: colors.textSecondary,
    },
    stepsContainer: {
      gap: Spacing.lg,
      marginVertical: Spacing.xxl,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    stepBadge: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      backgroundColor: colors.surfaceAlt,
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
      ...Type.bodyStrong,
      color: colors.text,
    },
    stepDesc: {
      ...Type.label,
      color: colors.textSecondary,
    },
  });
