import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { useAuth } from '../auth/hooks';
import { toErrorMessage } from '../../lib/errors';
import { AttendanceUnavailableError, type Attendance, type TeamSide } from './api';
import { useAttendance, useSetMyAttendance, useSetTeamSide } from './hooks';

interface AttendancePanelProps {
  matchId: string;
  /** Match joué : les inscriptions sont figées. */
  locked: boolean;
  isAdmin: boolean;
}

const SIDE_LABEL: Record<TeamSide, string> = { home: 'Équipe A', away: 'Équipe B' };

/** « Je viens / je ne viens pas », liste des inscrits et, pour l'admin, composition des équipes. */
export function AttendancePanel({ matchId, locked, isAdmin }: AttendancePanelProps) {
  const { tokens } = useAppTheme();
  const { user } = useAuth();
  const { data: rows = [], isLoading, error } = useAttendance(matchId);
  const setMine = useSetMyAttendance(matchId);
  const setSide = useSetTeamSide(matchId);

  const t = (style: object) => [style, { fontFamily: fonts.body }];

  if (error instanceof AttendanceUnavailableError) {
    return (
      <View style={[styles.box, { backgroundColor: tokens.surface, borderColor: tokens.line }]}>
        <Text style={t([styles.muted, { color: tokens.muted }])}>{error.message}</Text>
      </View>
    );
  }

  const mine = rows.find((r) => r.user_id === user?.id);
  const going = rows.filter((r) => r.status === 'in');
  const notGoing = rows.filter((r) => r.status === 'out');
  const home = going.filter((r) => r.team_side === 'home');
  const away = going.filter((r) => r.team_side === 'away');
  const unplaced = going.filter((r) => !r.team_side);

  // Place les non-placés dans l'équipe la moins remplie, à tour de rôle.
  const autoBalance = () => {
    let h = home.length;
    let a = away.length;
    for (const r of unplaced) {
      const side: TeamSide = h <= a ? 'home' : 'away';
      if (side === 'home') h += 1;
      else a += 1;
      setSide.mutate({ userId: r.user_id, teamSide: side });
    }
  };

  const rsvpButton = (status: 'in' | 'out', label: string) => {
    const on = mine?.status === status;
    const positive = status === 'in';
    return (
      <Pressable
        onPress={() => setMine.mutate(status)}
        disabled={locked || setMine.isPending}
        accessibilityRole="button"
        accessibilityState={{ selected: on, disabled: locked }}
        style={[
          styles.rsvp,
          { borderColor: on ? (positive ? tokens.lime : tokens.errorText) : tokens.line },
          on && positive && { backgroundColor: tokens.lime },
          on && !positive && { backgroundColor: tokens.errorBg },
          locked && { opacity: 0.5 },
        ]}
      >
        <Text
          style={t([
            styles.rsvpText,
            { color: on ? (positive ? tokens.onLime : tokens.errorText) : tokens.text },
          ])}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const playerRow = (r: Attendance) => (
    <View key={r.user_id} style={[styles.playerRow, { borderTopColor: tokens.line }]}>
      <Text style={t([styles.playerName, { color: tokens.text }])} numberOfLines={1}>
        {r.display_name}
        {r.user_id === user?.id ? ' (toi)' : ''}
      </Text>
      {isAdmin && !locked ? (
        <View style={styles.sideToggle}>
          {(['home', 'away'] as const).map((side) => {
            const on = r.team_side === side;
            return (
              <Pressable
                key={side}
                onPress={() => setSide.mutate({ userId: r.user_id, teamSide: on ? null : side })}
                accessibilityRole="button"
                accessibilityLabel={`Placer ${r.display_name} en ${SIDE_LABEL[side]}`}
                accessibilityState={{ selected: on }}
                style={[
                  styles.sideBtn,
                  { borderColor: on ? tokens.lime : tokens.line },
                  on && { backgroundColor: tokens.lime },
                ]}
              >
                <Text style={t([styles.sideText, { color: on ? tokens.onLime : tokens.muted }])}>
                  {side === 'home' ? 'A' : 'B'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );

  const group = (title: string, list: Attendance[]) =>
    list.length > 0 ? (
      <View style={styles.group}>
        <Text style={t([styles.groupTitle, { color: tokens.muted2 }])}>
          {title} · {list.length}
        </Text>
        {list.map(playerRow)}
      </View>
    ) : null;

  return (
    <View style={[styles.box, { backgroundColor: tokens.surface, borderColor: tokens.line }]}>
      <Text style={t([styles.eyebrow, { color: tokens.lime }])}>Présence</Text>
      <Text style={[styles.question, { color: tokens.text, fontFamily: fonts.display }]}>
        {locked
          ? 'Match terminé'
          : mine?.status === 'in'
            ? 'Tu joues'
            : mine?.status === 'out'
              ? 'Tu ne viens pas'
              : 'Tu viens ?'}
      </Text>

      <View style={styles.rsvpRow}>
        {rsvpButton('in', 'Je viens')}
        {rsvpButton('out', 'Je ne viens pas')}
      </View>
      {setMine.error ? (
        <Text style={t([styles.error, { color: tokens.errorText }])}>
          {toErrorMessage(setMine.error)}
        </Text>
      ) : null}

      <View style={styles.countRow}>
        <Text style={t([styles.count, { color: tokens.text }])}>
          {going.length} inscrit{going.length > 1 ? 's' : ''}
        </Text>
        {notGoing.length > 0 ? (
          <Text style={t([styles.muted, { color: tokens.muted }])}>
            {notGoing.length} absent{notGoing.length > 1 ? 's' : ''}
          </Text>
        ) : null}
        {isLoading ? <ActivityIndicator size="small" color={tokens.lime} /> : null}
      </View>

      {isAdmin && !locked && unplaced.length > 0 ? (
        <Pressable
          onPress={autoBalance}
          style={[styles.balance, { borderColor: tokens.lime }]}
          accessibilityRole="button"
        >
          <Text style={t([styles.balanceText, { color: tokens.lime }])}>
            Répartir les {unplaced.length} non placés
          </Text>
        </Pressable>
      ) : null}

      {group(SIDE_LABEL.home, home)}
      {group(SIDE_LABEL.away, away)}
      {group(home.length + away.length > 0 ? 'Pas encore placés' : 'Inscrits', unplaced)}
      {notGoing.length > 0 ? (
        <Text style={t([styles.absents, { color: tokens.muted2 }])}>
          Absents : {notGoing.map((r) => r.display_name).join(', ')}
        </Text>
      ) : null}
      {isAdmin && !locked && going.length > 0 ? (
        <Text style={t([styles.hint, { color: tokens.muted2 }])}>
          Touche A ou B pour placer un joueur, touche à nouveau pour le retirer.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  question: { fontSize: 24, fontStyle: 'italic', fontWeight: '700', marginTop: 6, marginBottom: 14 },
  rsvpRow: { flexDirection: 'row', gap: 10 },
  rsvp: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpText: { fontSize: 15, fontWeight: '700' },
  error: { marginTop: 10, fontSize: 13 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  count: { fontSize: 15, fontWeight: '700' },
  muted: { fontSize: 14 },
  balance: {
    marginTop: 14,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceText: { fontSize: 14, fontWeight: '700' },
  group: { marginTop: 16 },
  groupTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  playerName: { flex: 1, fontSize: 15, fontWeight: '500' },
  sideToggle: { flexDirection: 'row', gap: 6 },
  sideBtn: {
    width: 36,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideText: { fontSize: 13, fontWeight: '700' },
  absents: { marginTop: 14, fontSize: 13, lineHeight: 18 },
  hint: { marginTop: 12, fontSize: 12, lineHeight: 17 },
});
