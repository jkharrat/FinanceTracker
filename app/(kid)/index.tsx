import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../src/context/DataContext';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme, useColors } from '../../src/context/ThemeContext';
import { TransactionItem } from '../../src/components/TransactionItem';
import { EmptyState } from '../../src/components/EmptyState';
import NotificationBell from '../../src/components/NotificationBell';
import NotificationPrompt from '../../src/components/NotificationPrompt';
import AnimatedPressable from '../../src/components/AnimatedPressable';
import GradientCard from '../../src/components/GradientCard';
import AnimatedNumber from '../../src/components/AnimatedNumber';
import { groupTransactionsByDate } from '../../src/utils/dateGrouping';
import { ThemeColors } from '../../src/constants/colors';
import { AllowanceFrequency, TransactionCategory, CATEGORIES, SavingsGoal } from '../../src/types';
import { Avatars } from '../../src/constants/colors';
import type { ThemeMode } from '../../src/context/ThemeContext';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';
import { SIDEBAR_BREAKPOINT } from '../../src/components/WebSidebar';
import AnimatedListItem from '../../src/components/AnimatedListItem';
import ReAnimated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

const frequencyLabel: Record<AllowanceFrequency, string> = {
  weekly: '/wk',
  monthly: '/mo',
};

type TypeFilter = 'all' | 'add' | 'subtract';

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

interface GoalEditorProps {
  existingGoal?: SavingsGoal;
  onSave: (goal: SavingsGoal) => void;
  onRemove: () => void;
  onCancel: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}

