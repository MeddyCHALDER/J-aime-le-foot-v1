import React, { useState } from 'react';
import { ScrollView, StyleSheet, Linking, View } from 'react-native';
import { Text, Button, TextInput, useTheme } from 'react-native-paper';
// Événements de match (buts, passes…) mis de côté pour l'instant : l'admin saisit seulement le score.
import { useMatch, useUpdateMatch } from '../hooks';
import { useApplyMatchSheet } from '../../cards/hooks';
import { AttendancePanel } from '../../attendance/AttendancePanel';
import { useAttendance, useMatchAdmin } from '../../attendance/hooks';
import { Screen, LoadingState, ErrorState, SectionHeader } from '../../../ui';
import { toErrorMessage } from '../../../lib/errors';

interface MatchDetailScreenProps {
  matchId: string;
}

export function MatchDetailScreen({ matchId }: MatchDetailScreenProps) {
  const theme = useTheme();
  const { data: match, isLoading, error, refetch } = useMatch(matchId);
  const updateMatch = useUpdateMatch();
  const applySheet = useApplyMatchSheet();
  const [sheetMsg, setSheetMsg] = useState<string | null>(null);

  // Admin = gérant de la ligue (manager_id en legacy, created_by en V1)
  const { isAdmin, league } = useMatchAdmin(match?.season_id);
  // Les équipes viennent des inscriptions : l'admin compose parmi les inscrits.
  const { data: attendance = [] } = useAttendance(matchId);
  const homePlayers = attendance.filter((a) => a.status === 'in' && a.team_side === 'home');
  const awayPlayers = attendance.filter((a) => a.status === 'in' && a.team_side === 'away');

  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  React.useEffect(() => {
    if (match) {
      setHomeScore(String(match.home_score ?? 0));
      setAwayScore(String(match.away_score ?? 0));
    }
  }, [match?.id, match?.home_score, match?.away_score]);


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
            Équipe A
          </Text>
          {homePlayers.map((p) => (
            <Text key={p.user_id} variant="bodySmall" style={styles.playerLine}>
              {p.display_name}
            </Text>
          ))}
        </View>
        <View style={styles.scoreBox}>
          {played ? (
            <Text variant="headlineLarge">
              {match.home_score} - {match.away_score}
            </Text>
          ) : (
            <Text variant="bodyLarge">À venir</Text>
          )}
        </View>
        <View style={styles.teamCol}>
          <Text variant="titleMedium" style={styles.teamName}>
            Équipe B
          </Text>
          {awayPlayers.map((p) => (
            <Text key={p.user_id} variant="bodySmall" style={styles.playerLine}>
              {p.display_name}
            </Text>
          ))}
        </View>
      </View>

      <AttendancePanel
        matchId={match.id}
        locked={played}
        isAdmin={isAdmin}
        kickoffAt={match.kickoff_at}
        location={match.location}
        leagueName={league?.name ?? null}
      />

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
          <View style={styles.adminHeader}>
            <SectionHeader title="Admin · Saisir le score" />
          </View>
          <View style={styles.scoreInputs}>
            <TextInput
              label="Équipe A"
              value={homeScore}
              onChangeText={setHomeScore}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.scoreInput}
            />
            <TextInput
              label="Équipe B"
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
            Valider le score
          </Button>
          {sheetMsg ? (
            <Text variant="bodySmall" style={{ marginBottom: 12, opacity: 0.85 }}>
              {sheetMsg}
            </Text>
          ) : null}
        </View>
      ) : null}

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
  adminBox: { marginTop: 8 },
  adminHeader: { paddingHorizontal: 20 },
  scoreInputs: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  scoreInput: { flex: 1 },
});
