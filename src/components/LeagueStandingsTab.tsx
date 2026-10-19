import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { DataTable, Text, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { fetchTeamsBySeason } from '../services/teams';
import { fetchMatchesBySeason } from '../services/matches';
import { computeStandings } from '../utils/standings';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';

type Props = {
  seasonId: string;
  onTeamPress: (teamId: string) => void;
};

export function LeagueStandingsTab({ seasonId, onTeamPress }: Props) {
  const theme = useTheme();
  const teamsQ = useQuery({
    queryKey: ['teams', seasonId],
    queryFn: () => fetchTeamsBySeason(seasonId),
  });
  const matchesQ = useQuery({
    queryKey: ['matches', seasonId],
    queryFn: () => fetchMatchesBySeason(seasonId),
  });

  const loading = teamsQ.isLoading || matchesQ.isLoading;
  const error = teamsQ.error ?? matchesQ.error;

  if (loading) return <LoadingState message="Chargement du classement…" />;
  if (error) return <ErrorState message={String(error)} onRetry={() => { teamsQ.refetch(); matchesQ.refetch(); }} />;

  const teams = teamsQ.data ?? [];
  const matches = matchesQ.data ?? [];
  const standings = computeStandings(matches, teams);

  if (!standings.length) {
    return (
      <EmptyState
        title="Aucune équipe"
        message="Ajoutez des équipes à cette saison pour voir le classement."
      />
    );
  }

  return (
    <ScrollView horizontal contentContainerStyle={styles.scroll}>
      <DataTable style={[styles.table, { backgroundColor: theme.colors.surface }]}>
        <DataTable.Header>
          <DataTable.Title numeric>#</DataTable.Title>
          <DataTable.Title>Équipe</DataTable.Title>
          <DataTable.Title numeric>J</DataTable.Title>
          <DataTable.Title numeric>G</DataTable.Title>
          <DataTable.Title numeric>N</DataTable.Title>
          <DataTable.Title numeric>P</DataTable.Title>
          <DataTable.Title numeric>BP</DataTable.Title>
          <DataTable.Title numeric>BC</DataTable.Title>
          <DataTable.Title numeric>Diff</DataTable.Title>
          <DataTable.Title numeric>Pts</DataTable.Title>
        </DataTable.Header>
        {standings.map((row, index) => (
          <DataTable.Row key={row.team_id} onPress={() => onTeamPress(row.team_id)}>
            <DataTable.Cell numeric>{index + 1}</DataTable.Cell>
            <DataTable.Cell>{row.team_name}</DataTable.Cell>
            <DataTable.Cell numeric>{row.played}</DataTable.Cell>
            <DataTable.Cell numeric>{row.won}</DataTable.Cell>
            <DataTable.Cell numeric>{row.drawn}</DataTable.Cell>
            <DataTable.Cell numeric>{row.lost}</DataTable.Cell>
            <DataTable.Cell numeric>{row.goals_for}</DataTable.Cell>
            <DataTable.Cell numeric>{row.goals_against}</DataTable.Cell>
            <DataTable.Cell numeric>{row.goal_diff}</DataTable.Cell>
            <DataTable.Cell numeric><Text variant="labelLarge" style={styles.points}>{row.points}</Text></DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 24,
  },
  table: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  points: {
    fontWeight: '700',
  },
});
