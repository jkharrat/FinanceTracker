import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme, useColors, useIsKid } from '../context/ThemeContext';
import type { ThemeMode } from '../context/ThemeContext';
import { ThemeColors, ACCENT_PALETTES, Avatars } from '../constants/colors';
import type { AccentPalette } from '../constants/colors';
import { Radius, Type, Elevation, KidType } from '../constants/theme';
import { Springs, Durations } from '../constants/motion';
import { Spacing } from '../constants/spacing';
import { hapticLight } from '../utils/haptics';
import ProfileAvatar from './ProfileAvatar';
import AnimatedPressable from './AnimatedPressable';
import CoinBurst from './CoinBurst';
import {
  AvatarTile,
  AccentSwatch,
  ColorRipple,
  FlyingAvatar,
  ThemeIcon,
  Point,
  centerOf,
  measureBox,
} from './ProfilePickerParts';
import { Button } from './ui';

const AnimatedBackdrop = Animated.createAnimatedComponent(Pressable);

const THEME_OPTIONS: {
  mode: ThemeMode;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { mode: 'light', icon: 'sunny-outline', activeIcon: 'sunny', label: 'Light' },
  { mode: 'dark', icon: 'moon-outline', activeIcon: 'moon', label: 'Dark' },
  { mode: 'system', icon: 'contrast-outline', activeIcon: 'contrast', label: 'Auto' },
];

const KID_HERO = 88;
const KID_HERO_EMOJI = 48;
const KID_TILE_EMOJI = 24;
const SPARKLES = ['✨', '⭐', '✨', '🌟'];

interface Flight {
  emoji: string;
  from: Point;
  to: Point;
}

interface Ripple {
  key: number;
  color: string;
  origin: Point;
}

const SHEET_BREAKPOINT = 600;

const dialogIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.96 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.out(Easing.cubic) },
}).duration(Durations.base);

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

