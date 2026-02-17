import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useData } from '../../src/context/DataContext';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { Avatars } from '../../src/constants/colors';
import { ThemeColors } from '../../src/constants/colors';
import { AllowanceFrequency, SavingsGoal } from '../../src/types';

const frequencies: { value: AllowanceFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function EditKidScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getKid, updateKid, isNameUnique } = useData();
  const { updateKidPassword } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const kid = getKid(id!);

  const [name, setName] = useState(kid?.name ?? '');
  const [selectedAvatar, setSelectedAvatar] = useState(kid?.avatar ?? Avatars[0]);
  const [allowanceAmount, setAllowanceAmount] = useState(kid?.allowanceAmount.toString() ?? '');
  const [frequency, setFrequency] = useState<AllowanceFrequency>(kid?.allowanceFrequency ?? 'monthly');
  const [newPassword, setNewPassword] = useState('');
  const [goalName, setGoalName] = useState(kid?.savingsGoal?.name ?? '');
  const [goalAmount, setGoalAmount] = useState(kid?.savingsGoal?.targetAmount?.toString() ?? '');
  const [nameError, setNameError] = useState('');

  const isValid =
    name.trim().length > 0 &&
    parseFloat(allowanceAmount) > 0 &&
    nameError === '' &&
    (newPassword.length === 0 || newPassword.length >= 6);

  const handleNameChange = (text: string) => {
    setName(text);
    if (text.trim().length > 0 && !isNameUnique(text.trim(), id)) {
      setNameError('This name is already taken');
    } else {
      setNameError('');
    }
  };

  const handleSave = async () => {
    if (!isValid || !id) return;
    if (!isNameUnique(name.trim(), id)) {
      setNameError('This name is already taken');
      return;
    }

    const parsedGoalAmount = parseFloat(goalAmount);
    let savingsGoal: SavingsGoal | null | undefined;
    if (goalName.trim() && parsedGoalAmount > 0) {
      savingsGoal = { name: goalName.trim(), targetAmount: parsedGoalAmount };
    } else if (kid?.savingsGoal) {
      savingsGoal = null;
    }

    await updateKid(id, name.trim(), selectedAvatar, parseFloat(allowanceAmount), frequency, undefined, savingsGoal);

    if (newPassword.length >= 6) {
      await updateKidPassword(id, name.trim(), newPassword);
    }

    router.back();
  };

  if (!kid) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Person not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avatar</Text>
          <View style={styles.avatarGrid}>
            {Avatars.map((avatar) => (
              <TouchableOpacity
                key={avatar}
                style={[
                  styles.avatarOption,
                  selectedAvatar === avatar && styles.avatarSelected,
                ]}
                onPress={() => setSelectedAvatar(avatar)}
              >
                <Text style={styles.avatarEmoji}>{avatar}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Name (used as login username)</Text>
          <TextInput
            style={[styles.textInput, nameError ? styles.textInputError : null]}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Enter name"
            autoCapitalize="words"
            placeholderTextColor={colors.textLight}
          />
          {nameError.length > 0 && (
            <Text style={styles.fieldError}>{nameError}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <TextInput
            style={styles.textInput}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Leave blank to keep current"
            placeholderTextColor={colors.textLight}
            secureTextEntry
          />
          {newPassword.length > 0 && newPassword.length < 6 && (
            <Text style={styles.fieldHint}>Password must be at least 6 characters</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allowance Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={allowanceAmount}
              onChangeText={setAllowanceAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textLight}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Savings Goal (Optional)</Text>
          <TextInput
            style={[styles.textInput, { marginBottom: 12 }]}
            value={goalName}
            onChangeText={setGoalName}
            placeholder='e.g. "New bike"'
            placeholderTextColor={colors.textLight}
          />
          <View style={styles.amountInputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={goalAmount}
              onChangeText={setGoalAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textLight}
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={styles.fieldHint}>Clear both fields to remove the savings goal</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequency</Text>
          <View style={styles.frequencyRow}>
            {frequencies.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[
                  styles.frequencyOption,
                  frequency === f.value && styles.frequencySelected,
                ]}
                onPress={() => setFrequency(f.value)}
              >
                <Text
                  style={[
                    styles.frequencyText,
                    frequency === f.value && styles.frequencyTextSelected,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isValid}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 32,
    },
    errorText: {
      fontSize: 16,
      color: colors.danger,
      textAlign: 'center',
      marginTop: 40,
    },
    section: {
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    avatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    avatarOption: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    avatarSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.shadow,
    },
    avatarEmoji: {
      fontSize: 24,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 16,
      fontSize: 17,
      color: colors.text,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    textInputError: {
      borderWidth: 1,
      borderColor: colors.danger,
    },
    fieldError: {
      fontSize: 13,
      color: colors.danger,
      marginTop: 6,
    },
    fieldHint: {
      fontSize: 13,
      color: colors.textLight,
      marginTop: 6,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 16,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    dollarSign: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.textSecondary,
      marginRight: 4,
    },
    amountInput: {
      flex: 1,
      fontSize: 22,
      fontWeight: '600',
      color: colors.text,
      paddingVertical: 14,
    },
    frequencyRow: {
      flexDirection: 'row',
      gap: 10,
    },
    frequencyOption: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.surface,
      alignItems: 'center',
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    frequencySelected: {
      backgroundColor: colors.primary,
    },
    frequencyText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    frequencyTextSelected: {
      color: colors.textWhite,
    },
    footer: {
      padding: 20,
      paddingBottom: 36,
      backgroundColor: colors.background,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textWhite,
    },
  });
