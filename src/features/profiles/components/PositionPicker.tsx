import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../theme/brand';
import { useAppTheme } from '../../../theme/ThemeContext';
import { LINE_LABEL, POSITIONS, type PitchLine } from '../../cards/positions';

interface PositionPickerProps {
  value: string;
  onChange: (code: string) => void;
}

const LINES: PitchLine[] = ['GB', 'DEF', 'MIL', 'ATT'];

/** Choix du poste parmi la liste officielle (plus de texte libre). */
export function PositionPicker({ value, onChange }: PositionPickerProps) {
  const { tokens } = useAppTheme();
  const current = value.trim().toUpperCase();
  const selected = POSITIONS.find((p) => p.code === current);

  return (
    <View style={styles.root} accessibilityRole="radiogroup" accessibilityLabel="Poste">
      <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.body }]}>Poste *</Text>
      {LINES.map((line) => (
        <View key={line} style={styles.line}>
          <Text style={[styles.lineLabel, { color: tokens.muted2, fontFamily: fonts.body }]}>
            {LINE_LABEL[line]}
          </Text>
          <View style={styles.chips}>
            {POSITIONS.filter((p) => p.line === line).map((p) => {
              const on = p.code === current;
              return (
                <Pressable
                  key={p.code}
                  onPress={() => onChange(p.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={p.label}
                  style={[
                    styles.chip,
                    { borderColor: on ? tokens.lime : tokens.line },
                    on && { backgroundColor: tokens.lime },
                  ]}
                >
                  <Text style={[styles.chipText, { color: on ? tokens.onLime : tokens.text, fontFamily: fonts.body }]}>
                    {p.code}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Text style={[styles.hint, { color: selected ? tokens.lime : tokens.muted, fontFamily: fonts.body }]}>
        {selected
          ? `${selected.code} · ${selected.label}`
          : current
            ? `« ${value} » n’est plus un poste valide : choisis-en un dans la liste.`
            : 'Choisis ton poste : il sert aussi à composer les équipes types.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  line: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  lineLabel: { width: 68, fontSize: 12, fontWeight: '600' },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minWidth: 48, height: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});
