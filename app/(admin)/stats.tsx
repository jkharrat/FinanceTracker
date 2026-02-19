import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useData } from '../../src/context/DataContext';
import { useColors } from '../../src/context/ThemeContext';
import { StatsView } from '../../src/components/StatsView';

export default function AdminStatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getKid } = useData();
  const colors = useColors();

  const kid = id ? getKid(id) : undefined;

  if (!kid) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>Person not found</Text>
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
