import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useColors, useIsKid } from '../context/ThemeContext';
import { ThemeColors, KidGoalGradient } from '../constants/colors';
import { SavingsGoal } from '../types';
import { Radius, Type, KidType, KidRadius } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import { Durations, Springs } from '../constants/motion';
import { useShake } from '../hooks/useShake';
import GoalRing from './GoalRing';
import { Card, Button } from './ui';

interface GoalEditorProps {
  existingGoal?: SavingsGoal;
  /** Current balance, for the kid editor's live progress preview. */
  balance?: number;
  onSave: (goal: SavingsGoal) => void;
  onRemove: () => void;
  onCancel: () => void;
}

export default function GoalEditor(props: GoalEditorProps) {
  const isKid = useIsKid();
  return isKid ? <KidGoalEditor {...props} /> : <DefaultGoalEditor {...props} />;
}

function DefaultGoalEditor({ existingGoal, onSave, onRemove, onCancel }: GoalEditorProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [goalName, setGoalName] = useState(existingGoal?.name ?? '');
  const [goalAmount, setGoalAmount] = useState(existingGoal?.targetAmount?.toString() ?? '');

  const canSave = goalName.trim().length > 0 && parseFloat(goalAmount) > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: goalName.trim(), targetAmount: parseFloat(goalAmount) });
  };

  return (
    <Card>
      <Text style={styles.title}>{existingGoal ? 'Edit savings goal' : 'New savings goal'}</Text>
      <TextInput
        style={styles.input}
        value={goalName}
        onChangeText={setGoalName}
        placeholder="What are you saving for?"
        placeholderTextColor={colors.textLight}
        autoFocus
      />
      <View style={styles.amountRow}>
        <Text style={styles.dollar}>$</Text>
        <TextInput
          style={styles.amountInput}
          value={goalAmount}
          onChangeText={setGoalAmount}
          placeholder="0.00"
          placeholderTextColor={colors.textLight}
          keyboardType="decimal-pad"
          onSubmitEditing={handleSave}
        />
      </View>
      <View style={styles.buttons}>
        {existingGoal && (
          <Button title="Remove" variant="destructive" size="sm" onPress={onRemove} style={styles.remove} />
        )}
        <Button title="Cancel" variant="secondary" size="sm" onPress={onCancel} />
        <Button title="Save" size="sm" onPress={handleSave} disabled={!canSave} />
      </View>
    </Card>
  );
}

const PREVIEW_RING = 92;
const FOCUS_SCALE = 1.03;

/** Rounds down so the preview never claims 100% before the kid actually has enough. */
export function previewPercent(balance: number, target: number) {
  if (!(target > 0)) return 0;
  return Math.min(100, Math.max(0, Math.floor((balance / target) * 100)));
}

export function previewCaption(balance: number, target: number) {
  if (!(target > 0)) return 'How much does it cost?';
  const percent = previewPercent(balance, target);
  if (percent >= 100) return 'You already have enough! 🎉';
  if (percent > 0) return `You're already ${percent}% there!`;
  return 'Every coin gets you closer! 🪙';
}

interface FocusFieldProps {
  focused: boolean;
  invalid: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** Soft accent glow and a slight lift while the field inside has focus. */
function FocusField({ focused, invalid, style, children }: FocusFieldProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const focus = useSharedValue(0);

  useEffect(() => {
    const target = focused ? 1 : 0;
    focus.value = reducedMotion
      ? withTiming(target, { duration: Durations.quick })
      : withSpring(target, Springs.gentle);
  }, [focused, reducedMotion, focus]);

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reducedMotion ? 1 : 1 + focus.value * (FOCUS_SCALE - 1) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: focus.value }));

  const accent = invalid ? colors.danger : colors.primary;
  return (
    <Animated.View style={[style, liftStyle]}>
      <Animated.View
        pointerEvents="none"
        style={[
          kidFieldStyles.glow,
          { borderColor: accent, backgroundColor: invalid ? colors.dangerLight : colors.primarySoft },
          Platform.select<ViewStyle>({
            web: { boxShadow: `0 0 14px ${accent}55` } as ViewStyle,
            default: { shadowColor: accent, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
          }),
          glowStyle,
        ]}
      />
      {children}
    </Animated.View>
  );
}

const kidFieldStyles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: KidRadius.bubble + 3,
    borderWidth: 2,
  },
});

const webNoOutline: TextStyle = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {};

