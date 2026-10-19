import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, Text, Button, useTheme } from 'react-native-paper';
import type { League } from '../types/database';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

type Props = {
  leagues: League[];
  followedIds: Set<string>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onLeaguePress: (leagueId: string) => void;
  onFollow: (leagueId: string) => void;
  onUnfollow: (leagueId: string) => void;
};

export function DiscoverLeaguesScreen({
  leagues,
  followedIds,
  loading,
  error,
  onRetry,
  onLeaguePress,
  onFollow,
  onUnfollow,
}: Props) {
  const theme = useTheme();

  if (loading) return <LoadingState message="Chargement des ligues…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!leagues.length) {
    return (
      <EmptyState
        title="Aucune ligue"
        message="Les ligues créées apparaîtront ici."
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="titleMedium" style={styles.header}>
        Toutes les ligues
      </Text>
      <FlatList
        data={leagues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isFollowing = followedIds.has(item.id);
          return (
            <List.Item
              title={item.name}
              description={item.description ?? undefined}
              left={(props) => <List.Icon {...props} icon="trophy" />}
              right={() => (
                <Button
                  mode={isFollowing ? 'outlined' : 'contained-tonal'}
                  onPress={() => (isFollowing ? onUnfollow(item.id) : onFollow(item.id))}
                  compact
                >
                  {isFollowing ? 'Suivi' : 'Suivre'}
                </Button>
              )}
              onPress={() => onLeaguePress(item.id)}
              style={styles.item}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
});
