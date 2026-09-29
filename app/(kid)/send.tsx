import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  useReducedMotion,
  ZoomIn,
} from 'react-native-reanimated';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../src/context/DataContext';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';
import { KidRadius, KidType, KID_BUTTON_LEDGE } from '../../src/constants/theme';
import { useToast } from '../../src/context/ToastContext';
import { useShake } from '../../src/hooks/useShake';
import { Durations, Springs } from '../../src/constants/motion';
import AnimatedPressable from '../../src/components/AnimatedPressable';
import AnimatedNumber from '../../src/components/AnimatedNumber';
import SendCelebration from '../../src/components/SendCelebration';
import SheetEntrance, { SheetEntranceHandle, useSheetStagger } from '../../src/components/SheetEntrance';
import { Kid } from '../../src/types';

interface SentInfo {
  amount: number;
  name: string;
  avatar: string;
  previousBalance: number;
}

interface RecipientCardProps {
  kid: Kid;
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}

function RecipientCard({ kid, selected, onPress, colors, styles }: RecipientCardProps) {
  const reducedMotion = useReducedMotion();
  const bounce = useSharedValue(1);

  useEffect(() => {
    if (!selected || reducedMotion) return;
    bounce.value = withSequence(withTiming(0.94, { duration: Durations.quick / 2 }), withSpring(1, Springs.bouncy));
  }, [selected, reducedMotion, bounce]);

  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.value }] }));

  return (
    <Animated.View style={bounceStyle}>
      <AnimatedPressable
        variant="card"
        style={[styles.recipientCard, selected && styles.recipientCardSelected]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`Send to ${kid.name}`}
      >
        <View style={[styles.recipientAvatar, selected && styles.recipientAvatarSelected]}>
          <Text style={styles.recipientAvatarText}>{kid.avatar}</Text>
        </View>
        <Text style={[styles.recipientName, selected && styles.recipientNameSelected]}>
          {kid.name}
        </Text>
        {selected && (
          <Animated.View entering={reducedMotion ? undefined : ZoomIn.springify().damping(Springs.bouncy.damping)}>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          </Animated.View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function SendMoneyScreen() {
  const { user } = useAuth();
  const { kids, getKid, transferMoney } = useData();
  const router = useRouter();
  const colors = useColors();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { shakeStyle, triggerShake } = useShake();
  const [sent, setSent] = useState<SentInfo | null>(null);
  const finishSend = useCallback(() => router.back(), [router]);

  const sheetRef = useRef<SheetEntranceHandle>(null);
  const close = useCallback(() => {
    if (sheetRef.current) sheetRef.current.dismiss(() => router.back());
    else router.back();
  }, [router]);
  const enter = useSheetStagger();
  const reducedMotion = useReducedMotion();

  const formDim = useSharedValue(0);
  const formStyle = useAnimatedStyle(() => ({
    opacity: 1 - formDim.value * 0.6,
    transform: [{ scale: 1 - formDim.value * 0.04 }],
  }));

  const kidId = user?.role === 'kid' ? user.kidId : null;
  const sender = kidId ? getKid(kidId) : undefined;

  // Start the balance at zero so it rolls up to the real amount once the sheet is in.
  const [shownBalance, setShownBalance] = useState(reducedMotion ? sender?.balance ?? 0 : 0);
  useEffect(() => {
    if (sender) setShownBalance(sender.balance);
  }, [sender?.balance]);
  const otherKids = useMemo(
    () => kids.filter((k) => k.id !== kidId),
    [kids, kidId]
  );
  const selectedKid = selectedKidId ? getKid(selectedKidId) : undefined;

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const hasInsufficientBalance = isValidAmount && sender && parsedAmount > sender.balance;
  const canSend = selectedKidId && isValidAmount && !hasInsufficientBalance && !sending;

  const handleSend = async () => {
    if (!kidId || !selectedKidId || !isValidAmount || !sender) return;

    setError('');
    setSending(true);

    try {
      const desc = description.trim() || `Transfer to ${selectedKid?.name ?? 'friend'}`;
      const result = await transferMoney(kidId, selectedKidId, parsedAmount, desc);

      if (result.success) {
        formDim.value = withTiming(1, { duration: Durations.base });
        setSent({
          amount: parsedAmount,
          name: selectedKid?.name ?? 'your friend',
          avatar: selectedKid?.avatar ?? '😊',
          previousBalance: sender.balance,
        });
      } else {
        setError(result.error ?? 'Transfer failed');
        showToast('error', result.error ?? 'Transfer failed');
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setSending(false);
    }
  };

  if (!sender) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Account not found</Text>
      </View>
    );
  }

  const recipientsStart = 2;
  const amountOrder = recipientsStart + otherKids.length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: 'Send Money',
          headerLeft: () => (
            <TouchableOpacity onPress={close} style={styles.headerButton} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <SheetEntrance ref={sheetRef}>
      <Animated.View style={[styles.flex, formStyle]}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.content}>
            {/* Balance Info */}
            <Animated.View entering={enter(0)} style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Your Balance</Text>
              <AnimatedNumber value={shownBalance} style={styles.balanceAmount} duration={700} />
            </Animated.View>

            {/* Recipient Selection */}
            <Animated.Text entering={enter(1)} style={styles.sectionTitle}>Send to</Animated.Text>
            <View style={styles.recipientList}>
              {otherKids.map((kid, i) => (
                <Animated.View key={kid.id} entering={enter(recipientsStart + i)}>
                  <RecipientCard
                    kid={kid}
                    selected={selectedKidId === kid.id}
                    onPress={() => {
                      setSelectedKidId(kid.id);
                      setError('');
                    }}
                    colors={colors}
                    styles={styles}
                  />
                </Animated.View>
              ))}
            </View>

            {/* Amount Input */}
            <Animated.View entering={enter(amountOrder)}>
            <Text style={styles.sectionTitle}>Amount</Text>
            <View style={[styles.amountContainer, focusedField === 'amount' && styles.inputFocused]}>
              <Text style={styles.currencySign}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  setError('');
                }}
                placeholder="0.00"
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onFocus={() => setFocusedField('amount')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {hasInsufficientBalance && (
              <Text style={styles.warningText}>
                Insufficient balance. You can send up to ${sender.balance.toFixed(2)}
              </Text>
            )}
            </Animated.View>

            {/* Description Input */}
            <Animated.View entering={enter(amountOrder + 1)}>
            <Text style={styles.sectionTitle}>Note (optional)</Text>
            <TextInput
              style={[styles.descriptionInput, focusedField === 'note' && styles.inputFocused]}
              value={description}
              onChangeText={setDescription}
              placeholder={selectedKid ? `Transfer to ${selectedKid.name}` : 'Add a note...'}
              placeholderTextColor={colors.textLight}
              maxLength={100}
              returnKeyType="done"
              autoCapitalize="sentences"
              onFocus={() => setFocusedField('note')}
              onBlur={() => setFocusedField(null)}
            />
            </Animated.View>

            {/* Error */}
            {error !== '' && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            )}

            {/* Send Button */}
            <Animated.View entering={enter(amountOrder + 2)}>
            <Animated.View style={shakeStyle}>
              <AnimatedPressable
                variant="button"
                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                pressDepth={canSend ? KID_BUTTON_LEDGE / 2 : 0}
                onPress={() => { if (!canSend && !sending) { triggerShake(); } else { handleSend(); } }}
                accessibilityRole="button"
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={canSend ? colors.textWhite : colors.textLight}
                />
                <Text style={[styles.sendButtonText, !canSend && styles.sendButtonTextDisabled]}>
                  {sending
                    ? 'Sending...'
                    : isValidAmount
                      ? `Send $${parsedAmount.toFixed(2)}`
                      : 'Send Money'}
                </Text>
              </AnimatedPressable>
            </Animated.View>
            </Animated.View>
          </View>
        }
        keyExtractor={() => 'header'}
        showsVerticalScrollIndicator={false}
      />
      </Animated.View>
      </SheetEntrance>

      {sent && (
        <SendCelebration
          amount={sent.amount}
          recipientName={sent.name}
          recipientAvatar={sent.avatar}
          previousBalance={sent.previousBalance}
          onDone={finishSend}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    headerButton: {
      padding: Spacing.sm,
      minWidth: 36,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      padding: Spacing.xl,
    },
    errorText: {
      fontSize: 16,
      color: colors.danger,
      textAlign: 'center',
      marginTop: 40,
    },
    balanceInfo: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: Spacing.xl,
      alignItems: 'center',
      marginBottom: 28,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    balanceLabel: {
      fontSize: 13,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    balanceAmount: {
      ...KidType.display,
      fontSize: 36,
      color: colors.success,
    },
    sectionTitle: {
      ...KidType.headline,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    recipientList: {
      gap: 10,
      marginBottom: 28,
    },
    recipientCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: KidRadius.button,
      padding: 14,
      gap: Spacing.md,
      borderWidth: 2,
      borderColor: colors.border,
    },
    recipientCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    recipientAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 3,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recipientAvatarSelected: {
      backgroundColor: colors.surface,
      borderColor: colors.primary,
    },
    recipientAvatarText: {
      fontSize: 24,
    },
    recipientName: {
      ...KidType.headline,
      flex: 1,
      fontSize: 17,
      color: colors.text,
    },
    recipientNameSelected: {
      color: colors.primary,
    },
    inputFocused: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 2,
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currencySign: {
      fontSize: 24,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.textSecondary,
      marginRight: Spacing.xs,
    },
    amountInput: {
      flex: 1,
      fontSize: 24,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.text,
      paddingVertical: 14,
    },
    warningText: {
      fontSize: 13,
      color: colors.danger,
      marginBottom: Spacing.xl,
      marginTop: Spacing.xs,
    },
    descriptionInput: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.text,
      marginBottom: 28,
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.dangerLight,
      borderRadius: 12,
      padding: 14,
      marginBottom: Spacing.xl,
    },
    errorMessage: {
      flex: 1,
      fontSize: 14,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: colors.danger,
    },
    sendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: KidRadius.button,
      paddingVertical: Spacing.lg,
      gap: 10,
      borderBottomWidth: KID_BUTTON_LEDGE,
      borderBottomColor: colors.primaryDark,
    },
    sendButtonDisabled: {
      backgroundColor: colors.surfaceAlt,
      borderBottomColor: colors.border,
    },
    sendButtonText: {
      ...KidType.button,
      fontSize: 18,
      color: colors.textWhite,
    },
    sendButtonTextDisabled: {
      color: colors.textLight,
    },
  });
