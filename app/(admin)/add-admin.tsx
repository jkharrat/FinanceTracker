import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';
import { KidRadius, KidType, KID_BUTTON_LEDGE } from '../../src/constants/theme';
import AnimatedPressable from '../../src/components/AnimatedPressable';

function getPasswordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const label = score <= 1 ? 'Weak' : score <= 2 ? 'Fair' : score <= 3 ? 'Good' : 'Strong';
  return { score, label };
}

export default function AddAdminScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const focusProps = (field: string) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField(null),
  });

  const { addAdmin } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const strength = getPasswordStrength(password);
  const isValid =
    displayName.trim().length > 0 &&
    isValidEmail &&
    strength.score >= 2 &&
    password === confirmPassword &&
    !saving;

  const handleSave = async () => {
    setError('');

    if (displayName.trim().length === 0) {
      setError('Please enter a name');
      return;
    }
    if (!isValidEmail) {
      setError('Please enter a valid email address');
      return;
    }
    if (strength.score < 2) {
      setError('Please choose a stronger password');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const result = await addAdmin(email.trim().toLowerCase(), password, displayName.trim());

      if (result.success) {
        router.back();
      } else {
        setError(result.error ?? 'Failed to add parent');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
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
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoCard}>
          <Ionicons name="people" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Add another parent or admin who can manage kids and transactions. They'll sign in with their own email and password.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Name</Text>
          <TextInput
            style={[styles.textInput, focusedField === 'name' && styles.textInputFocused]}
            {...focusProps('name')}
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              setError('');
            }}
            placeholder="Parent's name"
            placeholderTextColor={colors.textLight}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          <TextInput
            style={[styles.textInput, focusedField === 'email' && styles.textInputFocused]}
            {...focusProps('email')}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            placeholder="parent@email.com"
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Password</Text>
          <TextInput
            style={[styles.textInput, focusedField === 'password' && styles.textInputFocused]}
            {...focusProps('password')}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            placeholder="Create a strong password"
            placeholderTextColor={colors.textLight}
            secureTextEntry
            autoCapitalize="none"
          />
          {password.length > 0 && (
            <View style={styles.strengthSection}>
              <View style={styles.strengthBarTrack}>
                {[1, 2, 3, 4, 5].map((i) => {
                  const filled = i <= strength.score;
                  const barColor =
                    strength.score <= 1 ? colors.danger :
                    strength.score <= 2 ? colors.warning :
                    colors.success;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.strengthBarSegment,
                        { backgroundColor: filled ? barColor : colors.surfaceAlt },
                      ]}
                    />
                  );
                })}
              </View>
              <Text
                style={[
                  styles.strengthLabel,
                  {
                    color:
                      strength.score <= 1 ? colors.danger :
                      strength.score <= 2 ? colors.warning :
                      colors.success,
                  },
                ]}
              >
                {strength.label}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirm Password</Text>
          <TextInput
            style={[styles.textInput, focusedField === 'confirm' && styles.textInputFocused]}
            {...focusProps('confirm')}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setError('');
            }}
            placeholder="Re-enter the password"
            placeholderTextColor={colors.textLight}
            secureTextEntry
            autoCapitalize="none"
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <Text style={styles.fieldError}>Passwords do not match</Text>
          )}
        </View>

        {error.length > 0 && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <AnimatedPressable
          variant="button"
          style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
          pressDepth={isValid ? KID_BUTTON_LEDGE / 2 : 0}
          onPress={handleSave}
          disabled={!isValid}
          accessibilityRole="button"
          accessibilityLabel="Add Parent"
        >
          {saving ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <>
              <Ionicons name="person-add" size={20} color={isValid ? colors.textWhite : colors.textLight} />
              <Text style={[styles.saveButtonText, !isValid && styles.saveButtonTextDisabled]}>Add Parent</Text>
            </>
          )}
        </AnimatedPressable>
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
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: colors.primarySoft,
      borderRadius: KidRadius.bubble + 4,
      padding: Spacing.lg,
      marginBottom: 28,
    },
    infoText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    section: {
      marginBottom: Spacing.xxl,
    },
    sectionTitle: {
      ...KidType.headline,
      fontSize: 17,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    textInputFocused: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 2,
    },
    strengthSection: {
      marginTop: Spacing.md,
    },
    strengthBarTrack: {
      flexDirection: 'row',
      gap: 4,
      marginBottom: Spacing.sm,
    },
    strengthBarSegment: {
      flex: 1,
      height: 5,
      borderRadius: 3,
    },
    strengthLabel: {
      fontSize: 13,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
    },
    fieldError: {
      fontSize: 13,
      color: colors.danger,
      marginTop: 6,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.dangerLight,
      borderRadius: KidRadius.bubble,
      padding: 14,
      marginBottom: Spacing.sm,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: colors.danger,
    },
    footer: {
      padding: Spacing.xl,
      paddingBottom: 36,
      backgroundColor: colors.background,
    },
    saveButton: {
      flexDirection: 'row',
      gap: Spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: KidRadius.button,
      height: 58,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: KID_BUTTON_LEDGE,
      borderBottomColor: colors.primaryDark,
    },
    saveButtonDisabled: {
      backgroundColor: colors.surfaceAlt,
      borderBottomColor: colors.border,
    },
    saveButtonText: {
      ...KidType.button,
      fontSize: 18,
      color: colors.textWhite,
    },
    saveButtonTextDisabled: {
      color: colors.textLight,
    },
  });
