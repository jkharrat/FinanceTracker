import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ThemeColors } from '../constants/colors';
import { Transaction, CATEGORIES, TransactionCategory } from '../types';
import { FontFamily } from '../constants/fonts';
import { Spacing } from '../constants/spacing';

interface StatsViewProps {
  transactions: Transaction[];
  colors: ThemeColors;
}

interface CategoryStat {
  id: TransactionCategory;
  label: string;
  emoji: string;
  amount: number;
  percentage: number;
}

interface MonthStat {
  label: string;
  income: number;
  expense: number;
  net: number;
}

interface BalancePoint {
  label: string;
  balance: number;
}

const LINE_CHART_HEIGHT = 150;
const DOT_SIZE = 7;
const MAX_BALANCE_POINTS = 30;

function computeStats(transactions: Transaction[]) {
  let totalIncome = 0;
  let totalExpense = 0;

  const categoryMap = new Map<TransactionCategory, number>();
  const monthMap = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    if (t.type === 'add') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
      categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount);
    }

    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthMap.get(monthKey) ?? { income: 0, expense: 0 };
    if (t.type === 'add') {
      existing.income += t.amount;
    } else {
      existing.expense += t.amount;
    }
    monthMap.set(monthKey, existing);
  }

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;

  const categoryStats: CategoryStat[] = CATEGORIES
    .map((cat) => ({
      id: cat.id,
      label: cat.label,
      emoji: cat.emoji,
      amount: Math.round((categoryMap.get(cat.id) ?? 0) * 100) / 100,
      percentage: totalExpense > 0
        ? Math.round(((categoryMap.get(cat.id) ?? 0) / totalExpense) * 100)
        : 0,
    }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sortedMonthKeys = [...monthMap.keys()].sort();
  const recentMonths = sortedMonthKeys.slice(-6);

  const monthlyStats: MonthStat[] = recentMonths.map((key) => {
    const [, monthStr] = key.split('-');
    const data = monthMap.get(key)!;
    return {
      label: MONTH_NAMES[parseInt(monthStr, 10) - 1],
      income: Math.round(data.income * 100) / 100,
      expense: Math.round(data.expense * 100) / 100,
      net: Math.round((data.income - data.expense) * 100) / 100,
    };
  });

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dayBalanceMap = new Map<string, number>();
  let runningBalance = 0;

  for (const t of sorted) {
    runningBalance += t.type === 'add' ? t.amount : -t.amount;
    runningBalance = Math.round(runningBalance * 100) / 100;
    const d = new Date(t.date);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayBalanceMap.set(dayKey, runningBalance);
  }

  const sortedDays = [...dayBalanceMap.keys()].sort();
  const allBalancePoints: BalancePoint[] = sortedDays.map((key) => {
    const [, m, day] = key.split('-');
    return {
      label: `${MONTH_NAMES[parseInt(m, 10) - 1]} ${parseInt(day, 10)}`,
      balance: dayBalanceMap.get(key)!,
    };
  });

  let balanceOverTime: BalancePoint[];
  if (allBalancePoints.length <= MAX_BALANCE_POINTS) {
    balanceOverTime = allBalancePoints;
  } else {
    balanceOverTime = [];
    for (let i = 0; i < MAX_BALANCE_POINTS; i++) {
      const idx = Math.round((i / (MAX_BALANCE_POINTS - 1)) * (allBalancePoints.length - 1));
      balanceOverTime.push(allBalancePoints[idx]);
    }
  }

  return {
    totalIncome,
    totalExpense,
    transactionCount: transactions.length,
    avgAmount: transactions.length > 0
      ? Math.round(((totalIncome + totalExpense) / transactions.length) * 100) / 100
      : 0,
    categoryStats,
    monthlyStats,
    balanceOverTime,
  };
}

export function StatsView({ transactions, colors }: StatsViewProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const stats = useMemo(() => computeStats(transactions), [transactions]);
  const [lineChartWidth, setLineChartWidth] = useState(0);

  const lineChartData = useMemo(() => {
    const data = stats.balanceOverTime;
    if (data.length < 2 || lineChartWidth <= 0) return null;

    const balances = data.map((p) => p.balance);
    const minBal = Math.min(...balances);
    const maxBal = Math.max(...balances);
    const range = maxBal - minBal || 1;
    const padY = DOT_SIZE / 2 + 2;
    const plotH = LINE_CHART_HEIGHT - padY * 2;

    const points = data.map((p, i) => ({
      x: (i / (data.length - 1)) * lineChartWidth,
      y: padY + plotH - ((p.balance - minBal) / range) * plotH,
    }));

    const labelCount = Math.min(5, data.length);
    const xLabels: { label: string; x: number }[] = [];
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
      xLabels.push({ label: data[idx].label, x: points[idx].x });
    }

    const endBalance = data[data.length - 1].balance;
    const lineColor = endBalance >= 0 ? colors.success : colors.danger;

    const fmtY = (v: number) =>
      `$${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v % 1 === 0 ? v.toString() : v.toFixed(2)}`;

    return { points, minBal, maxBal, xLabels, lineColor, fmtY };
  }, [stats.balanceOverTime, lineChartWidth, colors]);

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={styles.emptyTitle}>No Data Yet</Text>
        <Text style={styles.emptySubtitle}>
          Stats will appear once there are transactions to analyze.
        </Text>
      </View>
    );
  }

  const maxMonthlyValue = Math.max(
    ...stats.monthlyStats.map((m) => Math.max(m.income, m.expense)),
    1
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.success }]}>
          <Text style={styles.summaryLabel}>Total Income</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            ${stats.totalIncome.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.danger }]}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>
            ${stats.totalExpense.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.primary }]}>
          <Text style={styles.summaryLabel}>Transactions</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {stats.transactionCount}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.warning }]}>
          <Text style={styles.summaryLabel}>Avg Amount</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            ${stats.avgAmount.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Income vs Expense */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Income vs Expenses</Text>
        <View style={styles.comparisonCard}>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonLabel}>
              <View style={[styles.comparisonDot, { backgroundColor: colors.success }]} />
              <Text style={styles.comparisonText}>Income</Text>
            </View>
            <Text style={[styles.comparisonAmount, { color: colors.success }]}>
              ${stats.totalIncome.toFixed(2)}
            </Text>
          </View>
          <View style={styles.comparisonBarContainer}>
            <View
              style={[
                styles.comparisonBar,
                {
                  backgroundColor: colors.success,
                  width: stats.totalIncome + stats.totalExpense > 0
                    ? `${(stats.totalIncome / (stats.totalIncome + stats.totalExpense)) * 100}%`
                    : '50%',
                },
              ]}
            />
            <View
              style={[
                styles.comparisonBar,
                {
                  backgroundColor: colors.danger,
                  width: stats.totalIncome + stats.totalExpense > 0
                    ? `${(stats.totalExpense / (stats.totalIncome + stats.totalExpense)) * 100}%`
                    : '50%',
                },
              ]}
            />
          </View>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonLabel}>
              <View style={[styles.comparisonDot, { backgroundColor: colors.danger }]} />
              <Text style={styles.comparisonText}>Expenses</Text>
            </View>
            <Text style={[styles.comparisonAmount, { color: colors.danger }]}>
              ${stats.totalExpense.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Monthly Trend */}
      {stats.monthlyStats.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Trend</Text>
          <View style={styles.chartCard}>
            <View style={styles.barChart}>
              {stats.monthlyStats.map((month, index) => (
                <View key={index} style={styles.barGroup}>
                  <View style={styles.barPair}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max((month.income / maxMonthlyValue) * 120, 2),
                          backgroundColor: colors.success,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max((month.expense / maxMonthlyValue) * 120, 2),
                          backgroundColor: colors.danger,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{month.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={styles.legendText}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                <Text style={styles.legendText}>Expenses</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Balance Over Time */}
      {stats.balanceOverTime.length >= 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balance Over Time</Text>
          <View style={styles.chartCard}>
            <View style={styles.lineChartContainer}>
              <View style={styles.lineChartYAxis}>
                <Text style={styles.lineChartYLabel}>
                  {lineChartData ? lineChartData.fmtY(lineChartData.maxBal) : ''}
                </Text>
                <Text style={styles.lineChartYLabel}>
                  {lineChartData ? lineChartData.fmtY(lineChartData.minBal) : ''}
                </Text>
              </View>
              <View
                style={styles.lineChartArea}
                onLayout={(e) => setLineChartWidth(e.nativeEvent.layout.width)}
              >
                {lineChartData && (
                  <>
                    <View style={[styles.lineChartGridLine, { top: 0 }]} />
                    <View style={[styles.lineChartGridLine, { top: '50%' }]} />
                    <View style={[styles.lineChartGridLine, { bottom: 0 }]} />

                    {lineChartData.minBal < 0 && lineChartData.maxBal > 0 && (
                      <View
                        style={[
                          styles.lineChartZeroLine,
                          {
                            bottom:
                              ((0 - lineChartData.minBal) /
                                (lineChartData.maxBal - lineChartData.minBal)) *
                              LINE_CHART_HEIGHT,
                          },
                        ]}
                      />
                    )}

                    {lineChartData.points.map((point, i) => {
                      if (i === 0) return null;
                      const prev = lineChartData.points[i - 1];
                      const avgY = (prev.y + point.y) / 2;
                      return (
                        <View
                          key={`fill-${i}`}
                          style={{
                            position: 'absolute',
                            left: prev.x,
                            top: avgY,
                            width: Math.max(point.x - prev.x, 1),
                            height: LINE_CHART_HEIGHT - avgY,
                            backgroundColor: lineChartData.lineColor + '18',
                          }}
                        />
                      );
                    })}

                    {lineChartData.points.map((point, i) => {
                      if (i === 0) return null;
                      const prev = lineChartData.points[i - 1];
                      const dx = point.x - prev.x;
                      const dy = point.y - prev.y;
                      const length = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx);
                      return (
                        <View
                          key={`line-${i}`}
                          style={{
                            position: 'absolute',
                            left: (prev.x + point.x) / 2 - length / 2,
                            top: (prev.y + point.y) / 2 - 1.25,
                            width: length,
                            height: 2.5,
                            backgroundColor: lineChartData.lineColor,
                            borderRadius: 1.25,
                            transform: [{ rotate: `${angle}rad` }],
                          }}
                        />
                      );
                    })}

                    {lineChartData.points.map((point, i) => (
                      <View
                        key={`dot-${i}`}
                        style={{
                          position: 'absolute',
                          left: point.x - DOT_SIZE / 2,
                          top: point.y - DOT_SIZE / 2,
                          width: DOT_SIZE,
                          height: DOT_SIZE,
                          borderRadius: DOT_SIZE / 2,
                          backgroundColor: lineChartData.lineColor,
                          borderWidth: 2,
                          borderColor: colors.surface,
                        }}
                      />
                    ))}
                  </>
                )}
              </View>
            </View>
            <View style={styles.lineChartXAxis}>
              {lineChartData?.xLabels.map((lbl, i) => (
                <Text
                  key={i}
                  style={[
                    styles.lineChartXLabel,
                    i === 0 && { textAlign: 'left' },
                    i === (lineChartData.xLabels.length - 1) && { textAlign: 'right' },
                  ]}
                >
                  {lbl.label}
                </Text>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Spending by Category */}
      {stats.categoryStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          <View style={styles.categoryCard}>
            {stats.categoryStats.map((cat) => (
              <View key={cat.id} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <View style={styles.categoryDetails}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{cat.label}</Text>
                      <Text style={styles.categoryAmount}>${cat.amount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.categoryBarBg}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            width: `${cat.percentage}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
                <Text style={styles.categoryPercentage}>{cat.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: Spacing.xl,
      paddingBottom: 40,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: 40,
    },
    emptyEmoji: {
      fontSize: 64,
      marginBottom: Spacing.lg,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    emptySubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
      marginBottom: Spacing.xxl,
    },
    summaryCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: Spacing.lg,
      borderLeftWidth: 4,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    summaryLabel: {
      fontSize: 12,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    summaryValue: {
      fontSize: 22,
      fontFamily: FontFamily.extraBold,
      fontWeight: '800',
    },
    section: {
      marginBottom: Spacing.xxl,
    },
    sectionTitle: {
      fontSize: 17,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.text,
      marginBottom: Spacing.md,
    },
    comparisonCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: Spacing.xl,
      gap: Spacing.md,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    comparisonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    comparisonLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    comparisonDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    comparisonText: {
      fontSize: 14,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: colors.text,
    },
    comparisonAmount: {
      fontSize: 16,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
    },
    comparisonBarContainer: {
      flexDirection: 'row',
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
      gap: 2,
    },
    comparisonBar: {
      height: '100%',
      borderRadius: 6,
    },
    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: Spacing.xl,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    barChart: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      height: 140,
      marginBottom: Spacing.lg,
    },
    barGroup: {
      alignItems: 'center',
      flex: 1,
    },
    barPair: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
      marginBottom: Spacing.sm,
    },
    bar: {
      width: 14,
      borderRadius: 4,
      minHeight: 2,
    },
    barLabel: {
      fontSize: 11,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textLight,
    },
    chartLegend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.xl,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 12,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    categoryCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: Spacing.lg,
      gap: Spacing.lg,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    categoryInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    categoryEmoji: {
      fontSize: 22,
    },
    categoryDetails: {
      flex: 1,
      gap: 6,
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    categoryName: {
      fontSize: 14,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.text,
    },
    categoryAmount: {
      fontSize: 14,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.text,
    },
    categoryBarBg: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceAlt,
    },
    categoryBarFill: {
      height: '100%',
      borderRadius: 3,
      minWidth: 2,
    },
    categoryPercentage: {
      fontSize: 13,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.textSecondary,
      width: 38,
      textAlign: 'right',
    },
    lineChartContainer: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    lineChartYAxis: {
      width: 48,
      justifyContent: 'space-between',
      paddingRight: Spacing.sm,
    },
    lineChartYLabel: {
      fontSize: 11,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textLight,
      textAlign: 'right',
    },
    lineChartArea: {
      flex: 1,
      height: LINE_CHART_HEIGHT,
      position: 'relative' as const,
      overflow: 'hidden',
    },
    lineChartGridLine: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.borderLight,
    },
    lineChartZeroLine: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.textLight,
      opacity: 0.5,
    },
    lineChartXAxis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingLeft: 48,
    },
    lineChartXLabel: {
      fontSize: 10,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textLight,
      textAlign: 'center',
    },
  });
