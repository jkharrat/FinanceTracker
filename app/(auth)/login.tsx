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
import { Redirect, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';
import PageTransition from '../../src/components/PageTransition';
import AnimatedPressable from '../../src/components/AnimatedPressable';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';

type LoginMode = 'parent' | 'kid';
type FocusedField = 'email' | 'name' | 'password' | null;

export default function LoginScreen() {
  const [mode, setMode] = useState<LoginMode>('parent');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const scrollRef = useRef<ScrollView>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const formFade = useRef(new Animated.Value(1)).current;
  const formSlide = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const { user, session, loading, loginAdmin, loginKid } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      exitOpacity.setValue(1);
      exitScale.setValue(1);
    }, [exitOpacity, exitScale]),
  );

  const isValid =
    mode === 'parent'
      ? email.trim().length > 0 && password.length > 0
      : name.trim().length > 0 && password.length > 0;

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

  const handleLogin = async () => {
    if (!isValid || loggingIn) return;
    setError('');
    setLoggingIn(true);

    try {
      const result =
        mode === 'parent'
          ? await loginAdmin(email.trim().toLowerCase(), password)
          : await loginKid(name.trim(), password);

      if (result.success) {
        const route = result.role === 'admin' ? '/(admin)' : '/(kid)';
        animateOut(() => router.replace(route));
      } else {
        Keyboard.dismiss();
        setError(result.error || 'Invalid credentials');
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 150);
      }
    } catch {
      Keyboard.dismiss();
      setError('Something went wrong. Please try again.');
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } finally {
      setLoggingIn(false);
    }
  };

  const switchMode = useCallback((newMode: LoginMode) => {
    if (newMode === mode) return;

    const toValue = newMode === 'kid' ? 1 : 0;
    const slideDirection = newMode === 'kid' ? 1 : -1;

    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: false,
      tension: 68,
      friction: 12,
    }).start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(formFade, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(formSlide, { toValue: slideDirection * -20, duration: 120, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formFade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(formSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      ]),
    ]).start();

    setTimeout(() => {
      setMode(newMode);
      setError('');
      setEmail('');
      setName('');
      setPassword('');
      setFocusedField(null);
    }, 120);
  }, [mode, slideAnim, formFade, formSlide]);

  if (!loading && session && user) {
    const route = user.role === 'admin' ? '/(admin)' : '/(kid)';
    return <Redirect href={route} />;
  }

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
            <Ionicons name="wallet-outline" size={32} color={colors.textWhite} />
          </View>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>
            {mode === 'parent'
              ? 'Sign in with your email and password'
              : 'Sign in with your name and password'}
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.toggleContainer}>
            <Animated.View
              style={[
                styles.toggleIndicator,
                {
                  left: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['1%', '51%'],
                  }),
                },
              ]}
            />
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => switchMode('parent')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={mode === 'parent' ? colors.textWhite : colors.textSecondary}
              />
              <Text style={[styles.toggleText, mode === 'parent' && styles.toggleTextActive]}>
                Parent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => switchMode('kid')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={mode === 'kid' ? colors.textWhite : colors.textSecondary}
              />
              <Text style={[styles.toggleText, mode === 'kid' && styles.toggleTextActive]}>
                Kid
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.form, { opacity: formFade, transform: [{ translateX: formSlide }] }]}>
            {mode === 'parent' ? (
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
                    autoFocus
                  />
                </View>
              </View>
            ) : (
              <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
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
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      setError('');
                    }}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textLight}
                    autoCapitalize="words"
                    autoCorrect={false}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    autoFocus
                  />
                </View>
              </View>
            )}

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
                  style={[styles.textInput, { flex: 1 }]}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showPassword}
                  onSubmitEditing={handleLogin}
                  returnKeyType="go"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
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
            </View>

            {error.length > 0 && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AnimatedPressable
          variant="button"
          style={[styles.button, (!isValid || loggingIn) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={!isValid || loggingIn}
        >
          {loggingIn ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <View style={styles.buttonInner}>
              <Text style={styles.buttonText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.textWhite} />
            </View>
          )}
        </AnimatedPressable>

        {mode === 'parent' && (
          <AnimatedPressable
            variant="button"
            style={styles.createAccountLink}
            onPress={() => animateOut(() => router.push('/(auth)/onboarding'))}
          >
            <Text style={styles.createAccountText}>
              Don't have an account? <Text style={styles.createAccountBold}>Create one</Text>
            </Text>
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

    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: Spacing.xs,
      marginBottom: Spacing.xxl,
      position: 'relative',
    },
    toggleIndicator: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      width: '48%',
      backgroundColor: colors.primary,
      borderRadius: 10,
    },
    toggleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.md,
      borderRadius: 10,
      zIndex: 1,
    },
    toggleText: {
      fontSize: 15,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    toggleTextActive: {
      color: colors.textWhite,
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
    createAccountLink: {
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    createAccountText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    createAccountBold: {
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.primary,
    },
  });
