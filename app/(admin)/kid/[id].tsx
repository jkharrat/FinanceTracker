import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../../src/context/DataContext';
import { useColors } from '../../../src/context/ThemeContext';
import { TransactionItem } from '../../../src/components/TransactionItem';
import { TransactionModal } from '../../../src/components/TransactionModal';
import { EmptyState } from '../../../src/components/EmptyState';
import { ThemeColors } from '../../../src/constants/colors';
import { AllowanceFrequency, Transaction, TransactionCategory, CATEGORIES } from '../../../src/types';

const frequencyLabel: Record<AllowanceFrequency, string> = {
  weekly: '/wk',
  monthly: '/mo',
};

type TypeFilter = 'all' | 'add' | 'subtract';

export default function KidDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getKid, addTransaction, updateTransaction, deleteTransaction, deleteKid } = useData();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'subtract'>('add');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | null>(null);

  const kid = getKid(id!);

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

  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all' || categoryFilter !== null;

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
    await addTransaction(kid.id, modalType, amount, description, category);
    setModalVisible(false);
  };

  const handleEditTransaction = async (amount: number, description: string, category: TransactionCategory) => {
    if (editingTransaction) {
      await updateTransaction(kid.id, editingTransaction.id, { amount, description, category });
      setEditingTransaction(null);
      setModalVisible(false);
    }
  };

  const handleDeleteTransaction = () => {
    if (!editingTransaction) return;
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(kid.id, editingTransaction.id);
            setEditingTransaction(null);
            setModalVisible(false);
          },
        },
      ]
    );
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

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={[styles.balanceAmount, isNegative && styles.balanceNegative]}>
          {isNegative ? '-' : ''}${Math.abs(kid.balance).toFixed(2)}
        </Text>
      </View>

      {kid.savingsGoal && (() => {
        const goal = kid.savingsGoal!;
        const progress = Math.min(Math.max(kid.balance / goal.targetAmount, 0), 1);
        const percent = Math.round(progress * 100);
        return (
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>Savings Goal</Text>
              <Text style={[styles.goalPercent, percent >= 100 && styles.goalPercentComplete]}>
                {percent}%
              </Text>
            </View>
            <Text style={styles.goalName}>{goal.name}</Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${percent}%` },
                  percent >= 100 && styles.progressBarComplete,
                ]}
              />
            </View>
            <Text style={styles.goalAmounts}>
              ${Math.max(kid.balance, 0).toFixed(2)} of ${goal.targetAmount.toFixed(2)}
            </Text>
          </View>
        );
      })()}

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
              <TouchableOpacity onPress={handleStats} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Stats</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, styles.deleteText]}>Remove</Text>
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

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onPress={() => handleTransactionPress(item)}
          />
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
      margin: 16,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    errorText: {
      fontSize: 14,
      color: colors.danger,
      flex: 1,
      fontWeight: '500',
    },
    errorClose: {
      marginLeft: 12,
      padding: 4,
    },
    errorCloseText: {
      fontSize: 18,
      color: colors.danger,
      fontWeight: 'bold',
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 16,
    },
    headerButton: {
      paddingVertical: 4,
    },
    headerButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    deleteText: {
      color: colors.danger,
    },
    listContent: {
      paddingBottom: 40,
    },
    profileSection: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 20,
    },
    avatarLarge: {
      width: 80,
      height: 80,
      borderRadius: 28,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
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
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    allowanceBadge: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
    },
    allowanceText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    balanceCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      marginBottom: 16,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    balanceLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    balanceAmount: {
      fontSize: 40,
      fontWeight: '800',
      color: colors.success,
    },
    balanceNegative: {
      color: colors.danger,
    },
    goalCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
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
      marginBottom: 4,
    },
    goalLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textLight,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    goalPercent: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    goalPercentComplete: {
      color: colors.success,
    },
    goalName: {
      fontSize: 17,
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
      marginTop: 8,
    },
    actionRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 28,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 16,
      gap: 8,
    },
    addButton: {
      backgroundColor: colors.success,
    },
    subtractButton: {
      backgroundColor: colors.danger,
    },
    actionButtonIcon: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textWhite,
    },
    actionButtonLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textWhite,
    },
    transactionsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    transactionsTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    transactionsCount: {
      fontSize: 13,
      color: colors.textLight,
    },
    filterSection: {
      paddingBottom: 8,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 12,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    filterChips: {
      paddingHorizontal: 20,
      gap: 8,
      paddingBottom: 4,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 4,
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
      marginHorizontal: 4,
    },
    filterStatus: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    filterStatusText: {
      fontSize: 13,
      color: colors.textLight,
    },
    clearFiltersText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
  });
