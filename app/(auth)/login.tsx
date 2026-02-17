import React, { useState, useMemo, useRef } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';

type LoginMode = 'parent' | 'kid';

export default function LoginScreen() {
  const [mode, setMode] = useState<LoginMode>('parent');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const { loginAdmin, loginKid } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isValid =
    mode === 'parent'
      ? email.trim().length > 0 && password.length > 0
      : name.trim().length > 0 && password.length > 0;

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
        if (result.role === 'admin') {
          router.replace('/(admin)');
        } else {
          router.replace('/(kid)');
        }
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

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    setError('');
    setEmail('');
    setName('');
    setPassword('');
  };

  return (
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
        <View style={styles.header}>
          <Text style={styles.lockEmoji}>🔐</Text>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>
            {mode === 'parent'
              ? 'Sign in with your email and password'
              : 'Sign in with your name and password'}
          </Text>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'parent' && styles.toggleActive]}
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
            style={[styles.toggleButton, mode === 'kid' && styles.toggleActive]}
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

        <View style={styles.form}>
          {mode === 'parent' ? (
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
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
                autoFocus
              />
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
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
                autoFocus
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
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
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, (!isValid || loggingIn) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={!isValid || loggingIn}
          activeOpacity={0.85}
        >
          {loggingIn ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {mode === 'parent' && (
          <TouchableOpacity
            style={styles.createAccountLink}
            onPress={() => router.push('/(auth)/setup')}
            activeOpacity={0.7}
          >
            <Text style={styles.createAccountText}>
              Don't have an account? <Text style={styles.createAccountBold}>Create one</Text>
            </Text>
          </TouchableOpacity>
        )}
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
    scrollContent: {
      flexGrow: 1,
      padding: 24,
      paddingTop: 100,
    },
    header: {
      alignItems: 'center',
      marginBottom: 28,
    },
    lockEmoji: {
      fontSize: 56,
      marginBottom: 20,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 4,
      marginBottom: 28,
    },
    toggleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
    },
    toggleActive: {
      backgroundColor: colors.primary,
    },
    toggleText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    toggleTextActive: {
      color: colors.textWhite,
    },
    form: {
      gap: 20,
    },
    field: {
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
      paddingHorizontal: 16,
      paddingVertical: 16,
      fontSize: 17,
      color: colors.text,
    },
    eyeButton: {
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    errorContainer: {
      backgroundColor: colors.dangerLight,
      borderRadius: 12,
      padding: 14,
    },
    errorText: {
      fontSize: 14,
      color: colors.danger,
      textAlign: 'center',
      fontWeight: '500',
    },
    footer: {
      padding: 24,
      paddingBottom: 40,
      backgroundColor: colors.background,
    },
    button: {
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
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textWhite,
    },
    createAccountLink: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    createAccountText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    createAccountBold: {
      fontWeight: '700',
      color: colors.primary,
    },
  });
