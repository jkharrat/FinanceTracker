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

type FocusedField = 'email' | null;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const scrollRef = useRef<ScrollView>(null);

  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const { resetPassword } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      exitOpacity.setValue(1);
      exitScale.setValue(1);
    }, [exitOpacity, exitScale]),
  );

  const isValid = email.trim().length > 0 && email.includes('@');

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

  const handleSendReset = async () => {
    if (!isValid || sending) return;
    setError('');
    setSending(true);
    Keyboard.dismiss();

    try {
      const result = await resetPassword(email.trim().toLowerCase());
      if (result.success) {
        setSent(true);
      } else {
        setError(result.error || 'Failed to send reset email');
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
      setSending(false);
    }
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

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => animateOut(() => router.back())}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
              </TouchableOpacity>

              <View style={styles.iconBadge}>
                <Ionicons name="key-outline" size={32} color={colors.textWhite} />
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a link to reset your password
              </Text>
            </LinearGradient>

            <View style={styles.card}>
              {sent ? (
                <View style={styles.sentContainer}>
                  <View style={styles.sentIconBadge}>
                    <Ionicons name="mail-outline" size={40} color={colors.success} />
                  </View>
                  <Text style={styles.sentTitle}>Check Your Email</Text>
                  <Text style={styles.sentMessage}>
                    We've sent a password reset link to{'\n'}
                    <Text style={styles.sentEmail}>{email.trim().toLowerCase()}</Text>
                  </Text>
                  <Text style={styles.sentHint}>
                    Click the link in the email to set a new password. If you don't see it, check your spam folder.
                  </Text>
                </View>
              ) : (
                <View style={styles.form}>
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
                        onChangeText={(text) => {
                          setEmail(text);
                          setError('');
                        }}
                        placeholder="your@email.com"
                        placeholderTextColor={colors.textLight}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        onSubmitEditing={handleSendReset}
                        returnKeyType="send"
                        autoFocus
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
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {sent ? (
              <AnimatedPressable
                variant="button"
                style={styles.button}
                onPress={() => animateOut(() => router.replace('/(auth)/login'))}
              >
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Back to Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.textWhite} />
                </View>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable
                variant="button"
                style={[styles.button, (!isValid || sending) && styles.buttonDisabled]}
                onPress={handleSendReset}
                disabled={!isValid || sending}
              >
                {sending ? (
                  <ActivityIndicator color={colors.textWhite} />
                ) : (
                  <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                    <Ionicons name="send-outline" size={20} color={colors.textWhite} />
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
    backButton: {
      position: 'absolute',
      top: 50,
      left: Spacing.lg,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
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

    sentContainer: {
      alignItems: 'center',
      paddingVertical: Spacing.xxl,
    },
    sentIconBadge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.successLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xxl,
    },
    sentTitle: {
      fontSize: 22,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.text,
      marginBottom: Spacing.md,
    },
    sentMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: Spacing.lg,
    },
    sentEmail: {
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.text,
    },
    sentHint: {
      fontSize: 13,
      color: colors.textLight,
      textAlign: 'center',
      lineHeight: 20,
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
