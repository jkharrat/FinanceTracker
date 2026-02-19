import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolate,
  Extrapolation,
  FadeIn,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '💰',
    title: 'Welcome to\nFinance Tracker',
    description: 'The simple way to manage allowances and teach kids about money.',
    gradientStart: '#6C63FF',
    gradientEnd: '#4A42DB',
  },
  {
    emoji: '📅',
    title: 'Automatic\nAllowances',
    description: 'Set up weekly or monthly allowances that are automatically credited on schedule.',
    gradientStart: '#34D399',
    gradientEnd: '#059669',
  },
  {
    emoji: '📊',
    title: 'Track Every\nTransaction',
    description: 'Categorize every deposit and withdrawal. Search, filter, and view spending insights with charts.',
    gradientStart: '#F59E0B',
    gradientEnd: '#D97706',
  },
  {
    emoji: '👨‍👩‍👧‍👦',
    title: 'Kid Accounts',
    description: 'Each child gets their own login to view their balance and transaction history -- read-only and safe.',
    gradientStart: '#EC4899',
    gradientEnd: '#BE185D',
  },
  {
    emoji: '🚀',
    title: 'Ready to\nGet Started?',
    description: "You'll create your parent account next — it only takes a minute. Then add your kids and start tracking!",
    gradientStart: '#6C63FF',
    gradientEnd: '#4A42DB',
  },
];

const ONBOARDING_STORAGE_KEY = '@onboarding_seen';

function AnimatedSlide({
  item,
  index,
  scrollX,
  colors,
}: {
  item: (typeof SLIDES)[number];
  index: number;
  scrollX: SharedValue<number>;
  colors: ThemeColors;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const emojiStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [40, 0, 40],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }, { translateY }], opacity };
  });

  const titleStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [30, 0, 30],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }], opacity };
  });

  const descStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [20, 0, 20],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }], opacity };
  });

  return (
    <View style={styles.slide}>
      <View style={styles.slideContent}>
        <Animated.Text style={[styles.slideEmoji, emojiStyle]}>
          {item.emoji}
        </Animated.Text>
        <Animated.Text style={[styles.slideTitle, titleStyle]}>
          {item.title}
        </Animated.Text>
        <Animated.Text style={[styles.slideDescription, descStyle]}>
          {item.description}
        </Animated.Text>
      </View>
    </View>
  );
}

function AnimatedDot({
  index,
  scrollX,
  colors,
}: {
  index: number;
  scrollX: SharedValue<number>;
  colors: ThemeColors;
}) {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const dotStyle = useAnimatedStyle(() => {
    const width = interpolate(
      scrollX.value,
      inputRange,
      [8, 28, 8],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    );
    return { width, opacity };
  });

  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.textWhite,
        },
        dotStyle,
      ]}
    />
  );
}

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<Animated.FlatList<(typeof SLIDES)[number]>>(null);
  const scrollX = useSharedValue(0);
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;
  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{ index: number | null }>;
    }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollX.value = event.nativeEvent.contentOffset.x;
    },
    [scrollX],
  );

  const goToNext = () => {
    if (isLastSlide) {
      handleFinish();
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {}
    router.replace('/(auth)/setup');
  };

  const currentGradientStart = useMemo(() => SLIDES[currentIndex].gradientStart, [currentIndex]);
  const currentGradientEnd = useMemo(() => SLIDES[currentIndex].gradientEnd, [currentIndex]);

  const renderSlide = useCallback(
    ({ item, index }: { item: (typeof SLIDES)[number]; index: number }) => (
      <AnimatedSlide
        item={item}
        index={index}
        scrollX={scrollX}
        colors={colors}
      />
    ),
    [scrollX, colors],
  );

  const buttonAnim = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonAnim.value }],
  }));

  const handleButtonPress = () => {
    buttonAnim.value = withSequence(
      withSpring(0.93, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    goToNext();
  };

  return (
    <LinearGradient
      colors={[currentGradientStart, currentGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />

      <Animated.View
        entering={FadeIn.duration(400)}
        style={styles.skipContainer}
      >
        {!isLastSlide ? (
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </Animated.View>

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      <Animated.View
        entering={FadeIn.delay(200).duration(400)}
        style={styles.footer}
      >
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <AnimatedDot
              key={index}
              index={index}
              scrollX={scrollX}
              colors={colors}
            />
          ))}
        </View>

        <Animated.View style={buttonAnimStyle}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleButtonPress}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {isLastSlide ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    decorCircle1: {
      position: 'absolute',
      top: -60,
      right: -40,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    decorCircle2: {
      position: 'absolute',
      top: '40%',
      left: -70,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    decorCircle3: {
      position: 'absolute',
      bottom: 100,
      right: 30,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    skipContainer: {
      position: 'absolute',
      top: 60,
      right: 24,
      zIndex: 10,
    },
    skipButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    skipText: {
      fontSize: 15,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textWhite,
    },
    slide: {
      width: SCREEN_WIDTH,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    slideContent: {
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    slideEmoji: {
      fontSize: 80,
      marginBottom: Spacing.xxxl,
    },
    slideTitle: {
      fontSize: 32,
      fontFamily: FontFamily.extraBold,
      fontWeight: '800',
      color: colors.textWhite,
      textAlign: 'center',
      marginBottom: Spacing.lg,
      lineHeight: 40,
    },
    slideDescription: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
      lineHeight: 24,
    },
    footer: {
      paddingHorizontal: Spacing.xxl,
      paddingBottom: 48,
      gap: Spacing.xxl,
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    button: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    buttonText: {
      fontSize: 17,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.textWhite,
    },
  });
