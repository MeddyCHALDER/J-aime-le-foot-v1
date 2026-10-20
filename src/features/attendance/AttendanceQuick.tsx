import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { useAuth } from '../auth/hooks';
import { AttendanceUnavailableError } from './api';
import { useAttendance, useSetMyAttendance } from './hooks';
import { useRegistrationOpening } from './useRegistrationOpening';
import { ordinal, splitByArrival } from './order';

/** Inscription en un geste sur la carte du prochain match (onglet Matchs). */
export function AttendanceQuick({
  matchId,
  registrationOpensAt,
  maxPlayers,
}: {
  matchId: string;
  registrationOpensAt?: string | null;
  maxPlayers?: number | null;
}) {
  const { tokens } = useAppTheme();
  const { user } = useAuth();
  const { data: rows = [], error } = useAttendance(matchId);
  const setMine = useSetMyAttendance(matchId);
  const opening = useRegistrationOpening(registrationOpensAt);

  // Sans la migration 005, on n'affiche rien plutôt qu'une erreur sur l'accueil.
  if (error instanceof AttendanceUnavailableError) return null;

  // Ouverture programmée : on annonce l'heure plutôt que des boutons inactifs.
  if (!opening.open) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.soon, { color: tokens.lime, fontFamily: fonts.body }]}>
          Inscriptions le {opening.when}
        </Text>
        <Text style={[styles.count, { color: tokens.muted, fontFamily: fonts.body, marginTop: 4 }]}>
          Ouverture {opening.countdown} · une notification t’avertira
        </Text>
      </View>
    );
  }

  const mine = rows.find((r) => r.user_id === user?.id)?.status;
  const split = splitByArrival(rows, maxPlayers);
  const going = split.confirmed.length;
  const myRank = split.rankOf(user?.id);

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
        {btn('in', split.full && mine !== 'in' ? 'Liste d’attente' : 'Je viens')}
        {btn('out', 'Je ne viens pas')}
      </View>
      <Text style={[styles.count, { color: tokens.muted, fontFamily: fonts.body }]}>
        {split.limit
          ? split.full
            ? `Complet (${split.limit} places)${split.waitlist.length ? ` · ${split.waitlist.length} en attente` : ''}`
            : `${split.limit - going} place${split.limit - going > 1 ? 's' : ''} restante${split.limit - going > 1 ? 's' : ''} sur ${split.limit}`
          : `${going} inscrit${going > 1 ? 's' : ''}`}
        {myRank?.list === 'waitlist' ? ` · tu es ${ordinal(myRank.n)} en attente` : ''}
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
  soon: { fontSize: 15, fontWeight: '700' },
});
