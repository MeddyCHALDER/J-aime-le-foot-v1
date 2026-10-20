import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { useAuth } from '../auth/hooks';
import { AttendanceUnavailableError } from './api';
import { useAttendance, useSetMyAttendance } from './hooks';

/** Inscription en un geste sur la carte du prochain match (onglet Matchs). */
export function AttendanceQuick({ matchId }: { matchId: string }) {
  const { tokens } = useAppTheme();
  const { user } = useAuth();
  const { data: rows = [], error } = useAttendance(matchId);
  const setMine = useSetMyAttendance(matchId);

  // Sans la migration 005, on n'affiche rien plutôt qu'une erreur sur l'accueil.
  if (error instanceof AttendanceUnavailableError) return null;

  const mine = rows.find((r) => r.user_id === user?.id)?.status;
  const going = rows.filter((r) => r.status === 'in').length;

  const btn = (status: 'in' | 'out', label: string) => {
    const on = mine === status;
    const positive = status === 'in';
    return (
      <Pressable
        onPress={() => setMine.mutate(status)}
        disabled={setMine.isPending}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        style={[
          styles.btn,
          { borderColor: on ? (positive ? tokens.lime : tokens.errorText) : tokens.line },
          on && positive && { backgroundColor: tokens.lime },
          on && !positive && { backgroundColor: tokens.errorBg },
        ]}
      >
        <Text
          style={[
            styles.btnText,
            {
              color: on ? (positive ? tokens.onLime : tokens.errorText) : tokens.text,
              fontFamily: fonts.body,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {btn('in', 'Je viens')}
        {btn('out', 'Je ne viens pas')}
      </View>
      <Text style={[styles.count, { color: tokens.muted, fontFamily: fonts.body }]}>
        {going} inscrit{going > 1 ? 's' : ''} · touche la carte pour voir les équipes
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 14, fontWeight: '700' },
  count: { marginTop: 10, fontSize: 13 },
});