function ThemeSegmented({ colors, isKid }: { colors: ThemeColors; isKid: boolean }) {
  const { mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const activeIndex = THEME_OPTIONS.findIndex((o) => o.mode === mode);
  const offset = useSharedValue(0);
  const measured = useRef(false);

  useEffect(() => {
    if (segmentWidth === 0) return;
    const target = activeIndex * segmentWidth;
    // Snap into place on first measure; only user changes should slide.
    offset.value = measured.current ? withSpring(target, Springs.snappy) : target;
    measured.current = true;
  }, [activeIndex, segmentWidth, offset]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    setSegmentWidth((e.nativeEvent.layout.width - 4) / THEME_OPTIONS.length);
  };

  return (
    <View style={styles.segmented} onLayout={onLayout}>
      {segmentWidth > 0 && (
        <Animated.View style={[styles.segmentIndicator, { width: segmentWidth }, indicatorStyle]} />
      )}
      {THEME_OPTIONS.map((opt) => {
        const active = mode === opt.mode;
        return (
          <Pressable
            key={opt.mode}
            style={styles.segment}
            onPress={() => setMode(opt.mode)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${opt.label} theme`}
          >
            {isKid ? (
              <ThemeIcon
                name={active ? opt.activeIcon : opt.icon}
                active={active}
                color={active ? colors.primary : colors.textSecondary}
              />
            ) : (
              <Ionicons name={opt.icon} size={16} color={active ? colors.text : colors.textSecondary} />
            )}
            <Text style={[styles.segmentLabel, { color: active ? colors.text : colors.textSecondary }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const { user, session, updateProfile, logout } = useAuth();
  const { getKid, updateKidAvatar } = useData();
  const kid = user?.role === 'kid' ? getKid(user.kidId) : undefined;
  const avatar = kid?.avatar;
  const { accentPalette, setAccentPalette } = useTheme();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const asSheet = Platform.OS !== 'web' || width < SHEET_BREAKPOINT;

  const isAdmin = user?.role === 'admin';
  const displayName = user?.role === 'admin' ? user.displayName : user?.role === 'kid' ? user.name : '';
  const email = isAdmin ? session?.user?.email ?? '' : '';

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isKid = useIsKid();
  const reducedMotion = useReducedMotion();
  const layerRef = useRef<View>(null);
  const panelRef = useRef<View>(null);
  const heroRef = useRef<View>(null);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [heroOverride, setHeroOverride] = useState<string | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  /** True from the tap until the emoji lands, including while positions are measured. */
  const [flying, setFlying] = useState(false);
  const [sparkleKey, setSparkleKey] = useState(0);
  const [ripple, setRipple] = useState<Ripple | null>(null);
  const squash = useSharedValue(0);
  const selectedAvatar = pendingAvatar ?? avatar;
  const heroAvatar = heroOverride ?? avatar;

  useEffect(() => {
    if (visible) {
      setEditName(displayName);
      setEditing(false);
      setError('');
    } else {
      setFlight(null);
      setFlying(false);
      setRipple(null);
      setPendingAvatar(null);
      setHeroOverride(null);
    }
  }, [visible, displayName]);

  // Drop the optimistic picks once the saved avatar catches up.
  useEffect(() => {
    if (pendingAvatar && avatar === pendingAvatar) setPendingAvatar(null);
    if (!flying && heroOverride && avatar === heroOverride) setHeroOverride(null);
  }, [avatar, pendingAvatar, heroOverride, flying]);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + squash.value * 0.22 }, { scaleY: 1 - squash.value * 0.2 }],
  }));

  const land = useCallback((emoji: string) => {
    setFlight(null);
    setFlying(false);
    setHeroOverride(emoji);
    setSparkleKey((k) => k + 1);
    hapticLight();
    squash.value = withSequence(withTiming(1, { duration: 80 }), withSpring(0, Springs.celebrate));
  }, [squash]);

  const pickKidAvatar = useCallback(async (emoji: string, tile: View | null) => {
    if (!kid || emoji === selectedAvatar || flying) return;
    setPendingAvatar(emoji);
    updateKidAvatar(kid.id, emoji).catch((err) => {
      console.error('Failed to update avatar:', err);
      setPendingAvatar(null);
      setHeroOverride(null);
    });

    if (reducedMotion) {
      setHeroOverride(emoji);
      return;
    }
    setFlying(true);
    setHeroOverride(heroAvatar ?? null);
    const [from, to, layer] = await Promise.all([
      measureBox(tile),
      measureBox(heroRef.current),
      measureBox(layerRef.current),
    ]);
    if (!from || !to || !layer) {
      land(emoji);
      return;
    }
    setFlight({ emoji, from: centerOf(from, layer), to: centerOf(to, layer) });
  }, [kid, selectedAvatar, flying, updateKidAvatar, reducedMotion, heroAvatar, land]);

  const pickKidAccent = useCallback(async (palette: AccentPalette) => {
    if (palette.id === accentPalette) return;
    setAccentPalette(palette.id);
    if (reducedMotion) return;
    const [hero, panel] = await Promise.all([measureBox(heroRef.current), measureBox(panelRef.current)]);
    if (!hero || !panel) return;
    setRipple((r) => ({ key: (r?.key ?? 0) + 1, color: palette.swatch, origin: centerOf(hero, panel) }));
  }, [accentPalette, setAccentPalette, reducedMotion]);

  const clearRipple = useCallback(() => setRipple(null), []);

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
    } finally {
      router.replace('/(auth)/login');
    }
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
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <AnimatedBackdrop
        entering={FadeIn.duration(Durations.base)}
        exiting={FadeOut.duration(Durations.quick)}
        style={[styles.overlay, asSheet ? styles.overlaySheet : styles.overlayDialog]}
        onPress={onClose}
      >
        <Animated.View
          ref={panelRef}
          collapsable={false}
          entering={asSheet ? SlideInDown.springify().damping(Springs.sheet.damping).stiffness(Springs.sheet.stiffness) : dialogIn}
          exiting={asSheet ? SlideOutDown.duration(Durations.base) : FadeOut.duration(Durations.quick)}
          style={[
            styles.panel,
            asSheet ? [styles.sheet, { paddingBottom: Spacing.xxl + insets.bottom }] : styles.dialog,
          ]}
        >
          {isKid && (
            <View pointerEvents="none" style={[styles.rippleClip, asSheet ? styles.rippleClipSheet : styles.rippleClipDialog]}>
              {ripple && (
                <ColorRipple key={ripple.key} color={ripple.color} origin={ripple.origin} onDone={clearRipple} />
              )}
            </View>
          )}
          <Pressable onPress={(e) => e.stopPropagation()}>
            {asSheet && <View style={styles.grabber} />}

            <View style={styles.profileSection}>
              {isKid && heroAvatar ? (
                <Animated.View ref={heroRef} collapsable={false} style={[styles.kidHero, heroStyle]}>
                  <Text style={styles.kidHeroText}>{heroAvatar}</Text>
                  {sparkleKey > 0 && <CoinBurst key={sparkleKey} glyphs={SPARKLES} count={10} />}
                </Animated.View>
              ) : avatar ? (
                <View style={styles.emojiAvatar}>
                  <Text style={styles.emojiAvatarText}>{avatar}</Text>
                </View>
              ) : (
                <ProfileAvatar name={editName || '?'} size={56} />
              )}

              {editing ? (
                <Animated.View entering={FadeIn.duration(Durations.base)} style={styles.editNameContainer}>
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
                    <Button title="Cancel" variant="secondary" size="sm" onPress={handleCancelEdit} disabled={saving} />
                    <Button title="Save" size="sm" onPress={handleSave} loading={saving} />
                  </View>
                  {error !== '' && <Text style={styles.errorText}>{error}</Text>}
                </Animated.View>
              ) : (
                <AnimatedPressable
                  variant="row"
                  style={styles.nameRow}
                  onPress={isAdmin ? () => setEditing(true) : undefined}
                  disabled={!isAdmin}
                  accessibilityLabel={isAdmin ? 'Edit name' : displayName}
                >
                  <Text style={[styles.name, isKid && styles.kidName]}>{displayName}</Text>
                  {isAdmin && <Ionicons name="pencil" size={13} color={colors.textLight} />}
                </AnimatedPressable>
              )}

              {email !== '' && <Text style={styles.email}>{email}</Text>}
              <Text style={styles.role}>{isAdmin ? 'Parent' : 'Kid'}</Text>
            </View>

            {kid && (
              <>
                <Text style={styles.sectionLabel}>Avatar</Text>
                <View style={[styles.avatarGrid, isKid && styles.kidAvatarGrid]}>
                  {isKid && Avatars.map((emoji) => (
                    <AvatarTile key={emoji} emoji={emoji} active={selectedAvatar === emoji} onPick={pickKidAvatar} />
                  ))}
                  {!isKid && Avatars.map((emoji) => {
                    const active = kid.avatar === emoji;
                    return (
                      <AnimatedPressable
                        key={emoji}
                        variant="button"
                        style={[
                          styles.avatarOption,
                          active && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                        ]}
                        onPress={() => {
                          if (!active) {
                            updateKidAvatar(kid.id, emoji).catch((err) =>
                              console.error('Failed to update avatar:', err),
                            );
                          }
                        }}
                        accessibilityLabel={`Avatar ${emoji}`}
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={styles.avatarOptionText}>{emoji}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={[styles.sectionLabel, kid && styles.sectionLabelSpaced]}>Appearance</Text>
            <ThemeSegmented colors={colors} isKid={isKid} />

            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Accent</Text>
            <View style={styles.accentRow}>
              {isKid && ACCENT_PALETTES.map((palette) => (
                <AccentSwatch
                  key={palette.id}
                  palette={palette}
                  active={accentPalette === palette.id}
                  onPick={pickKidAccent}
                />
              ))}
              {!isKid && ACCENT_PALETTES.map((palette) => {
                const active = accentPalette === palette.id;
                return (
                  <AnimatedPressable
                    key={palette.id}
                    variant="button"
                    style={[styles.accentSwatch, { borderColor: active ? palette.swatch : 'transparent' }]}
                    onPress={() => setAccentPalette(palette.id)}
                    accessibilityLabel={palette.label}
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.accentSwatchInner, { backgroundColor: palette.swatch }]}>
                      {active && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>

            <Button
              title="Log out"
              icon="log-out-outline"
              variant="destructive"
              fullWidth
              onPress={handleLogout}
              style={styles.logout}
            />
          </Pressable>
        </Animated.View>
      </AnimatedBackdrop>
      {isKid && (
        <View ref={layerRef} collapsable={false} style={StyleSheet.absoluteFill} pointerEvents="none">
          {flight && (
            <FlyingAvatar
              emoji={flight.emoji}
              from={flight.from}
              to={flight.to}
              endScale={KID_HERO_EMOJI / KID_TILE_EMOJI}
              onArrive={() => land(flight.emoji)}
            />
          )}
        </View>
      )}
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      ...(Platform.OS === 'web' ? { backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } as any : {}),
    },
    overlaySheet: {
      justifyContent: 'flex-end',
    },
    overlayDialog: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xxl,
    },
    panel: {
      backgroundColor: colors.surfaceElevated,
      padding: Spacing.xxl,
      ...Elevation.raised,
    },
    sheet: {
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      paddingTop: Spacing.md,
    },
    dialog: {
      width: '100%',
      maxWidth: 360,
      borderRadius: Radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
    },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      marginBottom: Spacing.lg,
    },
    profileSection: {
      alignItems: 'center',
      paddingBottom: Spacing.xxl,
    },
    emojiAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiAvatarText: {
      fontSize: 34,
    },
    kidHero: {
      width: KID_HERO,
      height: KID_HERO,
      borderRadius: KID_HERO / 2,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 3,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kidHeroText: {
      fontSize: KID_HERO_EMOJI,
    },
    kidAvatarGrid: {
      gap: Spacing.md,
    },
    rippleClip: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    rippleClipSheet: {
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
    },
    rippleClipDialog: {
      borderRadius: Radius.xl,
    },
    kidName: {
      ...KidType.title,
      fontSize: 22,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.sm,
    },
    name: {
      ...Type.title,
      fontSize: 20,
      color: colors.text,
    },
    email: {
      ...Type.label,
      color: colors.textSecondary,
      marginTop: 2,
    },
    role: {
      ...Type.caption,
      color: colors.textLight,
      marginTop: 2,
    },
    editNameContainer: {
      width: '100%',
      marginTop: Spacing.md,
      alignItems: 'center',
    },
    nameInput: {
      ...Type.bodyStrong,
      width: '100%',
      height: 44,
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.md,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
    },
    editActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    errorText: {
      ...Type.label,
      color: colors.danger,
      marginTop: Spacing.sm,
    },
    sectionLabel: {
      ...Type.overline,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
    },
    sectionLabelSpaced: {
      marginTop: Spacing.xl,
    },
    avatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    avatarOption: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    avatarOptionText: {
      fontSize: 22,
    },
    segmented: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.md,
      padding: 2,
    },
    segmentIndicator: {
      position: 'absolute',
      top: 2,
      bottom: 2,
      left: 2,
      borderRadius: Radius.md - 2,
      backgroundColor: colors.surfaceElevated,
      ...Elevation.card,
    },
    segment: {
      flex: 1,
      height: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    segmentLabel: {
      ...Type.label,
    },
    accentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    accentSwatch: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    accentSwatchInner: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logout: {
      marginTop: Spacing.xxl,
    },
  });
