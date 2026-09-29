import React, { useMemo } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../src/context/NotificationContext';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';
import { KidRadius, KidType, Type } from '../../src/constants/theme';
import { Spacing } from '../../src/constants/spacing';
import SheetEntrance, { useSheetStagger } from '../../src/components/SheetEntrance';
import { Card } from '../../src/components/ui';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last?: boolean;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}

function SettingRow({ icon, tint, label, description, value, onValueChange, last, styles, colors }: SettingRowProps) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={[styles.iconBubble, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.textWhite}
        {...(Platform.OS === 'web' && ({ activeThumbColor: colors.textWhite } as object))}
        accessibilityLabel={label}
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const enter = useSheetStagger();
  const { preferences, updatePreferences } = useNotifications();

  const types = [
    {
      key: 'allowance' as const,
      icon: 'cash-outline' as const,
      tint: colors.success,
      label: 'Allowance',
      description: 'When allowance is deposited',
    },
    {
      key: 'transactions' as const,
      icon: 'receipt-outline' as const,
      tint: colors.primary,
      label: 'Transactions',
      description: 'When transactions are added, edited, or deleted',
    },
    {
      key: 'transfers' as const,
      icon: 'swap-horizontal-outline' as const,
      tint: colors.primary,
      label: 'Transfers',
      description: 'When money moves between accounts',
    },
    {
      key: 'goalMilestones' as const,
      icon: 'trophy-outline' as const,
      tint: colors.warning,
      label: 'Savings goal milestones',
      description: 'When a goal hits 25%, 50%, 75%, and 100%',
    },
  ];

  return (
    <View style={styles.container}>
      <SheetEntrance>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.Text entering={enter(0)} style={styles.sectionTitle}>Push notifications</Animated.Text>
          <Animated.View entering={enter(1)}>
            <Card padded={false} style={styles.card}>
              <SettingRow
                icon="notifications-outline"
                tint={colors.primary}
                label="Push notifications"
                description="Show alerts even when the app is in the background"
                value={preferences.pushEnabled}
                onValueChange={(value) => updatePreferences({ pushEnabled: value })}
                last
                styles={styles}
                colors={colors}
              />
            </Card>
          </Animated.View>

          <Animated.Text entering={enter(2)} style={styles.sectionTitle}>What to notify about</Animated.Text>
          <Animated.View entering={enter(3)}>
            <Card padded={false} style={styles.card}>
              {types.map((t, i) => (
                <SettingRow
                  key={t.key}
                  icon={t.icon}
                  tint={t.tint}
                  label={t.label}
                  description={t.description}
                  value={preferences[t.key]}
                  onValueChange={(value) => updatePreferences({ [t.key]: value })}
                  last={i === types.length - 1}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </Card>
          </Animated.View>

          <Animated.Text entering={enter(4)} style={styles.footer}>
            These preferences apply to every account in your family. Turning a type off stops both
            in-app and push notifications for it.
          </Animated.Text>
        </ScrollView>
      </SheetEntrance>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: Spacing.xl,
      paddingBottom: Spacing.xxxl,
    },
    sectionTitle: {
      ...KidType.headline,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    card: {
      marginBottom: 28,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: 14,
      paddingHorizontal: Spacing.lg,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    iconBubble: {
      width: 40,
      height: 40,
      borderRadius: KidRadius.bubble,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textContainer: {
      flex: 1,
    },
    label: {
      ...KidType.headline,
      fontSize: 16,
      color: colors.text,
      marginBottom: 2,
    },
    description: {
      ...Type.caption,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    footer: {
      ...Type.caption,
      lineHeight: 18,
      color: colors.textLight,
      textAlign: 'center',
      paddingHorizontal: Spacing.lg,
    },
  });
