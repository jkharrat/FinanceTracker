import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useData } from '../../src/context/DataContext';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { TransactionItem, groupPosition } from '../../src/components/TransactionItem';
import TransactionFilters, { useTransactionFilters } from '../../src/components/TransactionFilters';
import { EmptyState } from '../../src/components/EmptyState';
import NotificationBell from '../../src/components/NotificationBell';
import NotificationPrompt from '../../src/components/NotificationPrompt';
import AnimatedPressable from '../../src/components/AnimatedPressable';
import BalanceCard from '../../src/components/BalanceCard';
import GoalCard from '../../src/components/GoalCard';
import GoalEditor from '../../src/components/GoalEditor';
import ProfileSheet from '../../src/components/ProfileSheet';
import { Button, ListRow, IconButton, SectionHeader } from '../../src/components/ui';
import { groupTransactionsByDate, flatIndexById } from '../../src/utils/dateGrouping';
import { ThemeColors } from '../../src/constants/colors';
import { AllowanceFrequency, SavingsGoal } from '../../src/types';
import { Type, KidType } from '../../src/constants/theme';
import { Durations, Springs } from '../../src/constants/motion';
import { Spacing } from '../../src/constants/spacing';
import { SIDEBAR_BREAKPOINT } from '../../src/components/WebSidebar';
import AnimatedListItem, { useEntranceWindow } from '../../src/components/AnimatedListItem';
import Confetti from '../../src/components/Confetti';
import LaunchButton from '../../src/components/LaunchButton';
import ReceiveCelebration from '../../src/components/ReceiveCelebration';
import { useMoneyArrived } from '../../src/hooks/useMoneyArrived';
import { hapticSuccess } from '../../src/utils/haptics';

const frequencyLabel: Record<AllowanceFrequency, string> = {
  weekly: 'week',
  monthly: 'month',
};

const blockLayout = LinearTransition.springify()
  .damping(Springs.gentle.damping)
  .stiffness(Springs.gentle.stiffness);
const blockIn = FadeIn.duration(Durations.base);
const blockOut = FadeOut.duration(Durations.quick);

/** Dashboard blocks rise in one after another on first load. */
const entrance = (order: number) =>
  FadeInDown.delay(order * Durations.stagger)
    .springify()
    .damping(Springs.gentle.damping)
    .stiffness(Springs.gentle.stiffness);

