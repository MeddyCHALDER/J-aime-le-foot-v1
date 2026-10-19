import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, Text, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { fetchMatchesBySeason } from '../services/matches';
import { fetchTeamById } from '../services/teams';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import type { Match } from '../types/database';

type Props = {
  seasonId: string;
  onMatchPress: (matchId: string) => void;
};

function ResultRow({ match, onPress }: { match: Match; onPress: () => void }) {
  const homeQ = useQuery({ queryKey: ['team', match.home_team_id], queryFn: () => fetchTeamById(match.home_team_id) });
  const awayQ = useQuery({ queryKey: ['team', match.away_team_id], queryFn: () => fetchTeamById(match.away_team_id) });
  const home = homeQ.data?.name ?? '…';
  const away = awayQ.data?.name ?? '…';
  const date = new Date(match.match_date);
  const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  if (match.status !== 'played') return null;

  return (
    <List.Item
      title={`${home} ${match.home_score} - ${match.away_score} ${away}`}
      description={dateStr}
      onPress={onPress}
      style={styles.item}
    />
  );
}

export function LeagueResultsTab({ seasonId, onMatchPress }: Props) {
  const theme = useTheme();
  const { data: matches, isLoading, error, refetch } = useQuery({
    queryKey: ['matches', seasonId],
    queryFn: () => fetchMatchesBySeason(seasonId),
  });

  if (isLoading) return <LoadingState message="Chargement des résultats…" />;
  if (error) return <ErrorState message={String(error)} onRetry={refetch} />;

  const played = (matches ?? []).filter((m) => m.status === 'played');
  if (!played.length) {
    return <EmptyState title="Aucun résultat" message="Les matchs joués s'afficheront ici." />;
  }

  return (
    <FlatList
      data={played}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ResultRow match={item} onPress={() => onMatchPress(item.id)} />}
      style={[styles.list, { backgroundColor: theme.colors.background }]}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
});
