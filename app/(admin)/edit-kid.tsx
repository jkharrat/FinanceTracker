import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../src/context/DataContext';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { useToast } from '../../src/context/ToastContext';
import { Avatars } from '../../src/constants/colors';
import { ThemeColors } from '../../src/constants/colors';
import { AllowanceFrequency, SavingsGoal } from '../../src/types';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';

type PasswordStrength = { level: number; label: string; color: string; width: string };

function getPasswordStrength(pw: string, colors: ThemeColors): PasswordStrength {
  if (pw.length === 0) return { level: 0, label: '', color: 'transparent', width: '0%' };
  if (pw.length < 6) return { level: 1, label: 'Weak', color: colors.danger, width: '25%' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 2, label: 'Fair', color: colors.warning, width: '50%' };
  if (score <= 2) return { level: 3, label: 'Good', color: colors.success, width: '75%' };
  return { level: 4, label: 'Strong', color: colors.successDark, width: '100%' };
}

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
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const kid = id ? getKid(id) : undefined;

  const [name, setName] = useState(kid?.name ?? '');
  const [selectedAvatar, setSelectedAvatar] = useState(kid?.avatar ?? Avatars[0]);
  const [allowanceAmount, setAllowanceAmount] = useState(kid?.allowanceAmount.toString() ?? '');
  const [frequency, setFrequency] = useState<AllowanceFrequency>(kid?.allowanceFrequency ?? 'monthly');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [goalName, setGoalName] = useState(kid?.savingsGoal?.name ?? '');
  const [goalAmount, setGoalAmount] = useState(kid?.savingsGoal?.targetAmount?.toString() ?? '');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  const strength = useMemo(() => getPasswordStrength(newPassword, colors), [newPassword, colors]);

  const isValid =
    name.trim().length > 0 &&
    parseFloat(allowanceAmount) > 0 &&
    nameError === '' &&
    (newPassword.length === 0 || newPassword.length >= 6) &&
    !saving;

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

    setSaving(true);

    try {
      const parsedGoalAmount = parseFloat(goalAmount);
      let savingsGoal: SavingsGoal | null | undefined;
      if (goalName.trim() && parsedGoalAmount > 0) {
        savingsGoal = { name: goalName.trim(), targetAmount: parsedGoalAmount };
      } else if (kid?.savingsGoal) {
        savingsGoal = null;
      }

      await updateKid(id, name.trim(), selectedAvatar, parseFloat(allowanceAmount), frequency, undefined, savingsGoal);

      if (newPassword.length >= 6) {
        const pwResult = await updateKidPassword(id, name.trim(), newPassword);
        if (!pwResult.success) {
          showToast('error', pwResult.error ?? 'Failed to update password');
          setSaving(false);
          return;
        }
      }

      showToast('success', `${name.trim()} has been updated`);
      router.back();
    } catch {
      showToast('error', 'Something went wrong. Please try again.');
      setSaving(false);
    }
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
        keyboardShouldPersistTaps="handled"
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
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Leave blank to keep current"
              placeholderTextColor={colors.textLight}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            {newPassword.length > 0 && (
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textLight}
                />
              </Pressable>
            )}
          </View>
          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthTrack}>
                <View style={[styles.strengthFill, { width: strength.width as any, backgroundColor: strength.color }]} />
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
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
            style={[styles.textInput, { marginBottom: Spacing.md }]}
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
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
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
      padding: Spacing.xl,
      paddingBottom: Spacing.xxxl,
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
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: Spacing.md,
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
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      fontSize: 17,
      color: colors.text,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      fontSize: 17,
      color: colors.text,
    },
    eyeButton: {
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    strengthContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: 6,
    },
    strengthTrack: {
      flex: 1,
      height: 4,
      backgroundColor: colors.borderLight,
      borderRadius: 2,
      overflow: 'hidden',
    },
    strengthFill: {
      height: '100%',
      borderRadius: 2,
    },
    strengthLabel: {
      fontSize: 12,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      minWidth: 44,
      textAlign: 'right',
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
      paddingHorizontal: Spacing.lg,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    dollarSign: {
      fontSize: 22,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
      marginRight: Spacing.xs,
    },
    amountInput: {
      flex: 1,
      fontSize: 22,
      fontFamily: FontFamily.semiBold,
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
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    frequencyTextSelected: {
      color: colors.textWhite,
    },
    footer: {
      padding: Spacing.xl,
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
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.textWhite,
    },
  });