const CONFETTI_EMOJI = ['🎉', '⭐', '💰', '✨'];
const CONFETTI_PALETTE_EXTRA = ['#FF6B9D', '#38BDF8'];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function KidDashboardScreen() {
  const { user } = useAuth();
  const { kids, loading, getKid, updateSavingsGoal, refreshData } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const confettiPalette = useMemo(
    () => [...CONFETTI_PALETTE_EXTRA, colors.primary, colors.success, colors.warning, colors.primaryLight],
    [colors],
  );
  const { width } = useWindowDimensions();
  const compactHeader = Platform.OS !== 'web' || width < SIDEBAR_BREAKPOINT;

  const [profileOpen, setProfileOpen] = useState(false);
  const [showGoalEditor, setShowGoalEditor] = useState(false);

  const reducedMotion = useReducedMotion();
  const wiggle = useSharedValue(0);
  const wiggleStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value}deg` }] }));
  const enter = (order: number) => (reducedMotion ? undefined : entrance(order));

  const openProfileWithWiggle = useCallback(() => {
    if (!reducedMotion) {
      wiggle.value = withSequence(
        withTiming(-14, { duration: 70 }),
        withTiming(12, { duration: 90 }),
        withTiming(-8, { duration: 90 }),
        withSpring(0, Springs.bouncy),
      );
    }
    setTimeout(() => setProfileOpen(true), reducedMotion ? 0 : 220);
  }, [reducedMotion, wiggle]);

  const kidId = user?.role === 'kid' ? user.kidId : null;
  const kid = kidId ? getKid(kidId) : undefined;
  const entranceOpen = useEntranceWindow(!!kid);
  const filters = useTransactionFilters(kid?.transactions ?? []);

  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const { arrival, dismiss: dismissArrival } = useMoneyArrived(kid, focused && !loading);

  const goalComplete = !!kid?.savingsGoal && kid.balance >= kid.savingsGoal.targetAmount;

  const [celebrating, setCelebrating] = useState(false);
  const wasCompleteRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Only celebrate the moment the goal flips to complete, never on first paint.
    const previous = wasCompleteRef.current;
    wasCompleteRef.current = goalComplete;
    if (previous === false && goalComplete) {
      setCelebrating(true);
      hapticSuccess();
    }
  }, [goalComplete]);

  const stopCelebrating = useCallback(() => setCelebrating(false), []);
  const openSend = useCallback(() => router.push('/(kid)/send'), [router]);

  const sections = useMemo(() => groupTransactionsByDate(filters.filtered), [filters.filtered]);
  const listIndex = useMemo(() => flatIndexById(sections), [sections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshData(); } finally { setRefreshing(false); }
  }, [refreshData]);

  const handleSaveGoal = useCallback(async (goal: SavingsGoal) => {
    if (!kidId) return;
    try {
      await updateSavingsGoal(kidId, goal);
      setShowGoalEditor(false);
    } catch (e: any) {
      const msg = e?.message || 'Failed to save goal';
      Alert.alert('Error', msg);
    }
  }, [kidId, updateSavingsGoal]);

  const handleRemoveGoal = useCallback(async () => {
    if (!kidId) return;
    try {
      await updateSavingsGoal(kidId, null);
      setShowGoalEditor(false);
    } catch (e: any) {
      const msg = e?.message || 'Failed to remove goal';
      Alert.alert('Error', msg);
    }
  }, [kidId, updateSavingsGoal]);

  const handleCancelGoal = useCallback(() => {
    setShowGoalEditor(false);
  }, []);

  if (!kid) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Account not found</Text>
      </View>
    );
  }

  const canSend = kids.length > 1;
  const hasTransactions = kid.transactions.length > 0;

  const renderGoal = () => {
    if (showGoalEditor) {
      return (
        <Animated.View key="editor" entering={blockIn} exiting={blockOut}>
          <GoalEditor
            existingGoal={kid.savingsGoal}
            onSave={handleSaveGoal}
            onRemove={handleRemoveGoal}
            onCancel={handleCancelGoal}
          />
        </Animated.View>
      );
    }
    if (kid.savingsGoal) {
      return (
        <Animated.View key="goal" entering={blockIn} exiting={blockOut}>
          <GoalCard goal={kid.savingsGoal} balance={kid.balance} onPress={() => setShowGoalEditor(true)} />
        </Animated.View>
      );
    }
    return (
      <Animated.View key="set" entering={blockIn} exiting={blockOut}>
        <ListRow
          icon="flag-outline"
          title="Set a savings goal"
          subtitle="Pick something to save up for"
          onPress={() => setShowGoalEditor(true)}
        />
      </Animated.View>
    );
  };

  const renderListHeader = () => (
    <View>
      <NotificationPrompt />

      <Animated.View entering={enter(0)} style={styles.profileRow}>
        <Animated.View style={wiggleStyle}>
          <AnimatedPressable
            variant="button"
            style={styles.avatar}
            onPress={openProfileWithWiggle}
            accessibilityLabel="Change avatar and settings"
          >
            <Text style={styles.avatarText}>{kid.avatar}</Text>
          </AnimatedPressable>
        </Animated.View>
        <View style={styles.profileText}>
          <Text style={styles.greeting}>{greeting()} 👋</Text>
          <Text style={styles.kidName} numberOfLines={1}>{kid.name}</Text>
          <Text style={styles.allowanceText}>
            ${kid.allowanceAmount.toFixed(2)} every {frequencyLabel[kid.allowanceFrequency]}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={enter(1)}>
      <BalanceCard label="Your balance" value={kid.balance} style={styles.block}>
        {canSend && (
          <LaunchButton
            title="Send"
            icon="arrow-up"
            size="sm"
            variant="onHero"
            onLaunch={openSend}
            style={styles.flex}
          />
        )}
        {hasTransactions && (
          <Button
            title="Insights"
            icon="bar-chart-outline"
            size="sm"
            variant="onInverse"
            onPress={() => router.push('/(kid)/stats')}
            style={styles.flex}
          />
        )}
      </BalanceCard>
      </Animated.View>

      <Animated.View entering={enter(2)} layout={blockLayout} style={styles.block}>
        {renderGoal()}
      </Animated.View>

      <Animated.View entering={enter(3)} layout={blockLayout}>
        <SectionHeader
          title="Activity"
          size="large"
          right={
            <Text style={styles.transactionsCount}>
              {kid.transactions.length} {kid.transactions.length === 1 ? 'entry' : 'entries'}
            </Text>
          }
        />
        {hasTransactions && <TransactionFilters filters={filters} totalCount={kid.transactions.length} />}
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Home',
          headerRight: compactHeader
            ? () => (
                <View style={styles.headerRight}>
                  <NotificationBell />
                  <IconButton
                    icon="settings-outline"
                    onPress={() => setProfileOpen(true)}
                    accessibilityLabel="Settings"
                  />
                </View>
              )
            : undefined,
        }}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader()}
        renderSectionHeader={({ section: { title } }) => <SectionHeader title={title} />}
        renderItem={({ item, index, section }) => (
          <AnimatedListItem index={listIndex.get(item.id) ?? index} stagger={entranceOpen}>
            <TransactionItem transaction={item} position={groupPosition(index, section.data.length)} />
          </AnimatedListItem>
        )}
        ListEmptyComponent={
          !hasTransactions ? (
            <EmptyState
              icon="📝"
              title="No transactions yet"
              subtitle="Your transactions will appear here once your parent adds them."
            />
          ) : (
            <EmptyState
              icon="🔍"
              title="No matching transactions"
              subtitle="Try adjusting your search or filters."
            />
          )
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textLight} colors={[colors.primary]} />
        }
      />

      <ProfileSheet visible={profileOpen} onClose={() => setProfileOpen(false)} />

      {celebrating && (
        <Confetti
          palette={confettiPalette}
          emoji={CONFETTI_EMOJI}
          count={70}
          onComplete={stopCelebrating}
        />
      )}

      {arrival && (
        <ReceiveCelebration
          total={arrival.total}
          sources={arrival.sources}
          previousBalance={arrival.previousBalance}
          onDone={dismissArrival}
        />
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
    errorText: {
      ...Type.body,
      color: colors.danger,
      textAlign: 'center',
      marginTop: 40,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginRight: Platform.OS === 'ios' ? 0 : Spacing.sm,
    },
    listContent: {
      paddingBottom: 48,
    },
    flex: {
      flex: 1,
    },
    block: {
      marginHorizontal: Spacing.xl,
      marginBottom: Spacing.lg,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.lg,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surface,
      borderWidth: 3,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 34,
    },
    profileText: {
      flex: 1,
    },
    greeting: {
      ...Type.label,
      color: colors.textSecondary,
    },
    kidName: {
      ...KidType.title,
      color: colors.text,
    },
    allowanceText: {
      ...Type.label,
      color: colors.textSecondary,
      marginTop: 2,
    },
    transactionsCount: {
      ...Type.label,
      color: colors.textLight,
    },
  });
