import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { useAuth } from '../auth/hooks';
import { toErrorMessage } from '../../lib/errors';
import { AttendanceUnavailableError, type Attendance, type TeamSide } from './api';
import { useAttendance, useSetMyAttendance, useSetTeamSide } from './hooks';
import { matchSheetFilename, renderMatchSheetPng, shareOrDownloadPng } from './matchSheet';
import { useLeagueRoster } from '../members/hooks';
import { MiniPlayerCard } from '../cards/MiniPlayerCard';

interface AttendancePanelProps {
  matchId: string;
  /** Match joué : les inscriptions sont figées. */
  locked: boolean;
  isAdmin: boolean;
  /** Infos imprimées sur la feuille de match */
  kickoffAt: string;
  location: string | null;
  leagueName: string | null;
  /** Pour les mini cartes (photo, note, poste) */
  leagueId: string | null;
}

const SIDE_LABEL: Record<TeamSide, string> = { home: 'Équipe A', away: 'Équipe B' };

/** « Je viens / je ne viens pas », liste des inscrits et, pour l'admin, composition des équipes. */
export function AttendancePanel({
  matchId,
  locked,
  isAdmin,
  kickoffAt,
  location,
  leagueName,
  leagueId,
}: AttendancePanelProps) {
  const { tokens } = useAppTheme();
  const { user } = useAuth();
  const { data: rows = [], isLoading, error } = useAttendance(matchId);
  const setMine = useSetMyAttendance(matchId);
  const setSide = useSetTeamSide(matchId);
  const roster = useLeagueRoster(leagueId ?? undefined);
  const cardOf = (userId: string) => roster.data?.find((p) => p.player_id === userId);

  const t = (style: object) => [style, { fontFamily: fonts.body }];

  const [sheetState, setSheetState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [sheetError, setSheetError] = useState<string | null>(null);

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
  // Équipes terminées : tous les inscrits placés et deux équipes non vides
  const teamsDone = home.length > 0 && away.length > 0 && unplaced.length === 0;

  const exportSheet = async () => {
    setSheetState('busy');
    setSheetError(null);
    try {
      const png = await renderMatchSheetPng({
        leagueName,
        kickoffAt,
        location,
        home: home.map((r) => r.display_name),
        away: away.map((r) => r.display_name),
      });
      await shareOrDownloadPng(png, matchSheetFilename(kickoffAt));
      setSheetState('done');
    } catch (e) {
      setSheetError(toErrorMessage(e));
      setSheetState('error');
    }
  };

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

  const mini = (r: Attendance, size: 'xs' | 'sm') => {
    const c = cardOf(r.user_id);
    return (
      <MiniPlayerCard
        key={r.user_id}
        size={size}
        displayName={c?.display_name ?? r.display_name}
        avatarUrl={c?.avatar_url}
        overall={c?.overall}
        position={c?.preferred_position}
        highlighted={r.user_id === user?.id}
      />
    );
  };

  const playerRow = (r: Attendance) => (
    <View key={r.user_id} style={[styles.playerRow, { borderTopColor: tokens.line }]}>
      {mini(r, 'xs')}
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

      {home.length + away.length > 0 ? (
        <View style={styles.compo}>
          {([
            ['home', home],
            ['away', away],
          ] as const).map(([side, list]) => (
            <View key={side} style={[styles.compoCol, { borderColor: tokens.line }]}>
              <Text style={[styles.compoTitle, { color: tokens.lime, fontFamily: fonts.display }]}>
                {SIDE_LABEL[side]} · {list.length}
              </Text>
              <View style={styles.compoGrid}>
                {list.length > 0 ? (
                  list.map((r) => mini(r, 'sm'))
                ) : (
                  <Text style={t([styles.muted, { color: tokens.muted2 }])}>Personne</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {isAdmin && !locked
        ? group('Placer les joueurs', [...unplaced, ...home, ...away])
        : group(home.length + away.length > 0 ? 'En attente d’équipe' : 'Inscrits', unplaced)}
      {notGoing.length > 0 ? (
        <Text style={t([styles.absents, { color: tokens.muted2 }])}>
          Absents : {notGoing.map((r) => r.display_name).join(', ')}
        </Text>
      ) : null}
      {teamsDone && Platform.OS === 'web' ? (
        <Pressable
          onPress={exportSheet}
          disabled={sheetState === 'busy'}
          accessibilityRole="button"
          style={[styles.sheetBtn, { backgroundColor: tokens.lime }, sheetState === 'busy' && { opacity: 0.6 }]}
        >
          <Text style={t([styles.sheetText, { color: tokens.onLime }])}>
            {sheetState === 'busy' ? 'Préparation…' : 'Télécharger la feuille de match (.png)'}
          </Text>
        </Pressable>
      ) : null}
      {sheetState === 'error' && sheetError ? (
        <Text style={t([styles.error, { color: tokens.errorText }])}>{sheetError}</Text>
      ) : null}
      {isAdmin && !locked && going.length > 0 && !teamsDone ? (
        <Text style={t([styles.hint, { color: tokens.muted2 }])}>
          {unplaced.length > 0
            ? `Place les ${unplaced.length} joueur${unplaced.length > 1 ? 's' : ''} restant${unplaced.length > 1 ? 's' : ''} pour générer la feuille de match.`
            : 'Il faut au moins un joueur dans chaque équipe pour générer la feuille de match.'}
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
    minHeight: 62,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  playerName: { flex: 1, fontSize: 15, fontWeight: '500', marginLeft: 10 },
  compo: { flexDirection: 'row', gap: 8, marginTop: 16 },
  compoCol: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 8 },
  compoTitle: { fontSize: 14, fontStyle: 'italic', fontWeight: '700', marginBottom: 8 },
  compoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
  sheetBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetText: { fontSize: 15, fontWeight: '700' },
});
