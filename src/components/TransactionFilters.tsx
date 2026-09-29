import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Transaction, TransactionCategory, CATEGORIES } from '../types';
import { Radius, Type } from '../constants/theme';
import { Durations } from '../constants/motion';
import { Spacing } from '../constants/spacing';
import { Chip } from './ui';

export type TypeFilter = 'all' | 'add' | 'subtract';

export function useTransactionFilters(transactions: Transaction[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | null>(null);

  const filtered = useMemo(() => {
    let result = transactions;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) => t.description.toLowerCase().includes(query));
    }
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }
    if (categoryFilter) {
      result = result.filter((t) => t.category === categoryFilter);
    }
    return result;
  }, [transactions, searchQuery, typeFilter, categoryFilter]);

  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all' || categoryFilter !== null;

  const clear = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter(null);
  };

  return {
    searchQuery, setSearchQuery,
    typeFilter, setTypeFilter,
    categoryFilter, setCategoryFilter,
    filtered, hasActiveFilters, clear,
  };
}

type FiltersState = ReturnType<typeof useTransactionFilters>;

interface TransactionFiltersProps {
  filters: FiltersState;
  totalCount: number;
}

export default function TransactionFilters({ filters, totalCount }: TransactionFiltersProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    searchQuery, setSearchQuery,
    typeFilter, setTypeFilter,
    categoryFilter, setCategoryFilter,
    filtered, hasActiveFilters, clear,
  } = filters;

  return (
    <View style={styles.section}>
      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search"
          placeholderTextColor={colors.textLight}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={16} color={colors.textLight} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" selected={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
        <Chip
          label="Income"
          tone="success"
          selected={typeFilter === 'add'}
          onPress={() => setTypeFilter(typeFilter === 'add' ? 'all' : 'add')}
        />
        <Chip
          label="Spending"
          tone="danger"
          selected={typeFilter === 'subtract'}
          onPress={() => setTypeFilter(typeFilter === 'subtract' ? 'all' : 'subtract')}
        />
        <View style={styles.divider} />
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.label}
            emoji={cat.emoji}
            selected={categoryFilter === cat.id}
            onPress={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
          />
        ))}
      </ScrollView>

      {hasActiveFilters && (
        <Animated.View
          entering={FadeIn.duration(Durations.base)}
          exiting={FadeOut.duration(Durations.quick)}
          style={styles.status}
        >
          <Text style={styles.statusText}>
            {filtered.length} of {totalCount} transactions
          </Text>
          <Pressable onPress={clear} hitSlop={8}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      paddingBottom: Spacing.xs,
    },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      height: 40,
      backgroundColor: colors.surfaceAlt,
      marginHorizontal: Spacing.xl,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
    },
    searchInput: {
      ...Type.body,
      flex: 1,
      height: '100%',
      color: colors.text,
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
    },
    chips: {
      paddingHorizontal: Spacing.xl,
      gap: Spacing.sm,
      alignItems: 'center',
    },
    divider: {
      width: StyleSheet.hairlineWidth * 2,
      height: 20,
      backgroundColor: colors.border,
      marginHorizontal: Spacing.xs,
    },
    status: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
    },
    statusText: {
      ...Type.label,
      color: colors.textSecondary,
    },
    clearText: {
      ...Type.label,
      color: colors.primary,
    },
  });
