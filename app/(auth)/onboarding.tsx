import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';
import PageTransition from '../../src/components/PageTransition';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '💰',
    title: 'Welcome to\nFinance Tracker',
    description: 'The simple way to manage allowances and teach kids about money.',
  },
  {
    emoji: '📅',
    title: 'Automatic\nAllowances',
    description: 'Set up weekly or monthly allowances that are automatically credited on schedule.',
  },
  {
    emoji: '📊',
    title: 'Track Every\nTransaction',
    description: 'Categorize every deposit and withdrawal. Search, filter, and view spending insights with charts.',
  },
  {
    emoji: '👨‍👩‍👧‍👦',
    title: 'Kid Accounts',
    description: 'Each child gets their own login to view their balance and transaction history -- read-only and safe.',
  },
  {
    emoji: '🚀',
    title: 'Ready to\nGet Started?',
    description: 'Create your parent account and start managing finances today.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

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

  const handleFinish = () => {
    router.replace('/(auth)/setup');
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[number] }) => (
    <View style={styles.slide}>
      <View style={styles.slideContent}>
        <Text style={styles.slideEmoji}>{item.emoji}</Text>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <PageTransition>
    <View style={styles.container}>
      <View style={styles.skipContainer}>
        {!isLastSlide ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      <FlatList
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
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={goToNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
    </PageTransition>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    skipContainer: {
      position: 'absolute',
      top: 60,
      right: 24,
      zIndex: 10,
    },
    skipButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
    },
    skipText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
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
      marginBottom: 32,
    },
    slideTitle: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 40,
    },
    slideDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 48,
      gap: 24,
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotActive: {
      backgroundColor: colors.primary,
      width: 24,
    },
    dotInactive: {
      backgroundColor: colors.border,
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
    buttonText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textWhite,
    },
  });
