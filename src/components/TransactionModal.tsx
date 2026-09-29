import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Transaction, TransactionCategory, CATEGORIES } from '../types';
import { FontFamily } from '../constants/fonts';
import { Spacing } from '../constants/spacing';
import { KidRadius, KidType, KID_BUTTON_LEDGE } from '../constants/theme';
import AnimatedPressable from './AnimatedPressable';
import { Button } from './ui';

interface TransactionModalProps {
  visible: boolean;
  type: 'add' | 'subtract';
  onClose: () => void;
  onSubmit: (amount: number, description: string, category: TransactionCategory) => void | Promise<void>;
  editTransaction?: Transaction | null;
  onDelete?: () => void;
}

export function TransactionModal({
  visible,
  type,
  onClose,
  onSubmit,
  editTransaction,
  onDelete,
}: TransactionModalProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('other');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isEditing = !!editTransaction;
  const effectiveType = isEditing ? editTransaction.type : type;
  const isAdd = effectiveType === 'add';
  const accentColor = isAdd ? colors.success : colors.danger;
  const accentLedge = isAdd ? colors.successDark : colors.dangerDark;

  useEffect(() => {
    if (visible && editTransaction) {
      setAmount(editTransaction.amount.toString());
      setDescription(editTransaction.description);
      setCategory(editTransaction.category);
    } else if (visible) {
      setAmount('');
      setDescription('');
      setCategory(isAdd ? 'allowance' : 'other');
    }
  }, [visible, editTransaction, type]);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(parsedAmount, description.trim(), category);
      setAmount('');
      setDescription('');
      setCategory('other');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setDescription('');
    setCategory('other');
    onClose();
  };

  const isValid = parseFloat(amount) > 0 && description.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <View style={[styles.titleIcon, { backgroundColor: `${accentColor}22` }]}>
                <Ionicons name={isEditing ? 'create-outline' : isAdd ? 'add' : 'remove'} size={22} color={accentColor} />
              </View>
              <Text style={styles.title}>
                {isEditing
                  ? 'Edit Transaction'
                  : isAdd
                    ? 'Add Funds'
                    : 'Subtract Funds'}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Amount</Text>
              <View style={[styles.amountInputContainer, focusedField === 'amount' && styles.inputFocused]}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textLight}
                  keyboardType="decimal-pad"
                  autoFocus={!isEditing}
                  onFocus={() => setFocusedField('amount')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.textInput, focusedField === 'description' && styles.inputFocused]}
                value={description}
                onChangeText={setDescription}
                placeholder={isAdd ? 'e.g. Weekly allowance' : 'e.g. Bought a toy'}
                autoCapitalize="sentences"
                placeholderTextColor={colors.textLight}
                onFocus={() => setFocusedField('description')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {CATEGORIES.map((cat) => (
                  <AnimatedPressable
                    key={cat.id}
                    variant="button"
                    style={[
                      styles.categoryChip,
                      category === cat.id && { backgroundColor: accentColor, borderColor: accentColor },
                    ]}
                    onPress={() => setCategory(cat.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: category === cat.id }}
                    accessibilityLabel={cat.label}
                  >
                    <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat.id && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </AnimatedPressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.buttons}>
              <Button title="Cancel" variant="secondary" onPress={handleClose} style={styles.flex} />
              <AnimatedPressable
                variant="button"
                style={[
                  styles.submitButton,
                  isValid
                    ? { backgroundColor: accentColor, borderBottomColor: accentLedge }
                    : styles.submitDisabled,
                ]}
                pressDepth={isValid ? KID_BUTTON_LEDGE / 2 : 0}
                onPress={handleSubmit}
                disabled={!isValid || submitting}
                accessibilityRole="button"
              >
                <Text style={[styles.submitText, !isValid && styles.submitTextDisabled]}>
                  {submitting ? 'Saving...' : isEditing ? 'Save' : isAdd ? 'Add' : 'Subtract'}
                </Text>
              </AnimatedPressable>
            </View>

            {isEditing && onDelete && (
              <Button
                title="Delete Transaction"
                icon="trash-outline"
                variant="destructive"
                fullWidth
                onPress={onDelete}
                style={styles.deleteButton}
              />
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any : {}),
      justifyContent: 'flex-end',
    },
    keyboardView: {
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: KidRadius.card,
      borderTopRightRadius: KidRadius.card,
      padding: Spacing.xxl,
      paddingBottom: 40,
    },
    handle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: Spacing.xl,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.xxl,
    },
    titleIcon: {
      width: 44,
      height: 44,
      borderRadius: KidRadius.bubble,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...KidType.title,
      fontSize: 24,
      color: colors.text,
    },
    field: {
      marginBottom: Spacing.xl,
    },
    label: {
      ...KidType.headline,
      fontSize: 16,
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    inputFocused: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 2,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.lg,
    },
    dollarSign: {
      ...KidType.amount,
      fontSize: 24,
      color: colors.textSecondary,
      marginRight: Spacing.xs,
    },
    amountInput: {
      ...KidType.amount,
      flex: 1,
      fontSize: 24,
      color: colors.text,
      paddingVertical: 14,
    },
    textInput: {
      fontFamily: FontFamily.regular,
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    categoryScroll: {
      gap: Spacing.sm,
      paddingVertical: 2,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 14,
      height: 40,
      borderRadius: KidRadius.bubble,
      gap: 6,
    },
    categoryChipEmoji: {
      fontSize: 16,
    },
    categoryChipText: {
      ...KidType.button,
      fontSize: 14,
      color: colors.textSecondary,
    },
    categoryChipTextSelected: {
      color: colors.textWhite,
    },
    buttons: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginTop: Spacing.sm,
    },
    flex: {
      flex: 1,
    },
    submitButton: {
      flex: 1,
      height: 54,
      borderRadius: KidRadius.button,
      borderBottomWidth: KID_BUTTON_LEDGE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitDisabled: {
      backgroundColor: colors.surfaceAlt,
      borderBottomColor: colors.border,
    },
    submitText: {
      ...KidType.button,
      fontSize: 17,
      color: colors.textWhite,
    },
    submitTextDisabled: {
      color: colors.textLight,
    },
    deleteButton: {
      marginTop: Spacing.lg,
    },
  });
