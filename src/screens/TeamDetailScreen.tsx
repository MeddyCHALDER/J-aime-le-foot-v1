import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, List, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { fetchTeamById } from '../services/teams';
import { fetchPlayersByTeam } from '../services/players';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

type Props = {
  teamId: string;
  onPlayerPress: (playerId: string) => void;
};

export function TeamDetailScreen({ teamId, onPlayerPress }: Props) {
  const theme = useTheme();
  const teamQ = useQuery({ queryKey: ['team', teamId], queryFn: () => fetchTeamById(teamId) });
  const playersQ = useQuery({
    queryKey: ['players', teamId],
    queryFn: () => fetchPlayersByTeam(teamId),
    enabled: !!teamId,
  });

  const team = teamQ.data;
  const players = playersQ.data ?? [];
  const loading = teamQ.isLoading;
  const error = teamQ.error;

  if (loading) return <LoadingState message="Chargement de l'équipe…" />;
  if (error) return <ErrorState message={String(error)} onRetry={() => teamQ.refetch()} />;
  if (!team) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        {team.name}
      </Text>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Effectif
      </Text>
      {players.length === 0 ? (
        <EmptyState title="Aucun joueur" message="Les joueurs de cette équipe apparaîtront ici." />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={item.position ?? (item.number != null ? `N°${item.number}` : undefined)}
              left={(props) => (
                <List.Icon {...props} icon="account" />
              )}
              onPress={() => onPlayerPress(item.id)}
              style={styles.item}
            />
          )}
        />
      )}
    </View>
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
  sectionTitle: {
    marginBottom: 8,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
});
