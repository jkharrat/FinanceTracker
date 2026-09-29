import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  useReducedMotion,
  Easing,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { ThemeColors } from '../constants/colors';
import { useIsKid } from '../context/ThemeContext';
import { Transaction } from '../types';
import { computeStats } from '../utils/stats';
import { computeKidBadges } from '../utils/kidBadges';
import { Radius, Type, Elevation, KidRadius, KidType } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import { Durations, Springs } from '../constants/motion';
import AnimatedListItem from './AnimatedListItem';
import AnimatedNumber from './AnimatedNumber';
import GrowIn from './GrowIn';
import { useSheetStagger } from './SheetEntrance';
import { kidBubbleTint } from './TransactionItem';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BAR_STAGGER_MS = 60;
/** Kid summary numbers wait this long before counting up, so the sheet has settled. */
const COUNT_UP_DELAY_MS = 250;
const COUNT_UP_MS = 900;
const LINE_DRAW_MS = 1100;
const LINE_DRAW_DELAY_MS = 450;
const BADGE_DELAY_MS = 300;
const BADGE_STAGGER_MS = 140;
const END_DOT = 13;

interface StatsViewProps {
  transactions: Transaction[];
  colors: ThemeColors;
}

const LINE_CHART_HEIGHT = 140;
const BAR_CHART_HEIGHT = 120;
const Y_AXIS_WIDTH = 44;

type ChartPoint = { x: number; y: number };

/** Length of the path `smoothPath` draws, by sampling each curve. Slightly generous is fine for a dash reveal. */
function smoothPathLength(points: ChartPoint[]) {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p3 = points[i];
    const midX = (p0.x + p3.x) / 2;
    let px = p0.x;
    let py = p0.y;
    for (let step = 1; step <= 16; step++) {
      const t = step / 16;
      const u = 1 - t;
      const x = u * u * u * p0.x + 3 * u * u * t * midX + 3 * u * t * t * midX + t * t * t * p3.x;
      const y = u * u * u * p0.y + 3 * u * u * t * p0.y + 3 * u * t * t * p3.y + t * t * t * p3.y;
      length += Math.hypot(x - px, y - py);
      px = x;
      py = y;
    }
  }
  return Math.ceil(length) + 2;
}

interface KidBalanceLineProps {
  line: string;
  area: string;
  length: number;
  color: string;
}

/** Kid balance line: draws itself left to right, then the fill fades in. */
function KidBalanceLine({ line, area, length, color }: KidBalanceLineProps) {
  const reducedMotion = useReducedMotion();
  const draw = useSharedValue(reducedMotion ? 1 : 0);
  const fill = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    draw.value = withDelay(LINE_DRAW_DELAY_MS, withTiming(1, { duration: LINE_DRAW_MS, easing: Easing.inOut(Easing.cubic) }));
    fill.value = withDelay(LINE_DRAW_DELAY_MS + LINE_DRAW_MS * 0.7, withTiming(1, { duration: Durations.slow }));
  }, [reducedMotion, draw, fill]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.value) }));
  const areaProps = useAnimatedProps(() => ({ opacity: fill.value }));

  return (
    <>
      <AnimatedPath d={area} fill="url(#balanceFill)" animatedProps={areaProps} />
      <AnimatedPath
        d={line}
        stroke={color}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={length}
        animatedProps={lineProps}
      />
    </>
  );
}

/** The kid chart's end point, drawn as a view over the SVG so it can pop with a transform. */
function KidEndDot({ last, color, ringColor }: { last: ChartPoint; color: string; ringColor: string }) {
  const reducedMotion = useReducedMotion();
  const dot = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    dot.value = withDelay(LINE_DRAW_DELAY_MS + LINE_DRAW_MS, withSpring(1, Springs.celebrate));
  }, [reducedMotion, dot]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: Math.min(dot.value * 2, 1),
    transform: [{ scale: dot.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        kidLineStyles.dot,
        { left: last.x - END_DOT / 2, top: last.y - END_DOT / 2, backgroundColor: color, borderColor: ringColor },
        dotStyle,
      ]}
    />
  );
}

