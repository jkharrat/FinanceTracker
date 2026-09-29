import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { ThemeColors } from '../constants/colors';
import { Transaction } from '../types';
import { computeStats } from '../utils/stats';
import { Radius, Type, Elevation } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import AnimatedListItem from './AnimatedListItem';

interface StatsViewProps {
  transactions: Transaction[];
  colors: ThemeColors;
}

const LINE_CHART_HEIGHT = 140;
const BAR_CHART_HEIGHT = 120;
const Y_AXIS_WIDTH = 44;

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const midX = (prev.x + cur.x) / 2;
    d += ` C ${midX} ${prev.y}, ${midX} ${cur.y}, ${cur.x} ${cur.y}`;
  }
  return d;
}

export function StatsView({ transactions, colors }: StatsViewProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const stats = useMemo(() => computeStats(transactions), [transactions]);
  const [lineChartWidth, setLineChartWidth] = useState(0);

  const incomeColor = colors.primary;
  const expenseColor = colors.textLight;

  const lineChartData = useMemo(() => {
    const data = stats.balanceOverTime;
    if (data.length < 2 || lineChartWidth <= 0) return null;

    const balances = data.map((p) => p.balance);
    const minBal = Math.min(...balances);
    const maxBal = Math.max(...balances);
    const range = maxBal - minBal || 1;
    const padY = 8;
    const plotH = LINE_CHART_HEIGHT - padY * 2;
    const toY = (v: number) => padY + plotH - ((v - minBal) / range) * plotH;

    // Inset so the end-point marker isn't clipped by the chart edge.
    const padX = 6;
    const plotW = lineChartWidth - padX * 2;
    const points = data.map((p, i) => ({
      x: padX + (i / (data.length - 1)) * plotW,
      y: toY(p.balance),
    }));

    const labelCount = Math.min(5, data.length);
    const xLabels: string[] = [];
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
      xLabels.push(data[idx].label);
    }

    const endBalance = data[data.length - 1].balance;
    const lineColor = endBalance >= 0 ? colors.primary : colors.danger;
    const line = smoothPath(points);
    const last = points[points.length - 1];
    const area = `${line} L ${last.x} ${LINE_CHART_HEIGHT} L ${points[0].x} ${LINE_CHART_HEIGHT} Z`;
    const zeroY = minBal < 0 && maxBal > 0 ? toY(0) : null;

    const fmtY = (v: number) => {
      const abs = Math.abs(v);
      const body = abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : abs % 1 === 0 ? abs.toString() : abs.toFixed(2);
      return `${v < 0 ? '-' : ''}$${body}`;
    };

    return { minBal, maxBal, xLabels, lineColor, line, area, last, zeroY, fmtY };
  }, [stats.balanceOverTime, lineChartWidth, colors]);

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Text style={styles.emptyEmoji}>📊</Text>
        </View>
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
  const flowTotal = stats.totalIncome + stats.totalExpense;
  const incomeShare = flowTotal > 0 ? (stats.totalIncome / flowTotal) * 100 : 50;

  const summary = [
    { label: 'Total Income', value: `$${stats.totalIncome.toFixed(2)}` },
    { label: 'Total Expenses', value: `$${stats.totalExpense.toFixed(2)}` },
    { label: 'Transactions', value: `${stats.transactionCount}` },
    { label: 'Avg Amount', value: `$${stats.avgAmount.toFixed(2)}` },
  ];

  let section = 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AnimatedListItem index={section++}>
        <View style={styles.summaryGrid}>
          {summary.map((item) => (
            <View key={item.label} style={[styles.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </AnimatedListItem>

      <AnimatedListItem index={section++}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income vs Expenses</Text>
          <View style={[styles.card, styles.cardPadded, styles.comparisonCard]}>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonLabel}>
                <View style={[styles.dot, { backgroundColor: incomeColor }]} />
                <Text style={styles.comparisonText}>Income</Text>
              </View>
              <Text style={styles.comparisonAmount}>${stats.totalIncome.toFixed(2)}</Text>
            </View>
            <View style={styles.comparisonBarContainer}>
              <View style={[styles.comparisonBar, { backgroundColor: incomeColor, width: `${incomeShare}%` }]} />
              <View style={[styles.comparisonBar, { backgroundColor: expenseColor, width: `${100 - incomeShare}%` }]} />
            </View>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonLabel}>
                <View style={[styles.dot, { backgroundColor: expenseColor }]} />
                <Text style={styles.comparisonText}>Expenses</Text>
              </View>
              <Text style={styles.comparisonAmount}>${stats.totalExpense.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </AnimatedListItem>

      {stats.monthlyStats.length > 1 && (
        <AnimatedListItem index={section++}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Trend</Text>
            <View style={[styles.card, styles.cardPadded]}>
              <View style={styles.barChart}>
                {stats.monthlyStats.map((month, index) => (
                  <View key={index} style={styles.barGroup}>
                    <View style={styles.barPair}>
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max((month.income / maxMonthlyValue) * BAR_CHART_HEIGHT, 3), backgroundColor: incomeColor },
                        ]}
                      />
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max((month.expense / maxMonthlyValue) * BAR_CHART_HEIGHT, 3), backgroundColor: expenseColor },
                        ]}
                      />
                    </View>
                    <Text style={styles.axisLabel}>{month.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: incomeColor }]} />
                  <Text style={styles.legendText}>Income</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: expenseColor }]} />
                  <Text style={styles.legendText}>Expenses</Text>
                </View>
              </View>
            </View>
          </View>
        </AnimatedListItem>
      )}

      {stats.balanceOverTime.length >= 2 && (
        <AnimatedListItem index={section++}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Balance Over Time</Text>
            <View style={[styles.card, styles.cardPadded]}>
              <View style={styles.lineChartContainer}>
                <View style={styles.lineChartYAxis}>
                  <Text style={[styles.axisLabel, styles.yLabel]}>
                    {lineChartData ? lineChartData.fmtY(lineChartData.maxBal) : ''}
                  </Text>
                  <Text style={[styles.axisLabel, styles.yLabel]}>
                    {lineChartData ? lineChartData.fmtY(lineChartData.minBal) : ''}
                  </Text>
                </View>
                <View
                  style={styles.lineChartArea}
                  onLayout={(e) => setLineChartWidth(e.nativeEvent.layout.width)}
                >
                  {lineChartData && (
                    <Svg width={lineChartWidth} height={LINE_CHART_HEIGHT}>
                      <Defs>
                        <LinearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor={lineChartData.lineColor} stopOpacity={0.18} />
                          <Stop offset="1" stopColor={lineChartData.lineColor} stopOpacity={0} />
                        </LinearGradient>
                      </Defs>
                      <Line x1={0} x2={lineChartWidth} y1={0.5} y2={0.5} stroke={colors.hairline} strokeWidth={1} />
                      <Line
                        x1={0}
                        x2={lineChartWidth}
                        y1={LINE_CHART_HEIGHT - 0.5}
                        y2={LINE_CHART_HEIGHT - 0.5}
                        stroke={colors.hairline}
                        strokeWidth={1}
                      />
                      {lineChartData.zeroY !== null && (
                        <Line
                          x1={0}
                          x2={lineChartWidth}
                          y1={lineChartData.zeroY}
                          y2={lineChartData.zeroY}
                          stroke={colors.textLight}
                          strokeWidth={1}
                          strokeDasharray="4 4"
                        />
                      )}
                      <Path d={lineChartData.area} fill="url(#balanceFill)" />
                      <Path
                        d={lineChartData.line}
                        stroke={lineChartData.lineColor}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <Circle
                        cx={lineChartData.last.x}
                        cy={lineChartData.last.y}
                        r={4.5}
                        fill={lineChartData.lineColor}
                        stroke={colors.surface}
                        strokeWidth={2}
                      />
                    </Svg>
                  )}
                </View>
              </View>
              <View style={styles.lineChartXAxis}>
                {lineChartData?.xLabels.map((label, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.axisLabel,
                      i === 0 && { textAlign: 'left' },
                      i === lineChartData.xLabels.length - 1 && { textAlign: 'right' },
                    ]}
                  >
                    {label}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </AnimatedListItem>
      )}

      {stats.categoryStats.length > 0 && (
        <AnimatedListItem index={section++}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            <View style={[styles.card, styles.cardPadded, styles.categoryCard]}>
              {stats.categoryStats.map((cat) => (
                <View key={cat.id} style={styles.categoryRow}>
                  <View style={styles.categoryIcon}>
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  </View>
                  <View style={styles.categoryDetails}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{cat.label}</Text>
                      <Text style={styles.categoryAmount}>${cat.amount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.categoryBarBg}>
                      <View
                        style={[styles.categoryBarFill, { width: `${cat.percentage}%`, backgroundColor: colors.primary }]}
                      />
                    </View>
                  </View>
                  <Text style={styles.categoryPercentage}>{cat.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedListItem>
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
      paddingBottom: 48,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: 40,
    },
    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    emptyEmoji: {
      fontSize: 32,
    },
    emptyTitle: {
      ...Type.headline,
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    emptySubtitle: {
      ...Type.body,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 300,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      ...Elevation.card,
    },
    cardPadded: {
      padding: Spacing.lg,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
      marginBottom: Spacing.xxl,
    },
    summaryCard: {
      flexGrow: 1,
      flexBasis: '45%',
      padding: Spacing.lg,
    },
    summaryLabel: {
      ...Type.label,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    summaryValue: {
      ...Type.title,
      fontSize: 22,
      fontVariant: ['tabular-nums'],
      color: colors.text,
    },
    section: {
      marginBottom: Spacing.xxl,
    },
    sectionTitle: {
      ...Type.headline,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    comparisonCard: {
      gap: Spacing.md,
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
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    comparisonText: {
      ...Type.label,
      fontSize: 14,
      color: colors.textSecondary,
    },
    comparisonAmount: {
      ...Type.amount,
      color: colors.text,
    },
    comparisonBarContainer: {
      flexDirection: 'row',
      height: 8,
      borderRadius: Radius.pill,
      overflow: 'hidden',
      gap: 3,
    },
    comparisonBar: {
      height: '100%',
      borderRadius: Radius.pill,
    },
    barChart: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      height: BAR_CHART_HEIGHT + 24,
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
      width: 12,
      borderRadius: 4,
    },
    axisLabel: {
      ...Type.caption,
      fontSize: 11,
      fontVariant: ['tabular-nums'],
      color: colors.textLight,
    },
    yLabel: {
      textAlign: 'right',
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
    legendText: {
      ...Type.caption,
      color: colors.textSecondary,
    },
    categoryCard: {
      gap: Spacing.lg,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    categoryIcon: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryEmoji: {
      fontSize: 17,
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
      ...Type.label,
      fontSize: 14,
      color: colors.text,
    },
    categoryAmount: {
      ...Type.amount,
      fontSize: 14,
      color: colors.text,
    },
    categoryBarBg: {
      height: 6,
      borderRadius: Radius.pill,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    categoryBarFill: {
      height: '100%',
      borderRadius: Radius.pill,
      minWidth: 3,
    },
    categoryPercentage: {
      ...Type.label,
      fontVariant: ['tabular-nums'],
      color: colors.textSecondary,
      width: 40,
      textAlign: 'right',
    },
    lineChartContainer: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    lineChartYAxis: {
      width: Y_AXIS_WIDTH,
      justifyContent: 'space-between',
      paddingRight: Spacing.sm,
    },
    lineChartArea: {
      flex: 1,
      height: LINE_CHART_HEIGHT,
    },
    lineChartXAxis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingLeft: Y_AXIS_WIDTH,
    },
  });
