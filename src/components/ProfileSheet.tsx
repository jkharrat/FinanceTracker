import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme, useColors } from '../context/ThemeContext';
import type { ThemeMode } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FontFamily } from '../constants/fonts';
import { Spacing } from '../constants/spacing';
import ProfileAvatar from './ProfileAvatar';

const THEME_OPTIONS: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { mode: 'light', icon: 'sunny', label: 'Light' },
  { mode: 'dark', icon: 'moon', label: 'Dark' },
  { mode: 'system', icon: 'phone-portrait-outline', label: 'Auto' },
];

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const { user, session, updateProfile, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const displayName = user?.role === 'admin' ? user.displayName : user?.role === 'kid' ? user.name : '';
  const email = session?.user?.email ?? '';

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setEditName(displayName);
      setEditing(false);
      setError('');
    }
  }, [visible, displayName]);

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/(auth)/login');
  };

  const handleSave = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setError('Name cannot be empty');
      return;
    }
    if (trimmed === displayName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError('');
    const result = await updateProfile(trimmed);
    setSaving(false);
    if (result.success) {
      setEditing(false);
    } else {
      setError(result.error ?? 'Failed to save');
    }
  };

  const handleCancelEdit = () => {
    setEditName(displayName);
    setEditing(false);
    setError('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.profileSection}>
            <ProfileAvatar name={editName || '?'} size={56} />

            {editing ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={(t) => { setEditName(t); setError(''); }}
                  placeholder="Your name"
                  placeholderTextColor={colors.textLight}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  editable={!saving}
                  selectTextOnFocus
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}
                    disabled={saving}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.7}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.textWhite} />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {error !== '' && <Text style={styles.errorText}>{error}</Text>}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.nameRow}
                onPress={() => setEditing(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.name}>{displayName}</Text>
                <Ionicons name="pencil" size={14} color={colors.textLight} />
              </TouchableOpacity>
            )}

            {email !== '' && <Text style={styles.email}>{email}</Text>}
            <Text style={styles.role}>Parent</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Appearance</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = mode === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  style={[styles.themeOption, active && styles.themeOptionActive]}
                  onPress={() => setMode(opt.mode)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={active ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xxl,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: Spacing.xxl,
      width: '100%',
      maxWidth: 340,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 12,
    },
    profileSection: {
      alignItems: 'center',
      paddingBottom: Spacing.xl,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: Spacing.md,
    },
    name: {
      fontSize: 20,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.text,
    },
    email: {
      fontSize: 13,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: colors.textLight,
      marginTop: 4,
    },
    role: {
      fontSize: 13,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: colors.textSecondary,
      marginTop: 2,
    },
    editNameContainer: {
      width: '100%',
      marginTop: Spacing.md,
      alignItems: 'center',
    },
    nameInput: {
      width: '100%',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    editActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    cancelButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
    },
    cancelButtonText: {
      fontSize: 14,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    saveButton: {
      paddingHorizontal: Spacing.xl,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.primary,
      minWidth: 70,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 14,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textWhite,
    },
    errorText: {
      fontSize: 13,
      color: colors.danger,
      marginTop: Spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginVertical: Spacing.lg,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textLight,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: Spacing.sm,
    },
    themeRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
    },
    themeOptionActive: {
      backgroundColor: colors.primaryLight + '20',
    },
    themeLabel: {
      fontSize: 13,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    themeLabelActive: {
      color: colors.primary,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
    },
    logoutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.md,
    },
    logoutText: {
      fontSize: 15,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.danger,
    },
  });
