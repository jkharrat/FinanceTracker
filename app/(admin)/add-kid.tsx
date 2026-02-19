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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../src/context/DataContext';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { Avatars } from '../../src/constants/colors';
import { ThemeColors } from '../../src/constants/colors';
import { AllowanceFrequency } from '../../src/types';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';

const frequencies: { value: AllowanceFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function AddKidScreen() {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(Avatars[0]);
  const [allowanceAmount, setAllowanceAmount] = useState('');
  const [frequency, setFrequency] = useState<AllowanceFrequency>('monthly');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [initialBalance, setInitialBalance] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { addKid, isNameUnique } = useData();
  const { createKidAuth } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isValid =
    name.trim().length > 0 &&
    parseFloat(allowanceAmount) > 0 &&
    password.length >= 6 &&
    nameError === '' &&
    !saving;

  const handleNameChange = (text: string) => {
    setName(text);
    if (text.trim().length > 0 && !isNameUnique(text.trim())) {
      setNameError('This name is already taken');
    } else {
      setNameError('');
    }
  };

  const handleSave = async () => {
    if (!isValid) return;
    if (!isNameUnique(name.trim())) {
      setNameError('This name is already taken');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const parsedInitialBalance = parseFloat(initialBalance) || 0;
      const kidId = await addKid(name.trim(), selectedAvatar, parseFloat(allowanceAmount), frequency, password, parsedInitialBalance);

      if (!kidId) {
        setError('Failed to create account. Check your connection and try again.');
        setSaving(false);
        return;
      }

      // Create Supabase Auth account so the kid can log in
      const authResult = await createKidAuth(kidId, name.trim(), password);
      if (!authResult.success) {
        console.warn('Kid auth creation issue:', authResult.error);
      }

      router.back();
    } catch (e) {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

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
            autoFocus
          />
          {nameError.length > 0 && (
            <Text style={styles.fieldError}>{nameError}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Login Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textLight}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textLight}
              />
            </TouchableOpacity>
          </View>
          {password.length > 0 && password.length < 6 && (
            <Text style={styles.fieldError}>Password must be at least 6 characters</Text>
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
          <Text style={styles.sectionTitle}>Initial Balance</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={initialBalance}
              onChangeText={setInitialBalance}
              placeholder="0.00"
              placeholderTextColor={colors.textLight}
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={styles.fieldHint}>Optional starting balance for this account</Text>
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

        {error.length > 0 && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
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
            <Text style={styles.saveButtonText}>Add Person</Text>
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
    textInputError: {
      borderWidth: 1,
      borderColor: colors.danger,
    },
    fieldError: {
      fontSize: 13,
      color: colors.danger,
      marginTop: 6,
    },
    errorContainer: {
      backgroundColor: colors.dangerLight,
      borderRadius: 12,
      padding: 14,
      marginBottom: Spacing.sm,
    },
    errorText: {
      fontSize: 14,
      color: colors.danger,
      textAlign: 'center',
      fontFamily: FontFamily.medium,
      fontWeight: '500',
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
