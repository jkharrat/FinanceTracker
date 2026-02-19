import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';
import PageTransition from '../../src/components/PageTransition';
import AnimatedPressable from '../../src/components/AnimatedPressable';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';

type FocusedField = 'password' | 'confirm' | null;
type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 6) return 'weak';
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return 'fair';
  if (score <= 2) return 'good';
  return 'strong';
}

const strengthConfig: Record<PasswordStrength, { label: string; colorKey: string; bars: number }> = {
  weak: { label: 'Weak', colorKey: 'danger', bars: 1 },
  fair: { label: 'Fair', colorKey: 'warning', bars: 2 },
  good: { label: 'Good', colorKey: 'primary', bars: 3 },
  strong: { label: 'Strong', colorKey: 'success', bars: 4 },
};

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const scrollRef = useRef<ScrollView>(null);
  const confirmRef = useRef<TextInput>(null);

  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const { updatePassword, clearPasswordRecovery } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      exitOpacity.setValue(1);
      exitScale.setValue(1);
    }, [exitOpacity, exitScale]),
  );

  const strength = password.length > 0 ? getPasswordStrength(password) : null;
  const isValid =
    password.length >= 6 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const animateOut = useCallback(
    (onComplete: () => void) => {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(exitScale, {
          toValue: 1.04,
          useNativeDriver: true,
          tension: 80,
          friction: 14,
        }),
      ]).start(() => onComplete());
    },
    [exitOpacity, exitScale],
  );

  const handleUpdatePassword = async () => {
    if (!isValid || updating) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setUpdating(true);
    Keyboard.dismiss();

    try {
      const result = await updatePassword(password);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to update password');
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 150);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } finally {
      setUpdating(false);
    }
  };

  const handleGoToLogin = () => {
    clearPasswordRecovery();
    animateOut(() => router.replace('/(auth)/login'));
  };

  return (
    <PageTransition variant="fade">
      <Animated.View style={{ flex: 1, opacity: exitOpacity, transform: [{ scale: exitScale }] }}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            ref={scrollRef}
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
                <Ionicons
                  name={success ? 'checkmark-circle-outline' : 'lock-open-outline'}
                  size={32}
                  color={colors.textWhite}
                />
              </View>
              <Text style={styles.title}>
                {success ? 'Password Updated' : 'New Password'}
              </Text>
              <Text style={styles.subtitle}>
                {success
                  ? 'Your password has been successfully changed'
                  : 'Choose a strong password for your account'}
              </Text>
            </LinearGradient>

            <View style={styles.card}>
              {success ? (
                <View style={styles.successContainer}>
                  <View style={styles.successIconBadge}>
                    <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                  </View>
                  <Text style={styles.successTitle}>All Set!</Text>
                  <Text style={styles.successMessage}>
                    Your password has been updated. You can now sign in with your new password.
                  </Text>
                </View>
              ) : (
                <View style={styles.form}>
                  <View style={styles.field}>
                    <Text style={styles.label}>New Password</Text>
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
                        style={[styles.textInput, { flex: 1 }]}
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          setError('');
                        }}
                        placeholder="At least 6 characters"
                        placeholderTextColor={colors.textLight}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        onSubmitEditing={() => confirmRef.current?.focus()}
                        returnKeyType="next"
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        autoFocus
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
                    {strength && (
                      <View style={styles.strengthContainer}>
                        <View style={styles.strengthBars}>
                          {[1, 2, 3, 4].map((bar) => (
                            <View
                              key={bar}
                              style={[
                                styles.strengthBar,
                                {
                                  backgroundColor:
                                    bar <= strengthConfig[strength].bars
                                      ? (colors as any)[strengthConfig[strength].colorKey]
                                      : colors.borderLight,
                                },
                              ]}
                            />
                          ))}
                        </View>
                        <Text
                          style={[
                            styles.strengthLabel,
                            { color: (colors as any)[strengthConfig[strength].colorKey] },
                          ]}
                        >
                          {strengthConfig[strength].label}
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
                        ref={confirmRef}
                        style={[styles.textInput, { flex: 1 }]}
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          setError('');
                        }}
                        placeholder="Re-enter your password"
                        placeholderTextColor={colors.textLight}
                        secureTextEntry={!showConfirm}
                        autoCapitalize="none"
                        onSubmitEditing={handleUpdatePassword}
                        returnKeyType="go"
                        onFocus={() => setFocusedField('confirm')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirm(!showConfirm)}
                        style={styles.eyeButton}
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                          size={22}
                          color={colors.textLight}
                        />
                      </TouchableOpacity>
                    </View>
                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <Text style={styles.mismatchText}>Passwords do not match</Text>
                    )}
                  </View>

                  {error.length > 0 && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {success ? (
              <AnimatedPressable
                variant="button"
                style={styles.button}
                onPress={handleGoToLogin}
              >
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.textWhite} />
                </View>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable
                variant="button"
                style={[styles.button, (!isValid || updating) && styles.buttonDisabled]}
                onPress={handleUpdatePassword}
                disabled={!isValid || updating}
              >
                {updating ? (
                  <ActivityIndicator color={colors.textWhite} />
                ) : (
                  <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>Update Password</Text>
                    <Ionicons name="checkmark-circle-outline" size={20} color={colors.textWhite} />
                  </View>
                )}
              </AnimatedPressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
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
      paddingTop: 80,
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
      top: 60,
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
    title: {
      fontSize: 30,
      fontFamily: FontFamily.extraBold,
      fontWeight: '800',
      color: colors.textWhite,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    subtitle: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      lineHeight: 22,
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
    eyeButton: {
      paddingHorizontal: 14,
      paddingVertical: 14,
    },

    strengthContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    strengthBars: {
      flexDirection: 'row',
      gap: 4,
      flex: 1,
    },
    strengthBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    strengthLabel: {
      fontSize: 12,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
    },

    mismatchText: {
      fontSize: 13,
      color: colors.danger,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
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

    successContainer: {
      alignItems: 'center',
      paddingVertical: Spacing.xxl,
    },
    successIconBadge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.successLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xxl,
    },
    successTitle: {
      fontSize: 22,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.text,
      marginBottom: Spacing.md,
    },
    successMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
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
  });
