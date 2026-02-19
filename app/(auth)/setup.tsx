import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';
import PageTransition from '../../src/components/PageTransition';
import AnimatedPressable from '../../src/components/AnimatedPressable';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';

type FocusedField = 'name' | 'email' | 'password' | 'confirm' | null;

type PasswordStrength = {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  width: string;
};

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

export default function SetupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);

  const { setupAdmin } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const strength = useMemo(() => getPasswordStrength(password, colors), [password, colors]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValid =
    displayName.trim().length > 0 &&
    isValidEmail &&
    password.length >= 6 &&
    password === confirmPassword &&
    !saving;

  const handleSetup = async () => {
    setError('');

    if (displayName.trim().length === 0) {
      setError('Please enter your name');
      return;
    }
    if (!isValidEmail) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const result = await setupAdmin(email.trim().toLowerCase(), password, displayName.trim());

      if (result.success) {
        router.replace('/(admin)');
      } else {
        setError(result.error ?? 'Something went wrong');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.decorCircle3} />

          <View style={styles.iconBadge}>
            <Ionicons name="person-add-outline" size={32} color={colors.textWhite} />
          </View>
          <Text style={styles.welcomeTitle}>Create Account</Text>
          <Text style={styles.welcomeSubtitle}>
            Set up your parent account to get started
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Your Name</Text>
              <View style={[
                styles.inputContainer,
                focusedField === 'name' && styles.inputContainerFocused,
              ]}>
                <View style={styles.inputIconWrap}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={focusedField === 'name' ? colors.primary : colors.textLight}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="How should we call you?"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="words"
                  autoCorrect={false}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={[
                styles.inputContainer,
                focusedField === 'email' && styles.inputContainerFocused,
              ]}>
                <View style={styles.inputIconWrap}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={focusedField === 'email' ? colors.primary : colors.textLight}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={[
                styles.inputContainer,
                focusedField === 'password' && styles.inputContainerFocused,
              ]}>
                <View style={styles.inputIconWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={focusedField === 'password' ? colors.primary : colors.textLight}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthTrack}>
                    <View
                      style={[
                        styles.strengthFill,
                        { width: strength.width as any, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[
                styles.inputContainer,
                focusedField === 'confirm' && styles.inputContainerFocused,
              ]}>
                <View style={styles.inputIconWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={focusedField === 'confirm' ? colors.primary : colors.textLight}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {error.length > 0 && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AnimatedPressable
          variant="button"
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleSetup}
          disabled={!isValid}
        >
          {saving ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <View style={styles.buttonInner}>
              <Text style={styles.buttonText}>Create Account</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.textWhite} />
            </View>
          )}
        </AnimatedPressable>

        <AnimatedPressable
          variant="button"
          style={styles.loginLink}
          onPress={() => router.back()}
        >
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginLinkBold}>Sign in</Text>
          </Text>
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
    </PageTransition>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },

    gradientHeader: {
      paddingTop: 72,
      paddingBottom: 48,
      paddingHorizontal: Spacing.xxl,
      alignItems: 'center',
      overflow: 'hidden',
    },
    decorCircle1: {
      position: 'absolute',
      top: -40,
      right: -30,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    decorCircle2: {
      position: 'absolute',
      top: 50,
      left: -50,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.07)',
    },
    decorCircle3: {
      position: 'absolute',
      bottom: -20,
      right: 60,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    iconBadge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    welcomeTitle: {
      fontSize: 28,
      fontFamily: FontFamily.extraBold,
      fontWeight: '800',
      color: colors.textWhite,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    welcomeSubtitle: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: Spacing.lg,
    },

    card: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      marginTop: -20,
      paddingTop: Spacing.xxl,
      paddingHorizontal: Spacing.xxl,
      paddingBottom: Spacing.lg,
      flex: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 8,
    },

    form: {
      gap: Spacing.xl,
    },
    field: {
      gap: Spacing.sm,
    },
    label: {
      fontSize: 13,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    inputContainerFocused: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 2,
    },
    inputIconWrap: {
      paddingLeft: Spacing.lg,
    },
    textInput: {
      flex: 1,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.lg,
      fontSize: 16,
      color: colors.text,
    },

    strengthContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: 2,
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

    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.dangerLight,
      borderRadius: 12,
      padding: 14,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      color: colors.danger,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
    },

    footer: {
      padding: Spacing.xxl,
      paddingBottom: 40,
      backgroundColor: colors.surface,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 4,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    buttonText: {
      fontSize: 17,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.textWhite,
    },
    loginLink: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    loginLinkText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    loginLinkBold: {
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.primary,
    },
  });
