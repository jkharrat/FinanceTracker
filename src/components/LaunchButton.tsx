import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { Button } from './ui';
import type { ButtonSize, ButtonVariant } from './ui/Button';
import CoinBurst from './CoinBurst';
import { Durations, Springs } from '../constants/motion';
import { hapticLight } from '../utils/haptics';

/** How long the launch owns the button before it can fire again. */
const COOLDOWN_MS = 700;

interface LaunchButtonProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Fires after the launch animation has had time to play. */
  onLaunch: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * A button that plays a short "takeoff" (squash and pop, icon flies off, coins puff out)
 * before running its action. Navigation is delayed so the launch is visible.
 */
export default function LaunchButton({
  title,
  icon,
  onLaunch,
  variant = 'primary',
  size = 'md',
  style,
  accessibilityLabel,
}: LaunchButtonProps) {
  const reducedMotion = useReducedMotion();
  const squash = useSharedValue(1);
  const flight = useSharedValue(0);
  const [burstKey, setBurstKey] = useState<number | null>(null);
  const launching = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const handlePress = useCallback(() => {
    if (launching.current) return;
    launching.current = true;
    hapticLight();

    if (!reducedMotion) {
      squash.value = withSequence(
        withTiming(0.88, { duration: 70 }),
        withTiming(1.06, { duration: 90 }),
        withSpring(1, Springs.bouncy),
      );
      flight.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
      setBurstKey(Date.now());
    }

    timers.current.push(
      setTimeout(onLaunch, reducedMotion ? 0 : Durations.launch),
      setTimeout(() => {
        launching.current = false;
        flight.value = 0;
        setBurstKey(null);
      }, COOLDOWN_MS),
    );
  }, [reducedMotion, squash, flight, onLaunch]);

  const clearBurst = useCallback(() => setBurstKey(null), []);

  const squashStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 2 - squash.value }, { scaleY: squash.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: 1 - flight.value,
    transform: [{ translateY: -28 * flight.value }, { translateX: 6 * flight.value }],
  }));

  return (
    <Animated.View style={[style, squashStyle]}>
      <Button
        title={title}
        variant={variant}
        size={size}
        onPress={handlePress}
        accessibilityLabel={accessibilityLabel}
        renderIcon={(color, iconSize) => (
          <Animated.View style={iconStyle}>
            <Ionicons name={icon} size={iconSize} color={color} />
          </Animated.View>
        )}
      />
      {burstKey !== null && (
        <View style={styles.burst} pointerEvents="none">
          <CoinBurst key={burstKey} count={5} onComplete={clearBurst} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  burst: {
    ...StyleSheet.absoluteFillObject,
  },
});
