import React from 'react';
import { View, Text, Image, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { FontFamily } from '../constants/fonts';
import { Spacing } from '../constants/spacing';
import AnimatedPressable from './AnimatedPressable';
import ProfileAvatar from './ProfileAvatar';

const appIcon = require('../../assets/icon.png');

const SIDEBAR_WIDTH = 220;
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
  const { user, logout } = useAuth();
  const { unreadCount, getUnreadCountForKid } = useNotifications();
  const navItems = role === 'admin' ? ADMIN_NAV : KID_NAV;

  const notificationCount =
    user?.role === 'kid' ? getUnreadCountForKid(user.kidId) : unreadCount;

  const displayName =
    user?.role === 'admin' ? user.displayName : user?.role === 'kid' ? user.name : '';

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.borderLight }]}>
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
              style={[
                styles.navItem,
                { backgroundColor: isActive ? colors.primaryLight + '18' : 'transparent' },
              ]}
              onPress={() => router.push(item.href as any)}
            >
              <Ionicons
                name={isActive ? item.iconActive : item.icon}
                size={20}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: isActive ? colors.primary : colors.textSecondary },
                  isActive && styles.navLabelActive,
                ]}
              >
                {item.label}
              </Text>
              {badgeCount > 0 && (
                <View style={[styles.navBadge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.navBadgeText}>
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </Text>
                </View>
              )}
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={[styles.profileFooter, { borderTopColor: colors.borderLight }]}>
        <ProfileAvatar name={displayName || '?'} size={32} />
        <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
          {displayName}
        </Text>
        <AnimatedPressable variant="button" onPress={handleLogout} style={styles.profileLogout} accessibilityLabel="Logout">
          <Ionicons name="log-out-outline" size={18} color={colors.textLight} />
        </AnimatedPressable>
      </View>
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
    borderRightWidth: 1,
    paddingTop: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
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
    marginBottom: Spacing.xxxl,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  brandText: {
    fontFamily: FontFamily.extraBold,
    fontWeight: '800',
    fontSize: 16,
  },
  nav: {
    gap: Spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
  },
  navLabel: {
    fontFamily: FontFamily.medium,
    fontWeight: '500',
    fontSize: 14,
  },
  navLabelActive: {
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
  },
  navBadge: {
    marginLeft: 'auto',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
  },
  profileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: 1,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xs,
    marginTop: 'auto',
    paddingBottom: Spacing.xl,
  },
  profileName: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    fontSize: 13,
  },
  profileLogout: {
    padding: Spacing.xs,
  },
});
