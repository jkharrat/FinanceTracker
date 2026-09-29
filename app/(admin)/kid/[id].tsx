import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../../src/context/DataContext';
import { useColors } from '../../../src/context/ThemeContext';
import { TransactionItem, groupPosition } from '../../../src/components/TransactionItem';
import { TransactionModal } from '../../../src/components/TransactionModal';
import TransactionFilters, { useTransactionFilters } from '../../../src/components/TransactionFilters';
import { EmptyState } from '../../../src/components/EmptyState';
import BalanceCard from '../../../src/components/BalanceCard';
import GoalCard from '../../../src/components/GoalCard';
import { Button, IconButton, SectionHeader } from '../../../src/components/ui';
import { ThemeColors } from '../../../src/constants/colors';
import { AllowanceFrequency, Transaction, TransactionCategory } from '../../../src/types';
import { groupTransactionsByDate, flatIndexById } from '../../../src/utils/dateGrouping';
import { Type, KidRadius, KidType } from '../../../src/constants/theme';
import { Durations, Springs } from '../../../src/constants/motion';
import { Spacing } from '../../../src/constants/spacing';
import { useToast } from '../../../src/context/ToastContext';
import AnimatedListItem, { useEntranceWindow } from '../../../src/components/AnimatedListItem';
import { useMoneyFeedback, moneyConfirmation } from '../../../src/hooks/useMoneyFeedback';

const frequencyLabel: Record<AllowanceFrequency, string> = {
  weekly: 'week',
  monthly: 'month',
};

/** Header blocks rise in one after another on first load. */
const entrance = (order: number) =>
  FadeInDown.delay(order * Durations.stagger)
    .springify()
    .damping(Springs.gentle.damping)
    .stiffness(Springs.gentle.stiffness);

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

  const kid = id ? getKid(id) : undefined;
  const entranceOpen = useEntranceWindow(!!kid);
  const reducedMotion = useReducedMotion();
  const enter = (order: number) => (reducedMotion ? undefined : entrance(order));
  const feedback = useMoneyFeedback(kid?.balance ?? 0);
  const filters = useTransactionFilters(kid?.transactions ?? []);

  const sections = useMemo(() => groupTransactionsByDate(filters.filtered), [filters.filtered]);
  const listIndex = useMemo(() => flatIndexById(sections), [sections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshData(); } finally { setRefreshing(false); }
  }, [refreshData]);

  if (!kid) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Person not found</Text>
      </View>
    );
  }

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
    const type = modalType;
    feedback.hold();
    try {
      await addTransaction(kid.id, type, amount, description, category);
      setModalVisible(false);
      feedback.settle({
        withBounce: true,
        then: () => showToast('success', moneyConfirmation(type, amount, kid.name)),
      });
    } catch {
      feedback.release();
      showToast('error', 'Failed to save transaction. Please try again.');
    }
  };

  const handleEditTransaction = async (amount: number, description: string, category: TransactionCategory) => {
    if (!editingTransaction) return;
    feedback.hold();
    try {
      await updateTransaction(kid.id, editingTransaction.id, { amount, description, category });
      setEditingTransaction(null);
      setModalVisible(false);
      feedback.settle({ then: () => showToast('success', 'Transaction updated') });
    } catch {
      feedback.release();
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

    feedback.hold();
    try {
      await deleteTransaction(kid.id, editingTransaction.id);
      setEditingTransaction(null);
      setModalVisible(false);
      feedback.settle({ then: () => showToast('success', 'Transaction deleted') });
    } catch {
      feedback.release();
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

  const hasTransactions = kid.transactions.length > 0;

  const renderListHeader = () => (
    <View>
      <Animated.View entering={enter(0)} style={styles.profileRow}>
        <Animated.View style={[styles.avatar, feedback.avatarStyle]}>
          <Text style={styles.avatarText}>{kid.avatar}</Text>
        </Animated.View>
        <View style={styles.profileText}>
          <Text style={styles.kidName} numberOfLines={1}>{kid.name}</Text>
          <Text style={styles.allowanceText}>
            ${kid.allowanceAmount.toFixed(2)} every {frequencyLabel[kid.allowanceFrequency]}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={enter(1)}>
      <BalanceCard label={`${kid.name}'s balance`} value={feedback.shownBalance} style={styles.block}>
        <Button
          title="Add"
          icon="add"
          size="sm"
          variant="onHero"
          onPress={() => handleOpenModal('add')}
          style={styles.flex}
        />
        <Button
          title="Subtract"
          icon="remove"
          size="sm"
          variant="onInverse"
          onPress={() => handleOpenModal('subtract')}
          style={styles.flex}
        />
      </BalanceCard>
      </Animated.View>

      {kid.savingsGoal && (
        <Animated.View entering={enter(2)} style={styles.block}>
          <GoalCard goal={kid.savingsGoal} balance={kid.balance} />
        </Animated.View>
      )}

      <Animated.View entering={enter(3)}>
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
          title: kid.name,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <IconButton icon="bar-chart-outline" onPress={handleStats} accessibilityLabel="Stats" />
              <IconButton icon="create-outline" onPress={handleEdit} accessibilityLabel="Edit" />
              <IconButton icon="trash-outline" color={colors.danger} onPress={handleDelete} accessibilityLabel="Remove" />
            </View>
          ),
        }}
      />

      {error && (
        <Animated.View
          entering={FadeIn.duration(Durations.base)}
          exiting={FadeOut.duration(Durations.quick)}
          style={styles.errorContainer}
        >
          <Ionicons name="alert-circle" size={18} color={colors.dangerDark} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)} hitSlop={8} accessibilityLabel="Dismiss error">
            <Ionicons name="close" size={18} color={colors.dangerDark} />
          </Pressable>
        </Animated.View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader()}
        renderSectionHeader={({ section: { title } }) => <SectionHeader title={title} />}
        renderItem={({ item, index, section }) => (
          <AnimatedListItem index={listIndex.get(item.id) ?? index} stagger={entranceOpen}>
            <TransactionItem
              transaction={item}
              position={groupPosition(index, section.data.length)}
              onPress={() => handleTransactionPress(item)}
            />
          </AnimatedListItem>
        )}
        ListEmptyComponent={
          !hasTransactions ? (
            <EmptyState
              icon="📝"
              title="No transactions yet"
              subtitle="Use Add or Subtract above to record the first one."
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
    notFound: {
      ...Type.body,
      color: colors.danger,
      textAlign: 'center',
      marginTop: 40,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.dangerLight,
      margin: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: KidRadius.bubble,
    },
    errorText: {
      ...Type.label,
      flex: 1,
      color: colors.dangerDark,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginRight: Platform.OS === 'ios' ? 0 : Spacing.xs,
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
