import React from 'react';
import { StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';

interface StatChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function StatChip({ label, selected, onPress }: StatChipProps) {
  const theme = useTheme();

  return (
    <Chip
      selected={selected}
      onPress={onPress}
      style={styles.chip}
      compact
      mode={selected ? 'flat' : 'outlined'}
    >
      {label}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
});