const kidLineStyles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: END_DOT,
    height: END_DOT,
    borderRadius: END_DOT / 2,
    borderWidth: 2.5,
  },
});

function smoothPath(points: ChartPoint[]) {
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
  const isKid = useIsKid();
  const reducedMotion = useReducedMotion();
  const stagger = useSheetStagger();
  const styles = useMemo(() => createStyles(colors, isKid), [colors, isKid]);
  const stats = useMemo(() => computeStats(transactions), [transactions]);
  const badges = useMemo(() => (isKid ? computeKidBadges(transactions) : []), [isKid, transactions]);
  const [lineChartWidth, setLineChartWidth] = useState(0);
  const [counted, setCounted] = useState(!isKid || reducedMotion);

  useEffect(() => {
    if (counted) return;
    const timer = setTimeout(() => setCounted(true), COUNT_UP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [counted]);

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

    const length = smoothPathLength(points);

    return { minBal, maxBal, xLabels, lineColor, line, area, last, zeroY, fmtY, length };
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
    { label: 'Total Income', value: `$${stats.totalIncome.toFixed(2)}`, amount: stats.totalIncome, currency: true },
    { label: 'Total Expenses', value: `$${stats.totalExpense.toFixed(2)}`, amount: stats.totalExpense, currency: true },
    { label: 'Transactions', value: `${stats.transactionCount}`, amount: stats.transactionCount, currency: false },
    { label: 'Avg Amount', value: `$${stats.avgAmount.toFixed(2)}`, amount: stats.avgAmount, currency: true },
  ];

  let section = 0;
  const reveal = (order: number, children: React.ReactNode) =>
    isKid ? (
      <Animated.View entering={stagger(order)}>{children}</Animated.View>
    ) : (
      <AnimatedListItem index={order}>{children}</AnimatedListItem>
    );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {reveal(section++, (
      <>
        <View style={styles.summaryGrid}>
          {summary.map((item) => (
            <View key={item.label} style={[styles.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              {isKid ? (
                <AnimatedNumber
                  value={counted ? item.amount : 0}
                  currency={item.currency}
                  decimals={item.currency ? 2 : 0}
                  duration={COUNT_UP_MS}
                  style={styles.summaryValue}
                />
              ) : (
                <Text style={styles.summaryValue}>{item.value}</Text>
              )}
            </View>
          ))}
        </View>
      </>
      ))}

      {badges.length > 0 && reveal(section++, (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your badges</Text>
          <View style={styles.badgeList}>
            {badges.map((badge, i) => (
              <Animated.View
                key={badge.id}
                entering={
                  reducedMotion
                    ? FadeIn.duration(Durations.base)
                    : ZoomIn.delay(BADGE_DELAY_MS + i * BADGE_STAGGER_MS).springify().damping(Springs.bouncy.damping)
                }
                style={[styles.card, styles.badge]}
              >
                <View style={styles.badgeEmojiWrap}>
                  <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                </View>
                <Text style={styles.badgeText}>{badge.label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>
      ))}

      {reveal(section++, (
      <>
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
            <GrowIn axis="x" delay={150} style={styles.comparisonBarContainer}>
              <View style={[styles.comparisonBar, { backgroundColor: incomeColor, width: `${incomeShare}%` }]} />
              <View style={[styles.comparisonBar, { backgroundColor: expenseColor, width: `${100 - incomeShare}%` }]} />
            </GrowIn>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonLabel}>
                <View style={[styles.dot, { backgroundColor: expenseColor }]} />
                <Text style={styles.comparisonText}>Expenses</Text>
              </View>
              <Text style={styles.comparisonAmount}>${stats.totalExpense.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </>
      ))}

      {stats.monthlyStats.length > 1 && reveal(section++, (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Trend</Text>
            <View style={[styles.card, styles.cardPadded]}>
              <View style={styles.barChart}>
                {stats.monthlyStats.map((month, index) => (
                  <View key={index} style={styles.barGroup}>
                    <View style={styles.barPair}>
                      <GrowIn
                        axis="y"
                        delay={200 + index * BAR_STAGGER_MS}
                        style={[
                          styles.bar,
                          { height: Math.max((month.income / maxMonthlyValue) * BAR_CHART_HEIGHT, 3), backgroundColor: incomeColor },
                        ]}
                      />
                      <GrowIn
                        axis="y"
                        delay={230 + index * BAR_STAGGER_MS}
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
        </>
      ))}

      {stats.balanceOverTime.length >= 2 && reveal(section++, (
        <>
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
                      {isKid ? (
                        <KidBalanceLine
                          line={lineChartData.line}
                          area={lineChartData.area}
                          length={lineChartData.length}
                          color={lineChartData.lineColor}
                        />
                      ) : (
                        <>
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
                        </>
                      )}
                    </Svg>
                  )}
                  {isKid && lineChartData && (
                    <KidEndDot last={lineChartData.last} color={lineChartData.lineColor} ringColor={colors.surface} />
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
        </>
      ))}

      {stats.categoryStats.length > 0 && reveal(section++, (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            <View style={[styles.card, styles.cardPadded, styles.categoryCard]}>
              {stats.categoryStats.map((cat, catIndex) => (
                <View key={cat.id} style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, isKid && { backgroundColor: kidBubbleTint(cat.id) }]}>
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  </View>
                  <View style={styles.categoryDetails}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{cat.label}</Text>
                      <Text style={styles.categoryAmount}>${cat.amount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.categoryBarBg}>
                      <GrowIn
                        axis="x"
                        delay={250 + catIndex * BAR_STAGGER_MS}
                        style={[styles.categoryBarFill, { width: `${cat.percentage}%`, backgroundColor: colors.primary }]}
                      />
                    </View>
                  </View>
                  <Text style={styles.categoryPercentage}>{cat.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors, isKid: boolean) =>
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
      ...(isKid ? KidType.headline : Type.headline),
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
      borderRadius: isKid ? KidRadius.card : Radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      ...(isKid ? Elevation.kid : Elevation.card),
    },
    cardPadded: {
      padding: isKid ? Spacing.xl : Spacing.lg,
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
      padding: isKid ? Spacing.xl : Spacing.lg,
    },
    summaryLabel: {
      ...Type.label,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    summaryValue: {
      ...(isKid ? KidType.title : Type.title),
      fontSize: isKid ? 24 : 22,
      fontVariant: ['tabular-nums'],
      color: colors.text,
    },
    section: {
      marginBottom: Spacing.xxl,
    },
    sectionTitle: {
      ...(isKid ? KidType.headline : Type.headline),
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
      ...(isKid ? KidType.amount : Type.amount),
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
      width: isKid ? 14 : 12,
      borderRadius: isKid ? 7 : 4,
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
      width: isKid ? 44 : 36,
      height: isKid ? 44 : 36,
      borderRadius: isKid ? KidRadius.bubble : Radius.md,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryEmoji: {
      fontSize: isKid ? 21 : 17,
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
      ...(isKid ? KidType.amount : Type.amount),
      fontSize: 14,
      color: colors.text,
    },
    categoryBarBg: {
      height: isKid ? 8 : 6,
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
    badgeList: {
      gap: Spacing.sm,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    badgeEmojiWrap: {
      width: 40,
      height: 40,
      borderRadius: KidRadius.bubble,
      backgroundColor: colors.warningLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeEmoji: {
      fontSize: 22,
    },
    badgeText: {
      ...KidType.button,
      flex: 1,
      color: colors.text,
    },
    lineChartXAxis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingLeft: Y_AXIS_WIDTH,
    },
  });
