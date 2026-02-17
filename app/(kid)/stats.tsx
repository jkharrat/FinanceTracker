import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useData } from '../../src/context/DataContext';
import { useColors } from '../../src/context/ThemeContext';
import { StatsView } from '../../src/components/StatsView';

export default function KidStatsScreen() {
  const { user } = useAuth();
  const { getKid } = useData();
  const colors = useColors();

  const kidId = user?.role === 'kid' ? user.kidId : null;
  const kid = kidId ? getKid(kidId) : undefined;

  if (!kid) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>Account not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatsView transactions={kid.transactions} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
