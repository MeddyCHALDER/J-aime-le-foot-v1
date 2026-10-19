import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Linking, View } from 'react-native';
import {
  Text,
  Button,
  List,
  Divider,
  TextInput,
  SegmentedButtons,
  Menu,
  useTheme,
} from 'react-native-paper';
import {
  useMatch,
  useMatchTeams,
  useMatchEvents,
  useMatchTeamPlayers,
  useUpdateMatch,
  useCreateMatchEvent,
} from '../hooks';
import { useAuth } from '../../auth/hooks';
import { useApplyMatchSheet } from '../../cards/hooks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Screen, LoadingState, ErrorState, SectionHeader } from '../../../ui';
import { toErrorMessage } from '../../../lib/errors';
import type { MatchEventType } from '../../../types/entities';

const EVENT_LABELS: Record<MatchEventType, string> = {
  goal: 'But',
  assist: 'Passe',
  yellow: 'Jaune',
  red: 'Rouge',
  mvp: 'MVP',
};

interface MatchDetailScreenProps {
  matchId: string;
}

export function MatchDetailScreen({ matchId }: MatchDetailScreenProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { data: match, isLoading, error, refetch } = useMatch(matchId);
  const { data: matchTeams = [] } = useMatchTeams(matchId);
  const { data: events = [] } = useMatchEvents(matchId);
  const updateMatch = useUpdateMatch();
  const createEvent = useCreateMatchEvent();
  const applySheet = useApplyMatchSheet();
  const [sheetMsg, setSheetMsg] = useState<string | null>(null);

  const homeTeam = matchTeams.find((t) => t.side === 'home');
  const awayTeam = matchTeams.find((t) => t.side === 'away');
  const { data: homePlayers = [] } = useMatchTeamPlayers(homeTeam?.id);
  const { data: awayPlayers = [] } = useMatchTeamPlayers(awayTeam?.id);

  // Résoudre si l'utilisateur est admin de la ligue du match
  const { data: isAdmin = false } = useQuery({
    queryKey: ['match_admin', matchId, user?.id],
    enabled: !!match?.season_id && !!user?.id,
    queryFn: async () => {
      const { data: season } = await supabase
        .from('seasons')
        .select('league_id')
        .eq('id', match!.season_id)
        .single();
      if (!season?.league_id) return false;
      const { data: league } = await supabase
        .from('leagues')
        .select('created_by')
        .eq('id', season.league_id)
        .single();
      return league?.created_by === user!.id;
    },
  });

  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [eventType, setEventType] = useState<MatchEventType>('goal');
  const [eventSide, setEventSide] = useState<'home' | 'away'>('home');
  const [eventPlayerId, setEventPlayerId] = useState<string | null>(null);
  const [eventMinute, setEventMinute] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  React.useEffect(() => {
    if (match) {
      setHomeScore(String(match.home_score ?? 0));
      setAwayScore(String(match.away_score ?? 0));
    }
  }, [match?.id, match?.home_score, match?.away_score]);

  const playersForSide = eventSide === 'home' ? homePlayers : awayPlayers;
  const playerLabel = useMemo(() => {
    const p = playersForSide.find((x) => x.player_id === eventPlayerId);
    return p?.profile?.display_name ?? 'Choisir un joueur';
  }, [playersForSide, eventPlayerId]);

  if (isLoading) return <LoadingState message="Chargement du match…" />;
  if (error) return <ErrorState message={toErrorMessage(error)} onRetry={() => refetch()} />;
  if (!match) return null;

  const date = new Date(match.kickoff_at);
  const dateStr = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const played = match.status === 'played';
  const videoUrl = match.replay_url ?? match.stream_url ?? null;

  const saveScore = async () => {
    setSheetMsg(null);
    await updateMatch.mutateAsync({
      id: match.id,
      updates: {
        home_score: Number(homeScore) || 0,
        away_score: Number(awayScore) || 0,
        status: 'played',
      },
    });
    try {
      await applySheet.mutateAsync(match.id);
      setSheetMsg('Feuille validée — les cartes FIFA ont été mises à jour.');
    } catch (e) {
      setSheetMsg(
        e instanceof Error
          ? `Score OK, cartes non mises à jour (${e.message}). Exécute la migration 004.`
          : 'Score OK, cartes non mises à jour.'
      );
    }
    refetch();
  };

  const addEvent = async () => {
    if (!eventPlayerId) return;
    await createEvent.mutateAsync({
      matchId: match.id,
      teamSide: eventSide,
      playerId: eventPlayerId,
      type: eventType,
      minute: eventMinute ? Number(eventMinute) : undefined,
    });
    setEventMinute('');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Screen
        title={played ? 'Résultat' : 'Match à venir'}
        subtitle={`${dateStr} · ${timeStr}${match.location ? ` · ${match.location}` : ''}`}
        noScroll
      />

      <View style={styles.scoreSection}>
        <View style={styles.teamCol}>
          <Text variant="titleMedium" style={styles.teamName}>
            {homeTeam?.name ?? 'Equipe A'}
          </Text>
          {homePlayers.map((p) => (
            <Text key={p.player_id} variant="bodySmall" style={styles.playerLine}>
              {p.profile?.display_name ?? 'Joueur'}
            </Text>
          ))}
        </View>
        <View style={styles.scoreBox}>
          {played || !isAdmin ? (
            <Text variant="headlineLarge">
              {match.home_score} - {match.away_score}
            </Text>
          ) : (
            <Text variant="bodyLarge">À venir</Text>
          )}
        </View>
        <View style={styles.teamCol}>
          <Text variant="titleMedium" style={styles.teamName}>
            {awayTeam?.name ?? 'Equipe B'}
          </Text>
          {awayPlayers.map((p) => (
            <Text key={p.player_id} variant="bodySmall" style={styles.playerLine}>
              {p.profile?.display_name ?? 'Joueur'}
            </Text>
          ))}
        </View>
      </View>

      {videoUrl ? (
        <Button
          mode="contained"
          onPress={() => Linking.openURL(videoUrl)}
          icon="play"
          style={styles.watch}
        >
          {match.replay_url ? 'Voir le replay' : 'Voir le match'}
        </Button>
      ) : null}

      {isAdmin ? (
        <View style={styles.adminBox}>
          <SectionHeader title="Admin · Saisir le score" />
          <View style={styles.scoreInputs}>
            <TextInput
              label="Domicile"
              value={homeScore}
              onChangeText={setHomeScore}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.scoreInput}
            />
            <TextInput
              label="Extérieur"
              value={awayScore}
              onChangeText={setAwayScore}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.scoreInput}
            />
          </View>
          <Button
            mode="contained"
            onPress={saveScore}
            loading={updateMatch.isPending || applySheet.isPending}
            style={styles.watch}
          >
            Valider feuille de match
          </Button>
          {sheetMsg ? (
            <Text variant="bodySmall" style={{ marginBottom: 12, opacity: 0.85 }}>
              {sheetMsg}
            </Text>
          ) : null}

          <SectionHeader title="Admin · Feuille · Événements" />
          <SegmentedButtons
            value={eventSide}
            onValueChange={(v) => {
              setEventSide(v as 'home' | 'away');
              setEventPlayerId(null);
            }}
            buttons={[
              { value: 'home', label: homeTeam?.name ?? 'A' },
              { value: 'away', label: awayTeam?.name ?? 'B' },
            ]}
            style={styles.seg}
          />
          <SegmentedButtons
            value={eventType}
            onValueChange={(v) => setEventType(v as MatchEventType)}
            buttons={[
              { value: 'goal', label: 'But' },
              { value: 'assist', label: 'Passe' },
              { value: 'yellow', label: 'Jaune' },
              { value: 'red', label: 'Rouge' },
              { value: 'mvp', label: 'MVP' },
            ]}
            style={styles.seg}
          />
          <Menu
            visible={menuOpen}
            onDismiss={() => setMenuOpen(false)}
            anchor={
              <Button mode="outlined" onPress={() => setMenuOpen(true)} style={styles.watch}>
                {playerLabel}
              </Button>
            }
          >
            {playersForSide.map((p) => (
              <Menu.Item
                key={p.player_id}
                onPress={() => {
                  setEventPlayerId(p.player_id);
                  setMenuOpen(false);
                }}
                title={p.profile?.display_name ?? p.player_id.slice(0, 6)}
              />
            ))}
          </Menu>
          <TextInput
            label="Minute (optionnel)"
            value={eventMinute}
            onChangeText={setEventMinute}
            keyboardType="number-pad"
            mode="outlined"
            style={styles.watch}
          />
          <Button
            mode="contained"
            onPress={addEvent}
            disabled={!eventPlayerId}
            loading={createEvent.isPending}
            style={styles.watch}
          >
            Enregistrer l’événement
          </Button>
        </View>
      ) : null}

      <Divider style={styles.divider} />
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Événements
      </Text>
      {events.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>
          Aucun événement pour l’instant.
        </Text>
      ) : (
        events.map((e) => (
          <List.Item
            key={e.id}
            title={e.profile?.display_name ?? 'Joueur'}
            description={`${EVENT_LABELS[e.type]}${e.minute != null ? ` (${e.minute}')` : ''} · ${e.team_side === 'home' ? 'A' : 'B'}`}
            left={(props) => <List.Icon {...props} icon="soccer" />}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  teamCol: { flex: 1 },
  teamName: { textAlign: 'center', marginBottom: 6 },
  playerLine: { textAlign: 'center', opacity: 0.75 },
  scoreBox: { paddingHorizontal: 8, alignItems: 'center', paddingTop: 4 },
  watch: { marginHorizontal: 20, marginBottom: 12 },
  divider: { marginVertical: 16 },
  sectionTitle: { marginHorizontal: 20, marginBottom: 8 },
  empty: { opacity: 0.7, paddingVertical: 16, paddingHorizontal: 20 },
  adminBox: { marginTop: 8 },
  scoreInputs: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  scoreInput: { flex: 1 },
  seg: { marginHorizontal: 16, marginBottom: 12 },
});
