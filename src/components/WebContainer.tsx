import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useColors } from '../context/ThemeContext';

const MAX_WIDTH = 480;

interface WebContainerProps {
  children: React.ReactNode;
}

export default function WebContainer({ children }: WebContainerProps) {
  const colors = useColors();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={[styles.outer, { backgroundColor: colors.surfaceAlt }]}>
      <View style={[styles.inner, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
});
