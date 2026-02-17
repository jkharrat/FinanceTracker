import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Transaction, TransactionCategory, CATEGORIES } from '../types';

interface TransactionModalProps {
  visible: boolean;
  type: 'add' | 'subtract';
  onClose: () => void;
  onSubmit: (amount: number, description: string, category: TransactionCategory) => void;
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

  const isEditing = !!editTransaction;
  const effectiveType = isEditing ? editTransaction.type : type;
  const isAdd = effectiveType === 'add';
  const accentColor = isAdd ? colors.success : colors.danger;

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
  }, [visible, editTransaction]);

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (!description.trim()) return;
    onSubmit(parsedAmount, description.trim(), category);
    setAmount('');
    setDescription('');
    setCategory('other');
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
            <Text style={[styles.title, { color: accentColor }]}>
              {isEditing
                ? 'Edit Transaction'
                : isAdd
                  ? 'Add Funds'
                  : 'Subtract Funds'}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textLight}
                  keyboardType="decimal-pad"
                  autoFocus={!isEditing}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textInput}
                value={description}
                onChangeText={setDescription}
                placeholder={isAdd ? 'e.g. Weekly allowance' : 'e.g. Bought a toy'}
                autoCapitalize="sentences"
                placeholderTextColor={colors.textLight}
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
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      category === cat.id && styles.categoryChipSelected,
                      category === cat.id && { backgroundColor: accentColor },
                    ]}
                    onPress={() => setCategory(cat.id)}
                    activeOpacity={0.7}
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
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: accentColor },
                  !isValid && styles.submitDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!isValid}
              >
                <Text style={styles.submitText}>
                  {isEditing ? 'Save' : isAdd ? 'Add' : 'Subtract'}
                </Text>
              </TouchableOpacity>
            </View>

            {isEditing && onDelete && (
              <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                <Text style={styles.deleteText}>Delete Transaction</Text>
              </TouchableOpacity>
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
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    keyboardView: {
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 24,
    },
    field: {
      marginBottom: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 16,
    },
    dollarSign: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.textSecondary,
      marginRight: 4,
    },
    amountInput: {
      flex: 1,
      fontSize: 22,
      fontWeight: '600',
      color: colors.text,
      paddingVertical: 14,
    },
    textInput: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    categoryScroll: {
      gap: 8,
      paddingVertical: 2,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
    },
    categoryChipSelected: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    categoryChipEmoji: {
      fontSize: 14,
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    categoryChipTextSelected: {
      color: colors.textWhite,
    },
    buttons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 14,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    submitButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
    },
    submitDisabled: {
      opacity: 0.5,
    },
    submitText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textWhite,
    },
    deleteButton: {
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.danger,
      alignItems: 'center',
    },
    deleteText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.danger,
    },
  });
