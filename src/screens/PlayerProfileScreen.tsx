import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { fetchPlayerById } from '../services/players';
import { fetchTeamById } from '../services/teams';
import { fetchMatchesBySeason } from '../services/matches';
import { fetchEventsBySeason } from '../services/events';
import { computePlayerStats } from '../utils/playerStats';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

type Props = {
  playerId: string;
};

export function PlayerProfileScreen({ playerId }: Props) {
  const theme = useTheme();
  const playerQ = useQuery({ queryKey: ['player', playerId], queryFn: () => fetchPlayerById(playerId) });
  const player = playerQ.data;
  const teamId = player?.team_id;
  const teamQ = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeamById(teamId!),
    enabled: !!teamId,
  });
  const team = teamQ.data;
  const seasonId = team?.season_id;
  const teamsQ = useQuery({
    queryKey: ['teams', seasonId],
    queryFn: () => fetchTeamsBySeason(seasonId!),
    enabled: !!seasonId,
  });
  const matchesQ = useQuery({
    queryKey: ['matches', seasonId],
    queryFn: () => fetchMatchesBySeason(seasonId!),
    enabled: !!seasonId,
  });
  const matches = matchesQ.data ?? [];
  const teams = teamsQ.data ?? [];
  const eventsQ = useQuery({
    queryKey: ['events_season', seasonId],
    queryFn: () => fetchEventsBySeason(seasonId!),
    enabled: !!seasonId,
  });
  const events = eventsQ.data ?? [];

  const loading = playerQ.isLoading || teamQ.isLoading || eventsQ.isLoading;
  const error = playerQ.error ?? teamQ.error ?? eventsQ.error;

  if (loading) return <LoadingState message="Chargement du joueur…" />;
  if (error) return <ErrorState message={String(error)} onRetry={() => playerQ.refetch()} />;
  if (!player || !team) return null;

  const stats = computePlayerStats(player.id, player, team, matches, events);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        {player.name}
      </Text>
      <Text variant="bodyMedium" style={styles.team}>
        {team.name} {player.number != null ? `• N°${player.number}` : ''} {player.position ? `• ${player.position}` : ''}
      </Text>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Statistiques
      </Text>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="headlineMedium">{stats.matches}</Text>
            <Text variant="bodySmall">Matchs</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="headlineMedium">{stats.goals}</Text>
            <Text variant="bodySmall">Buts</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="headlineMedium">{stats.assists}</Text>
            <Text variant="bodySmall">Passes</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="headlineMedium">{stats.motm}</Text>
            <Text variant="bodySmall">MOTM</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="headlineMedium">{stats.yellow_cards}</Text>
            <Text variant="bodySmall">Jaunes</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="headlineMedium">{stats.red_cards}</Text>
            <Text variant="bodySmall">Rouges</Text>
          </Card.Content>
        </Card>
      </View>
      <Card style={styles.ballonCard}>
        <Card.Content>
          <Text variant="titleMedium">Score Ballon d'Or</Text>
          <Text variant="headlineLarge">{stats.ballon_dor_score}</Text>
          <Text variant="bodySmall">buts×4 + passes×3 + MOTM×5 + victoires×1 - jaunes×1 - rouges×3</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 4,
  },
  team: {
    opacity: 0.8,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '30%',
    minWidth: 90,
  },
  ballonCard: {
    marginTop: 8,
  },
});
