import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, Text, Chip, useTheme } from 'react-native-paper';
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

function MatchRow({ match, onPress }: { match: Match; onPress: () => void }) {
  const theme = useTheme();
  const homeQ = useQuery({ queryKey: ['team', match.home_team_id], queryFn: () => fetchTeamById(match.home_team_id) });
  const awayQ = useQuery({ queryKey: ['team', match.away_team_id], queryFn: () => fetchTeamById(match.away_team_id) });
  const home = homeQ.data?.name ?? '…';
  const away = awayQ.data?.name ?? '…';
  const date = new Date(match.match_date);
  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const played = match.status === 'played';

  return (
    <List.Item
      title={`${home} - ${away}`}
      description={`${dateStr} ${timeStr}`}
      left={() => (
        <View style={styles.scoreBox}>
          {played ? (
            <Text variant="titleMedium">{match.home_score} - {match.away_score}</Text>
          ) : (
            <Chip compact>À venir</Chip>
          )}
        </View>
      )}
      onPress={onPress}
      style={styles.item}
    />
  );
}

export function LeagueCalendarTab({ seasonId, onMatchPress }: Props) {
  const theme = useTheme();
  const { data: matches, isLoading, error, refetch } = useQuery({
    queryKey: ['matches', seasonId],
    queryFn: () => fetchMatchesBySeason(seasonId),
  });

  if (isLoading) return <LoadingState message="Chargement du calendrier…" />;
  if (error) return <ErrorState message={String(error)} onRetry={refetch} />;
  if (!matches?.length) {
    return <EmptyState title="Aucun match" message="Les matchs de cette saison apparaîtront ici." />;
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MatchRow match={item} onPress={() => onMatchPress(item.id)} />}
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
  scoreBox: {
    justifyContent: 'center',
    marginRight: 12,
    minWidth: 56,
    alignItems: 'center',
  },
});
