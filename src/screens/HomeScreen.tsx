import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, Text, Button, useTheme } from 'react-native-paper';
import type { League } from '../types/database';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

type Props = {
  leagues: League[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onLeaguePress: (leagueId: string) => void;
  onDiscoverLeagues: () => void;
};

export function HomeScreen({
  leagues,
  loading,
  error,
  onRetry,
  onLeaguePress,
  onDiscoverLeagues,
}: Props) {
  const theme = useTheme();

  if (loading) return <LoadingState message="Chargement des ligues…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!leagues.length) {
    return (
      <EmptyState
        title="Aucune ligue suivie"
        message="Suivez des ligues pour les retrouver ici."
        actionLabel="Découvrir les ligues"
        onAction={onDiscoverLeagues}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall">Mes ligues</Text>
        <Button mode="outlined" onPress={onDiscoverLeagues} compact>
          Découvrir
        </Button>
      </View>
      <FlatList
        data={leagues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={item.description ?? undefined}
            left={(props) => <List.Icon {...props} icon="trophy" />}
            onPress={() => onLeaguePress(item.id)}
            style={styles.item}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
});
