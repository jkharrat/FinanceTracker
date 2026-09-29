import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useColors, useIsKid } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Type, KidType } from '../constants/theme';
import { Spacing } from '../constants/spacing';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const colors = useColors();
  const isKid = useIsKid();
  const styles = useMemo(() => createStyles(colors, isKid), [colors, isKid]);
  const reducedMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (!isKid || reducedMotion) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [isKid, reducedMotion, bob]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -8 * bob.value }, { rotate: `${(bob.value - 0.5) * 8}deg` }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 - bob.value * 0.12,
    transform: [{ scaleX: 1 - bob.value * 0.2 }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Animated.Text style={[styles.icon, bobStyle]}>{icon}</Animated.Text>
      </View>
      {isKid && <Animated.View style={[styles.shadow, shadowStyle]} />}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isKid: boolean) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 56,
      paddingHorizontal: 40,
    },
    iconWrap: {
      width: isKid ? 104 : 72,
      height: isKid ? 104 : 72,
      borderRadius: isKid ? 52 : 36,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: isKid ? Spacing.sm : Spacing.lg,
    },
    icon: {
      fontSize: isKid ? 50 : 32,
    },
    shadow: {
      width: 56,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.text,
      marginBottom: Spacing.lg,
    },
    title: {
      ...(isKid ? KidType.headline : Type.headline),
      color: colors.text,
      marginBottom: Spacing.xs,
      textAlign: 'center',
    },
    subtitle: {
      ...Type.body,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 300,
    },
  });
