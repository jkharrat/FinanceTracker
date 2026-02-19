import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontFamily } from '../constants/fonts';

const PALETTE = [
  '#6C63FF', '#34D399', '#F59E0B', '#EC4899',
  '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6',
  '#F97316', '#06B6D4', '#84CC16', '#E879F9',
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

interface ProfileAvatarProps {
  name: string;
  size?: number;
}

export default function ProfileAvatar({ name, size = 36 }: ProfileAvatarProps) {
  const bg = PALETTE[hashName(name) % PALETTE.length];
  const initials = getInitials(name);
  const fontSize = size * 0.4;

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: '700',
  },
});