function GoalEditor({ existingGoal, onSave, onRemove, onCancel, styles, colors }: GoalEditorProps) {
  const [goalName, setGoalName] = useState(existingGoal?.name ?? '');
  const [goalAmount, setGoalAmount] = useState(existingGoal?.targetAmount?.toString() ?? '');

  const canSave = goalName.trim().length > 0 && parseFloat(goalAmount) > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: goalName.trim(), targetAmount: parseFloat(goalAmount) });
  };

  return (
    <View style={styles.goalCard}>
      <Text style={styles.goalEditorTitle}>Set Your Savings Goal</Text>
      <TextInput
        style={styles.goalEditorInput}
        value={goalName}
        onChangeText={setGoalName}
        placeholder="What are you saving for?"
        placeholderTextColor={colors.textLight}
        autoFocus
      />
      <View style={styles.goalEditorAmountRow}>
        <Text style={styles.goalEditorDollar}>$</Text>
        <TextInput
          style={styles.goalEditorAmountInput}
          value={goalAmount}
          onChangeText={setGoalAmount}
          placeholder="0.00"
          placeholderTextColor={colors.textLight}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={styles.goalEditorButtons}>
        {existingGoal && (
          <TouchableOpacity style={styles.goalRemoveButton} onPress={onRemove}>
            <Text style={styles.goalRemoveButtonText}>Remove</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.goalCancelButton} onPress={onCancel}>
          <Text style={styles.goalCancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.goalSaveButton, !canSave && styles.goalSaveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.goalSaveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function KidDashboardScreen() {
  const { user, logout } = useAuth();
  const { kids, getKid, updateKidAvatar, updateSavingsGoal, refreshData } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const { mode, setMode } = useTheme();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const showHeaderBell = Platform.OS !== 'web' || width < SIDEBAR_BREAKPOINT;

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showGoalEditor, setShowGoalEditor] = useState(false);

  const kidId = user?.role === 'kid' ? user.kidId : null;
  const kid = kidId ? getKid(kidId) : undefined;

  const kidGoalPercent = useMemo(() => {
    if (!kid?.savingsGoal) return 0;
    return Math.round(Math.min(Math.max(kid.balance / kid.savingsGoal.targetAmount, 0), 1) * 100);
  }, [kid?.savingsGoal, kid?.balance]);
  const kidGoalAnim = useSharedValue(0);
  useEffect(() => {
    kidGoalAnim.value = withTiming(kidGoalPercent, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [kidGoalPercent]);
  const kidGoalAnimStyle = useAnimatedStyle(() => ({
    width: `${kidGoalAnim.value}%`,
  }));

  const filteredTransactions = useMemo(() => {
    if (!kid) return [];
    let result = kid.transactions;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.description.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (categoryFilter) {
      result = result.filter((t) => t.category === categoryFilter);
    }

    return result;
  }, [kid, searchQuery, typeFilter, categoryFilter]);

  const sections = useMemo(() => groupTransactionsByDate(filteredTransactions), [filteredTransactions]);
  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all' || categoryFilter !== null;

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

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter(null);
  };

  const openGoalEditor = () => {
    setShowGoalEditor(true);
  };

  const handleSaveGoal = useCallback(async (goal: SavingsGoal) => {
    if (!kidId) return;
    await updateSavingsGoal(kidId, goal);
    setShowGoalEditor(false);
  }, [kidId, updateSavingsGoal]);

  const handleRemoveGoal = useCallback(async () => {
    if (!kidId) return;
    await updateSavingsGoal(kidId, null);
    setShowGoalEditor(false);
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

  const isNegative = kid.balance < 0;

  const renderListHeader = () => (
    <View>
      <NotificationPrompt />
      <View style={styles.profileSection}>
        <TouchableOpacity
          style={styles.avatarLarge}
          onPress={() => setShowAvatarPicker(!showAvatarPicker)}
          activeOpacity={0.7}
        >
          <Text style={styles.avatarText}>{kid.avatar}</Text>
          <View style={styles.avatarEditBadge}>
            <Ionicons name="pencil" size={10} color={colors.textWhite} />
          </View>
        </TouchableOpacity>
        <Text style={styles.kidName}>{kid.name}</Text>
        <View style={styles.allowanceBadge}>
          <Text style={styles.allowanceText}>
            ${kid.allowanceAmount.toFixed(2)}{frequencyLabel[kid.allowanceFrequency]}
          </Text>
        </View>

        {showAvatarPicker && (
          <View style={styles.avatarPickerContainer}>
            <Text style={styles.avatarPickerTitle}>Choose your avatar</Text>
            <View style={styles.avatarGrid}>
              {Avatars.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.avatarOption,
                    kid.avatar === emoji && styles.avatarOptionSelected,
                  ]}
                  onPress={() => {
                    if (kidId && emoji !== kid.avatar) {
                      updateKidAvatar(kidId, emoji);
                    }
                    setShowAvatarPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.avatarOptionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <GradientCard
        colors={isNegative ? [colors.danger, colors.dangerDark] : [colors.primary, colors.primaryDark]}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Your Balance</Text>
        <AnimatedNumber value={kid.balance} style={styles.balanceAmount} />
      </GradientCard>

      {showGoalEditor ? (
        <GoalEditor
          existingGoal={kid.savingsGoal}
          onSave={handleSaveGoal}
          onRemove={handleRemoveGoal}
          onCancel={handleCancelGoal}
          styles={styles}
          colors={colors}
        />
      ) : kid.savingsGoal ? (
          <AnimatedPressable variant="card" style={styles.goalCard} onPress={openGoalEditor}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>Savings Goal</Text>
              <View style={styles.goalHeaderRight}>
                <Text style={[styles.goalPercent, kidGoalPercent >= 100 && styles.goalPercentComplete]}>
                  {kidGoalPercent}%
                </Text>
                <Ionicons name="pencil" size={14} color={colors.textLight} style={{ marginLeft: Spacing.sm }} />
              </View>
            </View>
            <Text style={styles.goalName}>{kid.savingsGoal.name}</Text>
            <View style={styles.progressBarBg}>
              <ReAnimated.View
                style={[
                  styles.progressBarFill,
                  kidGoalAnimStyle,
                  kidGoalPercent >= 100 && styles.progressBarComplete,
                ]}
              />
            </View>
            <Text style={styles.goalAmounts}>
              ${Math.max(kid.balance, 0).toFixed(2)} of ${kid.savingsGoal.targetAmount.toFixed(2)}
            </Text>
          </AnimatedPressable>
        ) : (
        <AnimatedPressable variant="row" style={styles.setGoalButton} onPress={openGoalEditor}>
          <Ionicons name="flag-outline" size={20} color={colors.primary} />
          <Text style={styles.setGoalButtonText}>Set a Savings Goal</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </AnimatedPressable>
      )}

      {kid.transactions.length > 0 && (
        <AnimatedPressable
          variant="row"
          style={styles.statsButton}
          onPress={() => router.push('/(kid)/stats')}
        >
          <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
          <Text style={styles.statsButtonText}>View Spending Insights</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </AnimatedPressable>
      )}

      {kids.length > 1 && (
        <AnimatedPressable
          variant="row"
          style={styles.sendMoneyButton}
          onPress={() => router.push('/(kid)/send')}
        >
          <Ionicons name="send" size={20} color={colors.textWhite} />
          <Text style={styles.sendMoneyButtonText}>Send Money</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textWhite} />
        </AnimatedPressable>
      )}

      <View style={styles.transactionsHeader}>
        <Text style={styles.transactionsTitle}>Transaction History</Text>
        <Text style={styles.transactionsCount}>
          {kid.transactions.length} {kid.transactions.length === 1 ? 'entry' : 'entries'}
        </Text>
      </View>

      {kid.transactions.length > 0 && (
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={colors.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search transactions..."
              placeholderTextColor={colors.textLight}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            <TouchableOpacity
              style={[styles.filterChip, typeFilter === 'all' && styles.filterChipActive]}
              onPress={() => setTypeFilter('all')}
            >
              <Text style={[styles.filterChipText, typeFilter === 'all' && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, typeFilter === 'add' && styles.filterChipActiveGreen]}
              onPress={() => setTypeFilter(typeFilter === 'add' ? 'all' : 'add')}
            >
              <Text style={[styles.filterChipText, typeFilter === 'add' && styles.filterChipTextActive]}>
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, typeFilter === 'subtract' && styles.filterChipActiveRed]}
              onPress={() => setTypeFilter(typeFilter === 'subtract' ? 'all' : 'subtract')}
            >
              <Text style={[styles.filterChipText, typeFilter === 'subtract' && styles.filterChipTextActive]}>
                Expense
              </Text>
            </TouchableOpacity>

            <View style={styles.filterDivider} />

            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.filterChip, categoryFilter === cat.id && styles.filterChipActive]}
                onPress={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
              >
                <Text style={styles.filterChipEmoji}>{cat.emoji}</Text>
                <Text style={[styles.filterChipText, categoryFilter === cat.id && styles.filterChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {hasActiveFilters && (
            <View style={styles.filterStatus}>
              <Text style={styles.filterStatusText}>
                {filteredTransactions.length} of {kid.transactions.length} transactions
              </Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `${kid.name}'s Dashboard`,
          headerLeft: showHeaderBell
            ? () => (
                <AnimatedPressable variant="button" onPress={handleLogout} style={styles.logoutButton} accessibilityLabel="Logout">
                  <Ionicons name="log-out-outline" size={22} color={colors.dangerDark} />
                </AnimatedPressable>
              )
            : undefined,
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

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader()}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index}>
            <TransactionItem transaction={item} />
          </AnimatedListItem>
        )}
        ListEmptyComponent={
          kid.transactions.length === 0 ? (
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      />
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
      fontSize: 16,
      color: colors.danger,
      textAlign: 'center',
      marginTop: 40,
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
    listContent: {
      paddingBottom: 40,
    },
    sectionHeader: {
      backgroundColor: colors.background,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.sm,
    },
    sectionHeaderText: {
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      fontSize: 13,
      color: colors.textLight,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    profileSection: {
      alignItems: 'center',
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xl,
    },
    avatarLarge: {
      width: 80,
      height: 80,
      borderRadius: 28,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    avatarText: {
      fontSize: 40,
    },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    avatarPickerContainer: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: Spacing.lg,
      marginTop: Spacing.lg,
      marginHorizontal: Spacing.xs,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    avatarPickerTitle: {
      fontSize: 14,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.md,
    },
    avatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
    },
    avatarOption: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    avatarOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    avatarOptionText: {
      fontSize: 24,
    },
    kidName: {
      fontSize: 24,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    allowanceBadge: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 6,
      borderRadius: 20,
    },
    allowanceText: {
      fontSize: 14,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.primary,
    },
    balanceCard: {
      marginHorizontal: Spacing.xl,
      alignItems: 'center',
      marginBottom: 28,
    },
    balanceLabel: {
      fontSize: 13,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.75)',
      marginBottom: 6,
    },
    balanceAmount: {
      fontSize: 40,
      fontFamily: FontFamily.extraBold,
      fontWeight: '800',
      color: colors.textWhite,
    },
    balanceNegative: {
      color: '#FFB4B4',
    },
    goalCard: {
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.xl,
      borderRadius: 16,
      padding: Spacing.lg,
      marginBottom: Spacing.xl,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    goalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    goalHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    goalLabel: {
      fontSize: 11,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textLight,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    goalPercent: {
      fontSize: 14,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.primary,
    },
    goalPercentComplete: {
      color: colors.success,
    },
    goalName: {
      fontSize: 17,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
    },
    progressBarBg: {
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    progressBarComplete: {
      backgroundColor: colors.success,
    },
    goalAmounts: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: Spacing.sm,
    },
    setGoalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.xl,
      marginBottom: Spacing.xl,
      borderRadius: 14,
      padding: Spacing.lg,
      gap: 10,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    setGoalButtonText: {
      flex: 1,
      fontSize: 15,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.primary,
    },
    goalEditorTitle: {
      fontSize: 15,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.text,
      marginBottom: Spacing.md,
    },
    goalEditorInput: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Spacing.md,
      fontSize: 16,
      color: colors.text,
      marginBottom: 10,
    },
    goalEditorAmountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 14,
    },
    goalEditorDollar: {
      fontSize: 20,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
      marginRight: Spacing.xs,
    },
    goalEditorAmountInput: {
      flex: 1,
      fontSize: 20,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.text,
      paddingVertical: Spacing.md,
    },
    goalEditorButtons: {
      flexDirection: 'row',
      gap: Spacing.sm,
      justifyContent: 'flex-end',
    },
    goalRemoveButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.dangerLight,
      marginRight: 'auto',
    },
    goalRemoveButtonText: {
      fontSize: 14,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.danger,
    },
    goalCancelButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
    },
    goalCancelButtonText: {
      fontSize: 14,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    goalSaveButton: {
      paddingHorizontal: Spacing.xl,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    goalSaveButtonDisabled: {
      opacity: 0.5,
    },
    goalSaveButtonText: {
      fontSize: 14,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textWhite,
    },
    statsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.xl,
      marginBottom: Spacing.xxl,
      borderRadius: 14,
      padding: Spacing.lg,
      gap: 10,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    statsButtonText: {
      flex: 1,
      fontSize: 15,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.primary,
    },
    sendMoneyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      marginHorizontal: Spacing.xl,
      marginBottom: Spacing.xxl,
      borderRadius: 14,
      padding: Spacing.lg,
      gap: 10,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    sendMoneyButtonText: {
      flex: 1,
      fontSize: 15,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.textWhite,
    },
    transactionsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.xl,
      marginBottom: Spacing.md,
    },
    transactionsTitle: {
      fontSize: 18,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.text,
    },
    transactionsCount: {
      fontSize: 13,
      color: colors.textLight,
    },
    filterSection: {
      paddingBottom: Spacing.sm,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.xl,
      borderRadius: 12,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    searchIcon: {
      marginRight: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Spacing.md,
      fontSize: 15,
      color: colors.text,
    },
    filterChips: {
      paddingHorizontal: Spacing.xl,
      gap: Spacing.sm,
      paddingBottom: Spacing.xs,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: Spacing.sm,
      borderRadius: 20,
      gap: Spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipActiveGreen: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    filterChipActiveRed: {
      backgroundColor: colors.danger,
      borderColor: colors.danger,
    },
    filterChipEmoji: {
      fontSize: 13,
    },
    filterChipText: {
      fontSize: 13,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.textWhite,
    },
    filterDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.border,
      marginHorizontal: Spacing.xs,
    },
    filterStatus: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.sm,
    },
    filterStatusText: {
      fontSize: 13,
      color: colors.textLight,
    },
    clearFiltersText: {
      fontSize: 13,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.primary,
    },
  });
