import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../theme/brand';
import { useAppTheme } from '../../../theme/ThemeContext';
import { LINE_LABEL, PITCH_LINES } from '../../cards/positions';

interface LinePickerProps {
  value: string[];
  onChange: (lines: string[]) => void;
  disabled?: boolean;
}

/** Lignes d'un trophée (Gardien, Défense, Milieu, Attaque), à cocher. Aucune = tous. */
export function LinePicker({ value, onChange, disabled }: LinePickerProps) {
  const { tokens } = useAppTheme();
  const toggle = (line: string) =>
    onChange(value.includes(line) ? value.filter((l) => l !== line) : [...value, line]);

  return (
    <View style={styles.chips}>
      {PITCH_LINES.map((line) => {
        const on = value.includes(line);
        return (
          <Pressable
            key={line}
            onPress={() => toggle(line)}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled }}
            style={[
              styles.chip,
              { borderColor: on ? tokens.lime : tokens.line },
              on && { backgroundColor: tokens.lime },
              disabled && { opacity: 0.5 },
            ]}
          >
            <Text style={[styles.chipText, { color: on ? tokens.onLime : tokens.text, fontFamily: fonts.body }]}>
              {LINE_LABEL[line]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, height: 34, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '700' },
});
