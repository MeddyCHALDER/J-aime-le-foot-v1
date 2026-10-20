import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { fonts } from '../../../theme/brand';
import { useAppTheme } from '../../../theme/ThemeContext';

interface KickoffPickerProps {
  /** Date et heure locales au format AAAA-MM-JJTHH:mm */
  value: string;
  onChange: (value: string) => void;
  /** Libellés des deux champs (par défaut : coup d'envoi) */
  labels?: [string, string];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Aujourd'hui au format AAAA-MM-JJ (heure locale), borne basse du calendrier. */
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Date + heure du coup d'envoi.
 * Web / PWA : sélecteurs natifs (calendrier et heure du téléphone) via <input type="date|time">.
 * Natif : champ texte en attendant un picker natif.
 */
export function KickoffPicker({ value, onChange, labels = ['Date *', 'Heure *'] }: KickoffPickerProps) {
  const { tokens, scheme } = useAppTheme();
  const [date = '', time = ''] = value.split('T');

  if (Platform.OS !== 'web') {
    return (
      <TextInput
        label="Date et heure *"
        value={value}
        onChangeText={onChange}
        mode="outlined"
        placeholder="2026-10-20T18:00"
        style={styles.native}
      />
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    height: 52,
    padding: '0 14px',
    borderRadius: 4,
    border: `1px solid ${tokens.line}`,
    background: tokens.surface,
    color: tokens.text,
    // Calendrier et horloge natifs aux couleurs du thème
    colorScheme: scheme,
    accentColor: tokens.lime,
    fontFamily: fonts.body,
    fontSize: 16, // ≥ 16px : évite le zoom automatique de Safari iOS au focus
    WebkitAppearance: 'none',
    appearance: 'none',
    outline: 'none',
  };

  const label = (text: string) => (
    <Text style={[styles.label, { color: tokens.muted, fontFamily: fonts.body }]}>{text}</Text>
  );

  return (
    <View style={styles.row}>
      <View style={styles.date}>
        {label(labels[0])}
        <input
          type="date"
          aria-label="Date du match"
          value={date}
          min={todayLocal()}
          onChange={(e) => onChange(`${e.target.value}T${time || '20:00'}`)}
          style={inputStyle}
        />
      </View>
      <View style={styles.time}>
        {label(labels[1])}
        <input
          type="time"
          aria-label="Heure du match"
          value={time}
          step={300}
          onChange={(e) => onChange(`${date}T${e.target.value}`)}
          style={inputStyle}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  native: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  date: { flex: 3 },
  time: { flex: 2 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
});
