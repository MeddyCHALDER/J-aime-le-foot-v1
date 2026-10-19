import React from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, Button, List, Divider, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { fetchMatchById } from '../services/matches';
import { fetchTeamById } from '../services/teams';
import { fetchEventsByMatchWithPlayer } from '../services/events';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import type { MatchEventType } from '../types/database';

const EVENT_LABELS: Record<MatchEventType, string> = {
  goal: 'But',
  assist: 'Passe décisive',
  yellow_card: 'Carton jaune',
  red_card: 'Carton rouge',
  motm: 'Homme du match',
};

type Props = {
  matchId: string;
};

export function MatchDetailScreen({ matchId }: Props) {
  const theme = useTheme();
  const matchQ = useQuery({ queryKey: ['match', matchId], queryFn: () => fetchMatchById(matchId) });
  const eventsQ = useQuery({
    queryKey: ['match_events', matchId],
    queryFn: () => fetchEventsByMatchWithPlayer(matchId),
    enabled: !!matchQ.data,
  });

  const match = matchQ.data;
  const homeTeamId = match?.home_team_id;
  const awayTeamId = match?.away_team_id;
  const homeQ = useQuery({
    queryKey: ['team', homeTeamId],
    queryFn: () => fetchTeamById(homeTeamId!),
    enabled: !!homeTeamId,
  });
  const awayQ = useQuery({
    queryKey: ['team', awayTeamId],
    queryFn: () => fetchTeamById(awayTeamId!),
    enabled: !!awayTeamId,
  });

  const loading = matchQ.isLoading;
  const error = matchQ.error;

  if (loading) return <LoadingState message="Chargement du match…" />;
  if (error) return <ErrorState message={String(error)} onRetry={() => matchQ.refetch()} />;
  if (!match) return null;

  const home = homeQ.data;
  const away = awayQ.data;
  const events = eventsQ.data ?? [];
  const date = new Date(match.match_date);
  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const played = match.status === 'played';
  const streamUrl = match.stream_url ?? match.replay_url;

  const openStream = () => {
    if (streamUrl) Linking.openURL(streamUrl);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.scoreSection}>
        <Text variant="titleLarge">{home?.name ?? '…'}</Text>
        <View style={styles.scoreBox}>
          {played ? (
            <Text variant="headlineLarge">{match.home_score} - {match.away_score}</Text>
          ) : (
            <Text variant="bodyLarge">À venir</Text>
          )}
        </View>
        <Text variant="titleLarge">{away?.name ?? '…'}</Text>
      </View>
      <Text variant="bodyMedium" style={styles.date}>
        {dateStr} à {timeStr}
      </Text>
      {streamUrl && (
        <Button mode="contained" onPress={openStream} icon="play" style={styles.watch}>
          {match.replay_url ? 'Voir le replay' : 'Voir le match'}
        </Button>
      )}
      <Divider style={styles.divider} />
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Événements
      </Text>
      {events.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>Aucun événement enregistré.</Text>
      ) : (
        events.map((e: { id: string; event_type: MatchEventType; minute: number | null; player?: { name: string } }) => (
          <List.Item
            key={e.id}
            title={e.player?.name ?? 'Joueur'}
            description={`${EVENT_LABELS[e.event_type]}${e.minute != null ? ` (${e.minute}')` : ''}`}
            left={(props) => <List.Icon {...props} icon="soccer" />}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreBox: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  date: {
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 16,
  },
  watch: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  empty: {
    opacity: 0.7,
    paddingVertical: 16,
  },
});
