import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import ReAnimated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../../src/context/DataContext';
import { useColors } from '../../../src/context/ThemeContext';
import { TransactionItem } from '../../../src/components/TransactionItem';
import { TransactionModal } from '../../../src/components/TransactionModal';
import { EmptyState } from '../../../src/components/EmptyState';
import GradientCard from '../../../src/components/GradientCard';
import AnimatedNumber from '../../../src/components/AnimatedNumber';
import { ThemeColors } from '../../../src/constants/colors';
import { AllowanceFrequency, Transaction, TransactionCategory, CATEGORIES } from '../../../src/types';
import { groupTransactionsByDate } from '../../../src/utils/dateGrouping';
import { FontFamily } from '../../../src/constants/fonts';
import { Spacing } from '../../../src/constants/spacing';
import { useToast } from '../../../src/context/ToastContext';
import AnimatedListItem from '../../../src/components/AnimatedListItem';

const frequencyLabel: Record<AllowanceFrequency, string> = {
  weekly: '/wk',
  monthly: '/mo',
};

type TypeFilter = 'all' | 'add' | 'subtract';

export default function KidDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getKid, addTransaction, updateTransaction, deleteTransaction, deleteKid, refreshData } = useData();
  const router = useRouter();
  const colors = useColors();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'subtract'>('add');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | null>(null);

  const kid = id ? getKid(id) : undefined;

  const goalPercent = useMemo(() => {
    if (!kid?.savingsGoal) return 0;
    return Math.round(Math.min(Math.max(kid.balance / kid.savingsGoal.targetAmount, 0), 1) * 100);
  }, [kid?.savingsGoal, kid?.balance]);
  const goalProgressAnim = useSharedValue(0);
  useEffect(() => {
    goalProgressAnim.value = withTiming(goalPercent, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [goalPercent]);
  const goalProgressStyle = useAnimatedStyle(() => ({
    width: `${goalProgressAnim.value}%`,
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

  if (!kid) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Person not found</Text>
      </View>
    );
  }

  const isNegative = kid.balance < 0;

  const handleOpenModal = (type: 'add' | 'subtract') => {
    setEditingTransaction(null);
    setModalType(type);
    setModalVisible(true);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModalType(transaction.type);
    setModalVisible(true);
  };

  const handleNewTransaction = async (amount: number, description: string, category: TransactionCategory) => {
    try {
      await addTransaction(kid.id, modalType, amount, description, category);
      setModalVisible(false);
      showToast('success', `$${amount.toFixed(2)} ${modalType === 'add' ? 'added' : 'subtracted'} successfully`);
    } catch {
      showToast('error', 'Failed to save transaction. Please try again.');
    }
  };

  const handleEditTransaction = async (amount: number, description: string, category: TransactionCategory) => {
    if (!editingTransaction) return;
    try {
      await updateTransaction(kid.id, editingTransaction.id, { amount, description, category });
      setEditingTransaction(null);
      setModalVisible(false);
      showToast('success', 'Transaction updated');
    } catch {
      showToast('error', 'Failed to update transaction. Please try again.');
    }
  };

  const handleDeleteTransaction = async () => {
    if (!editingTransaction) return;

    const isWeb = typeof window !== 'undefined' && typeof window.confirm === 'function';
    const confirmed = isWeb
      ? window.confirm('Are you sure you want to delete this transaction?')
      : await new Promise<boolean>((res) => {
          Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
              { text: 'Delete', style: 'destructive', onPress: () => res(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      await deleteTransaction(kid.id, editingTransaction.id);
      setEditingTransaction(null);
      setModalVisible(false);
      showToast('success', 'Transaction deleted');
    } catch {
      showToast('error', 'Failed to delete transaction. Please try again.');
    }
  };

  const handleDelete = async () => {
    setError(null);
    if (!kid?.id) {
      setError('Kid ID is missing');
      return;
    }

    // Use native confirm on web (Alert.alert can hang), Alert on mobile
    const isWeb = typeof window !== 'undefined' && typeof window.confirm === 'function';
    const confirmed = isWeb
      ? window.confirm(`Remove ${kid.name}? This will delete all their transaction history.`)
      : await new Promise<boolean>((res) => {
          Alert.alert(
            'Remove Person',
            `Remove ${kid.name}? This will delete all their transaction history.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
              { text: 'Remove', style: 'destructive', onPress: () => res(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      await deleteKid(kid.id);
      router.back();
    } catch (e: any) {
      setError(e?.message || String(e) || 'Failed to remove');
    }
  };

  const handleEdit = () => {
    router.push({ pathname: '/(admin)/edit-kid', params: { id: kid.id } });
  };

  const handleStats = () => {
    router.push({ pathname: '/(admin)/stats', params: { id: kid.id } });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter(null);
  };

  const renderListHeader = () => (
    <View>
      <View style={styles.profileSection}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{kid.avatar}</Text>
        </View>
        <Text style={styles.kidName}>{kid.name}</Text>
        <View style={styles.allowanceBadge}>
          <Text style={styles.allowanceText}>
            ${kid.allowanceAmount.toFixed(2)}{frequencyLabel[kid.allowanceFrequency]}
          </Text>
        </View>
      </View>

      <GradientCard
        colors={isNegative ? [colors.danger, colors.dangerDark] : [colors.primary, colors.primaryDark]}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <AnimatedNumber value={kid.balance} style={styles.balanceAmount} />
      </GradientCard>

      {kid.savingsGoal && (
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalLabel}>Savings Goal</Text>
            <Text style={[styles.goalPercent, goalPercent >= 100 && styles.goalPercentComplete]}>
              {goalPercent}%
            </Text>
          </View>
          <Text style={styles.goalName}>{kid.savingsGoal.name}</Text>
          <View style={styles.progressBarBg}>
            <ReAnimated.View
              style={[
                styles.progressBarFill,
                goalProgressStyle,
                goalPercent >= 100 && styles.progressBarComplete,
              ]}
            />
          </View>
          <Text style={styles.goalAmounts}>
            ${Math.max(kid.balance, 0).toFixed(2)} of ${kid.savingsGoal.targetAmount.toFixed(2)}
          </Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.addButton]}
          onPress={() => handleOpenModal('add')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonIcon}>+</Text>
          <Text style={styles.actionButtonLabel}>Add</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.subtractButton]}
          onPress={() => handleOpenModal('subtract')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonIcon}>-</Text>
          <Text style={styles.actionButtonLabel}>Subtract</Text>
        </TouchableOpacity>
      </View>

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
          title: kid.name,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleStats} style={styles.headerIconButton} accessibilityLabel="Stats">
                <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEdit} style={styles.headerIconButton} accessibilityLabel="Edit">
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={[styles.headerIconButton, styles.headerIconButtonDanger]} accessibilityLabel="Remove">
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)} style={styles.errorClose}>
            <Text style={styles.errorCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

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
            <TransactionItem
              transaction={item}
              onPress={() => handleTransactionPress(item)}
            />
          </AnimatedListItem>
        )}
        ListEmptyComponent={
          kid.transactions.length === 0 ? (
            <EmptyState
              icon="📝"
              title="No transactions yet"
              subtitle="Tap the buttons above to add or subtract funds."
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

      <TransactionModal
        visible={modalVisible}
        type={modalType}
        onClose={() => {
          setModalVisible(false);
          setEditingTransaction(null);
        }}
        onSubmit={editingTransaction ? handleEditTransaction : handleNewTransaction}
        editTransaction={editingTransaction}
        onDelete={editingTransaction ? handleDeleteTransaction : undefined}
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
    errorContainer: {
      backgroundColor: colors.dangerLight,
      margin: Spacing.lg,
      padding: Spacing.lg,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    errorText: {
      fontSize: 14,
      color: colors.danger,
      flex: 1,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
    },
    errorClose: {
      marginLeft: Spacing.md,
      padding: Spacing.xs,
    },
    errorCloseText: {
      fontSize: 18,
      color: colors.danger,
      fontWeight: 'bold',
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginRight: Spacing.xs,
    },
    headerIconButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
    },
    headerIconButtonDanger: {
      backgroundColor: colors.dangerLight,
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
      marginBottom: Spacing.lg,
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
      color: colors.danger,
    },
    goalCard: {
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.xl,
      borderRadius: 16,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
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
    actionRow: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.xl,
      gap: Spacing.md,
      marginBottom: 28,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.lg,
      borderRadius: 16,
      gap: Spacing.sm,
    },
    addButton: {
      backgroundColor: colors.success,
    },
    subtractButton: {
      backgroundColor: colors.danger,
    },
    actionButtonIcon: {
      fontSize: 22,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.textWhite,
    },
    actionButtonLabel: {
      fontSize: 16,
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
