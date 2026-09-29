import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotifications } from '../context/NotificationContext';
import { Radius, Type } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import AnimatedPressable from './AnimatedPressable';
import ProfileAvatar from './ProfileAvatar';
import ProfileSheet from './ProfileSheet';

const appIcon = require('../../assets/icon.png');

const SIDEBAR_WIDTH = 232;
export const SIDEBAR_BREAKPOINT = 768;

interface NavItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  href: string;
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', icon: 'home-outline', iconActive: 'home', href: '/(admin)' },
  { label: 'Notifications', icon: 'notifications-outline', iconActive: 'notifications', href: '/(admin)/notifications' },
];

const KID_NAV: NavItem[] = [
  { label: 'Dashboard', icon: 'home-outline', iconActive: 'home', href: '/(kid)' },
  { label: 'Insights', icon: 'bar-chart-outline', iconActive: 'bar-chart', href: '/(kid)/stats' },
  { label: 'Notifications', icon: 'notifications-outline', iconActive: 'notifications', href: '/(kid)/notifications' },
];

interface WebSidebarLayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'kid';
}

export default function WebSidebarLayout({ children, role }: WebSidebarLayoutProps) {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web' || width < SIDEBAR_BREAKPOINT) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Sidebar role={role} />
      <View style={styles.main}>{children}</View>
    </View>
  );
}

function Sidebar({ role }: { role: 'admin' | 'kid' }) {
  const colors = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { getKid } = useData();
  const { unreadCount, getUnreadCountForKid } = useNotifications();
  const navItems = role === 'admin' ? ADMIN_NAV : KID_NAV;
  const [profileOpen, setProfileOpen] = useState(false);

  const notificationCount =
    user?.role === 'kid' ? getUnreadCountForKid(user.kidId) : unreadCount;

  const displayName =
    user?.role === 'admin' ? user.displayName : user?.role === 'kid' ? user.name : '';
  const kidAvatar = user?.role === 'kid' ? getKid(user.kidId)?.avatar : undefined;

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.background, borderRightColor: colors.hairline }]}>
      <View style={styles.brand}>
        <Image source={appIcon} style={styles.brandIcon} />
        <Text style={[styles.brandText, { color: colors.text }]}>Finance Tracker</Text>
      </View>
      <View style={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname === item.href.replace('/(admin)', '').replace('/(kid)', '') || (item.href.endsWith(')') && pathname === '/');
          const isNotification = item.label === 'Notifications';
          const badgeCount = isNotification ? notificationCount : 0;
          return (
            <AnimatedPressable
              key={item.href}
              variant="row"
              hoverBackground={isActive ? colors.surfaceAlt : colors.surfaceHover}
              style={[
                styles.navItem,
                { backgroundColor: isActive ? colors.surfaceAlt : colors.background },
              ]}
              onPress={() => {
                const rootHref = role === 'admin' ? '/(admin)' : '/(kid)';
                if (item.href === rootHref && router.canGoBack()) {
                  router.dismissAll();
                } else {
                  router.replace(item.href as any);
                }
              }}
            >
              <Ionicons
                name={isActive ? item.iconActive : item.icon}
                size={18}
                color={isActive ? colors.text : colors.textSecondary}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: isActive ? colors.text : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
              {badgeCount > 0 && (
                <View style={[styles.navBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.navBadgeText}>
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </Text>
                </View>
              )}
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={[styles.profileFooter, { borderTopColor: colors.hairline }]}>
        <AnimatedPressable
          variant="row"
          hoverBackground={colors.surfaceHover}
          style={[styles.profileInfo, { backgroundColor: colors.background }]}
          onPress={() => setProfileOpen(true)}
          accessibilityLabel="Profile and settings"
        >
          {kidAvatar ? (
            <View style={[styles.emojiAvatar, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={styles.emojiAvatarText}>{kidAvatar}</Text>
            </View>
          ) : (
            <ProfileAvatar name={displayName || '?'} size={32} />
          )}
          <View style={styles.profileText}>
            <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.profileHint, { color: colors.textLight }]}>Settings</Text>
          </View>
          <Ionicons name="chevron-up" size={14} color={colors.textLight} />
        </AnimatedPressable>
      </View>

      <ProfileSheet visible={profileOpen} onClose={() => setProfileOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.md,
    justifyContent: 'flex-start',
  },
  main: {
    flex: 1,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  brandIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
  },
  brandText: {
    ...Type.headline,
    fontSize: 15,
  },
  nav: {
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 38,
    borderRadius: Radius.sm + 2,
  },
  navLabel: {
    ...Type.label,
    fontSize: 14,
  },
  navBadge: {
    marginLeft: 'auto',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  navBadgeText: {
    ...Type.overline,
    fontSize: 11,
    color: '#FFFFFF',
  },
  profileFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    marginTop: 'auto',
    paddingBottom: Spacing.lg,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  emojiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiAvatarText: {
    fontSize: 18,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    ...Type.label,
    fontSize: 13,
  },
  profileHint: {
    ...Type.caption,
    fontSize: 11,
  },
});
