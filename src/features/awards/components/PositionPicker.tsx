import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../theme/brand';
import { useAppTheme } from '../../../theme/ThemeContext';
import { POSITIONS } from '../../cards/positions';

interface PositionPickerProps {
  value: string[];
  onChange: (positions: string[]) => void;
  disabled?: boolean;
}

/** Postes d'un trophée, en puces à cocher. Aucune cochée = ouvert à tous. */
export function PositionPicker({ value, onChange, disabled }: PositionPickerProps) {
  const { tokens } = useAppTheme();
  const toggle = (code: string) =>
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);

  return (
    <View style={styles.wrap}>
      {POSITIONS.map((p) => {
        const on = value.includes(p.code);
        return (
          <Pressable
            key={p.code}
            onPress={() => toggle(p.code)}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled }}
            style={[
              styles.chip,
              {
                backgroundColor: on ? tokens.lime : 'transparent',
                borderColor: on ? tokens.lime : tokens.line,
              },
              disabled && { opacity: 0.5 },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: on ? tokens.onLime : tokens.text, fontFamily: fonts.body },
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: '600' },
});