function KidGoalEditor({ existingGoal, balance = 0, onSave, onRemove, onCancel }: GoalEditorProps) {
  const colors = useColors();
  const styles = useMemo(() => createKidStyles(colors), [colors]);
  const { shakeStyle, triggerShake } = useShake();
  const [goalName, setGoalName] = useState(existingGoal?.name ?? '');
  const [goalAmount, setGoalAmount] = useState(existingGoal?.targetAmount?.toString() ?? '');
  const [focusedField, setFocusedField] = useState<'name' | 'amount' | null>(null);
  const [attempted, setAttempted] = useState(false);

  const target = parseFloat(goalAmount);
  const nameValid = goalName.trim().length > 0;
  const amountValid = target > 0;
  const canSave = nameValid && amountValid;
  const percent = previewPercent(balance, target);
  const complete = percent >= 100;

  const handleSave = () => {
    if (!canSave) {
      setAttempted(true);
      triggerShake();
      return;
    }
    onSave({ name: goalName.trim(), targetAmount: target });
  };

  const ringGradient: [string, string] = complete
    ? [colors.success, colors.success]
    : [KidGoalGradient.start, colors.primary];

  return (
    <Card>
      <Text style={styles.title}>{existingGoal ? 'Edit your goal' : 'New savings goal'} 🎯</Text>
      <Animated.View style={[styles.row, shakeStyle]}>
        <View style={styles.fields}>
          <FocusField focused={focusedField === 'name'} invalid={attempted && !nameValid} style={styles.fieldGap}>
            <TextInput
              style={[styles.input, webNoOutline, attempted && !nameValid && styles.inputInvalid]}
              value={goalName}
              onChangeText={setGoalName}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField((f) => (f === 'name' ? null : f))}
              placeholder="What are you saving for?"
              placeholderTextColor={colors.textLight}
              accessibilityLabel="Goal name"
              autoFocus
            />
          </FocusField>
          <FocusField focused={focusedField === 'amount'} invalid={attempted && !amountValid}>
            <View style={[styles.amountRow, attempted && !amountValid && styles.inputInvalid]}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                style={[styles.amountInput, webNoOutline]}
                value={goalAmount}
                onChangeText={setGoalAmount}
                onFocus={() => setFocusedField('amount')}
                onBlur={() => setFocusedField((f) => (f === 'amount' ? null : f))}
                placeholder="0.00"
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
                accessibilityLabel="Goal amount"
                onSubmitEditing={handleSave}
              />
            </View>
          </FocusField>
        </View>
        <GoalRing
          percent={percent}
          size={PREVIEW_RING}
          strokeWidth={11}
          color={colors.primary}
          gradient={ringGradient}
          trackColor={colors.surfaceAlt}
          showMilestones
          bouncy
        >
          <Text style={[styles.ringPercent, complete && styles.ringPercentComplete]}>{percent}%</Text>
        </GoalRing>
      </Animated.View>
      <Text style={styles.caption} accessibilityLiveRegion="polite">{previewCaption(balance, target)}</Text>
      <View style={styles.buttons}>
        {existingGoal && (
          <Button title="Remove" variant="destructive" size="sm" onPress={onRemove} style={styles.remove} />
        )}
        <Button title="Cancel" variant="secondary" size="sm" onPress={onCancel} />
        <Button title="Save" size="sm" onPress={handleSave} />
      </View>
    </Card>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...Type.headline,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    input: {
      ...Type.body,
      height: 44,
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.md,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.md,
      paddingHorizontal: 14,
      marginBottom: Spacing.lg,
    },
    dollar: {
      ...Type.title,
      fontSize: 20,
      color: colors.textLight,
      marginRight: Spacing.xs,
    },
    amountInput: {
      ...Type.title,
      fontSize: 20,
      fontVariant: ['tabular-nums'],
      flex: 1,
      height: '100%',
      color: colors.text,
    },
    buttons: {
      flexDirection: 'row',
      gap: Spacing.sm,
      justifyContent: 'flex-end',
    },
    remove: {
      marginRight: 'auto',
    },
  });

const createKidStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...KidType.headline,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    fields: {
      flex: 1,
    },
    fieldGap: {
      marginBottom: Spacing.sm,
    },
    input: {
      ...Type.body,
      height: 46,
      backgroundColor: colors.surfaceAlt,
      borderRadius: KidRadius.bubble,
      borderWidth: 2,
      borderColor: 'transparent',
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
    },
    inputInvalid: {
      borderColor: colors.danger,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 54,
      backgroundColor: colors.surfaceAlt,
      borderRadius: KidRadius.bubble,
      borderWidth: 2,
      borderColor: 'transparent',
      paddingHorizontal: 14,
    },
    dollar: {
      ...KidType.title,
      fontSize: 22,
      color: colors.textLight,
      marginRight: Spacing.xs,
    },
    amountInput: {
      ...KidType.title,
      fontSize: 22,
      fontVariant: ['tabular-nums'],
      flex: 1,
      minWidth: 0,
      height: '100%',
      color: colors.text,
    },
    ringPercent: {
      ...KidType.amount,
      fontSize: 18,
      color: colors.text,
    },
    ringPercentComplete: {
      color: colors.success,
    },
    caption: {
      ...KidType.button,
      fontSize: 15,
      color: colors.primary,
      marginTop: Spacing.md,
      marginBottom: Spacing.lg,
    },
    buttons: {
      flexDirection: 'row',
      gap: Spacing.sm,
      justifyContent: 'flex-end',
    },
    remove: {
      marginRight: 'auto',
    },
  });
