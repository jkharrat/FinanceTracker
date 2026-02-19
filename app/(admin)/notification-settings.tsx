import React, { useMemo } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { useNotifications } from '../../src/context/NotificationContext';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';

interface SettingRowProps {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: ThemeColors;
}

function SettingRow({ label, description, value, onValueChange, colors }: SettingRowProps) {
  return (
    <View style={[rowStyles.container, { borderBottomColor: colors.borderLight }]}>
      <View style={rowStyles.textContainer}>
        <Text style={[rowStyles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[rowStyles.description, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : colors.textLight}
      />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  label: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { preferences, updatePreferences } = useNotifications();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          PUSH NOTIFICATIONS
        </Text>
        <SettingRow
          label="Push Notifications"
          description="Show system notifications even when the app is in the background"
          value={preferences.pushEnabled}
          onValueChange={(value) => updatePreferences({ pushEnabled: value })}
          colors={colors}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          NOTIFICATION TYPES
        </Text>
        <SettingRow
          label="Allowance"
          description="Get notified when allowance is deposited"
          value={preferences.allowance}
          onValueChange={(value) => updatePreferences({ allowance: value })}
          colors={colors}
        />
        <SettingRow
          label="Transactions"
          description="Get notified when transactions are added, edited, or deleted"
          value={preferences.transactions}
          onValueChange={(value) => updatePreferences({ transactions: value })}
          colors={colors}
        />
        <SettingRow
          label="Transfers"
          description="Get notified when money is transferred between accounts"
          value={preferences.transfers}
          onValueChange={(value) => updatePreferences({ transfers: value })}
          colors={colors}
        />
        <SettingRow
          label="Savings Goal Milestones"
          description="Get notified when savings goals reach 25%, 50%, 75%, and 100%"
          value={preferences.goalMilestones}
          onValueChange={(value) => updatePreferences({ goalMilestones: value })}
          colors={colors}
        />
      </View>

      <Text style={[styles.footer, { color: colors.textLight }]}>
        Notification preferences apply to all accounts. Disabling a notification type will prevent
        both in-app and push notifications for that category.
      </Text>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingVertical: Spacing.lg,
    },
    section: {
      marginBottom: Spacing.xxl,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      letterSpacing: 0.5,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.sm,
    },
    footer: {
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: Spacing.lg,
      textAlign: 'center',
    },
  });
