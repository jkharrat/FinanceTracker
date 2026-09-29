import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { SavingsGoal } from '../types';
import { Radius, Type } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import { Card, Button } from './ui';

interface GoalEditorProps {
  existingGoal?: SavingsGoal;
  onSave: (goal: SavingsGoal) => void;
  onRemove: () => void;
  onCancel: () => void;
}

export default function GoalEditor({ existingGoal, onSave, onRemove, onCancel }: GoalEditorProps) {
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
