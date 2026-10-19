import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, SegmentedButtons, List, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { fetchSeasonsByLeague } from '../services/seasons';
import { fetchTeamsBySeason } from '../services/teams';
import { fetchPlayersBySeason } from '../services/players';
import { fetchMatchesBySeason } from '../services/matches';
import { fetchEventsBySeason } from '../services/events';
import { computeAllPlayersStats } from '../utils/playerStats';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import type { League } from '../types/database';
import type { PlayerStats } from '../types/database';

type Props = {
  league: League;
  seasonId: string | null;
  onSeasonChange: (seasonId: string) => void;
  onPlayerPress: (playerId: string) => void;
};

export function AwardsScreen({ league, seasonId, onSeasonChange, onPlayerPress }: Props) {
  const theme = useTheme();
  const seasonsQ = useQuery({
    queryKey: ['seasons', league.id],
    queryFn: () => fetchSeasonsByLeague(league.id),
  });
  const seasons = seasonsQ.data ?? [];
  const currentSeasonId = seasonId ?? seasons[0]?.id;
  const teamsQ = useQuery({
    queryKey: ['teams', currentSeasonId],
    queryFn: () => fetchTeamsBySeason(currentSeasonId!),
    enabled: !!currentSeasonId,
  });
  const matchesQ = useQuery({
    queryKey: ['matches', currentSeasonId],
    queryFn: () => fetchMatchesBySeason(currentSeasonId!),
    enabled: !!currentSeasonId,
  });
  const loading = seasonsQ.isLoading || teamsQ.isLoading || matchesQ.isLoading;
  const error = seasonsQ.error ?? teamsQ.error ?? matchesQ.error;

  if (loading) return <LoadingState message="Chargement des awards…" />;
  if (error) return <ErrorState message={String(error)} onRetry={() => { seasonsQ.refetch(); teamsQ.refetch(); matchesQ.refetch(); }} />;

  const hasSeason = !!currentSeasonId && seasons.length > 0;
  if (!hasSeason) {
    return <EmptyState title="Aucune saison" message="Créez une saison pour voir les trophées." />;
  }

  // For awards we need all players + events. Use a dedicated hook/query that returns PlayerStats[].
  // Here we'll show placeholder and use a custom hook in a wrapper.
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        Awards - {league.name}
      </Text>
      {seasons.length > 1 && (
        <SegmentedButtons
          value={currentSeasonId}
          onValueChange={onSeasonChange}
          buttons={seasons.map((s) => ({ value: s.id, label: s.name }))}
          style={styles.seasonSelector}
        />
      )}
      <AwardsContent seasonId={currentSeasonId} onPlayerPress={onPlayerPress} />
    </View>
  );
}

function AwardsContent({ seasonId, onPlayerPress }: { seasonId: string; onPlayerPress: (id: string) => void }) {
  const teamsQ = useQuery({ queryKey: ['teams', seasonId], queryFn: () => fetchTeamsBySeason(seasonId) });
  const matchesQ = useQuery({ queryKey: ['matches', seasonId], queryFn: () => fetchMatchesBySeason(seasonId) });
  const playersQ = useQuery({ queryKey: ['players_season', seasonId], queryFn: () => fetchPlayersBySeason(seasonId) });
  const eventsQ = useQuery({ queryKey: ['events_season', seasonId], queryFn: () => fetchEventsBySeason(seasonId) });
  const teams = teamsQ.data ?? [];
  const matches = matchesQ.data ?? [];
  const players = playersQ.data ?? [];
  const events = eventsQ.data ?? [];

  const stats: PlayerStats[] = React.useMemo(() => {
    return computeAllPlayersStats(players, teams, matches, events);
  }, [players, teams, matches, events]);

  const soulier = [...stats].sort((a, b) => b.goals - a.goals).slice(0, 5);
  const passeur = [...stats].sort((a, b) => b.assists - a.assists).slice(0, 5);
  const ballon = [...stats].sort((a, b) => b.ballon_dor_score - a.ballon_dor_score).slice(0, 5);

  return (
    <ScrollView style={styles.scroll}>
      <Text variant="titleMedium" style={styles.trophyTitle}>
        Soulier d'Or (buts)
      </Text>
      {soulier.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>Aucune donnée.</Text>
      ) : (
        soulier.map((s, i) => (
          <List.Item
            key={s.player_id}
            title={s.player_name}
            description={`${s.team_name} • ${s.goals} buts`}
            left={() => <Text variant="titleLarge">{i + 1}</Text>}
            onPress={() => onPlayerPress(s.player_id)}
            style={styles.item}
          />
        ))
      )}
      <Text variant="titleMedium" style={styles.trophyTitle}>
        Meilleur Passeur
      </Text>
      {passeur.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>Aucune donnée.</Text>
      ) : (
        passeur.map((s, i) => (
          <List.Item
            key={s.player_id}
            title={s.player_name}
            description={`${s.team_name} • ${s.assists} passes`}
            left={() => <Text variant="titleLarge">{i + 1}</Text>}
            onPress={() => onPlayerPress(s.player_id)}
            style={styles.item}
          />
        ))
      )}
      <Text variant="titleMedium" style={styles.trophyTitle}>
        Ballon d'Or (score)
      </Text>
      {ballon.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>Aucune donnée.</Text>
      ) : (
        ballon.map((s, i) => (
          <List.Item
            key={s.player_id}
            title={s.player_name}
            description={`${s.team_name} • ${s.ballon_dor_score} pts`}
            left={() => <Text variant="titleLarge">{i + 1}</Text>}
            onPress={() => onPlayerPress(s.player_id)}
            style={styles.item}
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
  title: {
    marginBottom: 16,
  },
  seasonSelector: {
    marginBottom: 16,
  },
  scroll: {
    flex: 1,
  },
  trophyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  empty: {
    opacity: 0.7,
    paddingVertical: 8,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
});
