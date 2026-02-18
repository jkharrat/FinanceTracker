import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../src/context/DataContext';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';

export default function SendMoneyScreen() {
  const { user } = useAuth();
  const { kids, getKid, transferMoney } = useData();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const kidId = user?.role === 'kid' ? user.kidId : null;
  const sender = kidId ? getKid(kidId) : undefined;
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
        if (Platform.OS === 'web') {
          router.back();
        } else {
          Alert.alert(
            'Transfer Sent',
            `$${parsedAmount.toFixed(2)} sent to ${selectedKid?.name ?? 'friend'}`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } else {
        setError(result.error ?? 'Transfer failed');
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: 'Send Money',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.content}>
            {/* Balance Info */}
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Your Balance</Text>
              <Text style={styles.balanceAmount}>${sender.balance.toFixed(2)}</Text>
            </View>

            {/* Recipient Selection */}
            <Text style={styles.sectionTitle}>Send to</Text>
            <View style={styles.recipientList}>
              {otherKids.map((kid) => (
                <TouchableOpacity
                  key={kid.id}
                  style={[
                    styles.recipientCard,
                    selectedKidId === kid.id && styles.recipientCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedKidId(kid.id);
                    setError('');
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.recipientAvatar,
                      selectedKidId === kid.id && styles.recipientAvatarSelected,
                    ]}
                  >
                    <Text style={styles.recipientAvatarText}>{kid.avatar}</Text>
                  </View>
                  <Text
                    style={[
                      styles.recipientName,
                      selectedKidId === kid.id && styles.recipientNameSelected,
                    ]}
                  >
                    {kid.name}
                  </Text>
                  {selectedKidId === kid.id && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount Input */}
            <Text style={styles.sectionTitle}>Amount</Text>
            <View style={styles.amountContainer}>
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
              />
            </View>
            {hasInsufficientBalance && (
              <Text style={styles.warningText}>
                Insufficient balance. You can send up to ${sender.balance.toFixed(2)}
              </Text>
            )}

            {/* Description Input */}
            <Text style={styles.sectionTitle}>Note (optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder={selectedKid ? `Transfer to ${selectedKid.name}` : 'Add a note...'}
              placeholderTextColor={colors.textLight}
              maxLength={100}
              returnKeyType="done"
              autoCapitalize="sentences"
            />

            {/* Error */}
            {error !== '' && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            )}

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.8}
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
            </TouchableOpacity>
          </View>
        }
        keyExtractor={() => 'header'}
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerButton: {
      padding: 4,
    },
    content: {
      padding: 20,
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
      padding: 20,
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
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    balanceAmount: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.success,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    recipientList: {
      gap: 10,
      marginBottom: 28,
    },
    recipientCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      gap: 12,
      borderWidth: 2,
      borderColor: colors.border,
    },
    recipientCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
    },
    recipientAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recipientAvatarSelected: {
      backgroundColor: colors.primaryLight,
    },
    recipientAvatarText: {
      fontSize: 22,
    },
    recipientName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    recipientNameSelected: {
      color: colors.primary,
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currencySign: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textSecondary,
      marginRight: 4,
    },
    amountInput: {
      flex: 1,
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      paddingVertical: 14,
    },
    warningText: {
      fontSize: 13,
      color: colors.danger,
      marginBottom: 20,
      marginTop: 4,
    },
    descriptionInput: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 16,
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
      gap: 8,
      backgroundColor: colors.dangerLight,
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },
    errorMessage: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.danger,
    },
    sendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      gap: 10,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    sendButtonDisabled: {
      backgroundColor: colors.surfaceAlt,
      shadowOpacity: 0,
      elevation: 0,
    },
    sendButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textWhite,
    },
    sendButtonTextDisabled: {
      color: colors.textLight,
    },
  });
