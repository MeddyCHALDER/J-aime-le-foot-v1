import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useLeagues } from '../hooks';
import { useAuth } from '../../auth/hooks';
import { Screen, EntityCard, EmptyState, LoadingState, ErrorState } from '../../../ui';
import { toErrorMessage } from '../../../lib/errors';

interface LeagueListScreenProps {
  onLeaguePress: (leagueId: string) => void;
  onCreateLeague: () => void;
  onJoinLeague: () => void;
  onMyProfile: () => void;
}

export function LeagueListScreen({
  onLeaguePress,
  onCreateLeague,
  onJoinLeague,
  onMyProfile,
}: LeagueListScreenProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { data: leagues = [], isLoading, error, refetch, isRefetching } = useLeagues();

  if (isLoading) return <LoadingState message="Chargement de tes ligues…" />;
  if (error) return <ErrorState message={toErrorMessage(error)} onRetry={() => refetch()} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Screen
        title="Mes ligues"
        subtitle="Joue, suis le classement, organise"
        headerRight={
          <Button compact icon="account-circle" onPress={onMyProfile}>
            Profil
          </Button>
        }
        noScroll
      >
        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="account-plus"
            onPress={onJoinLeague}
            style={styles.actionBtn}
          >
            Rejoindre
          </Button>
          <Button
            mode="outlined"
            icon="plus"
            onPress={onCreateLeague}
            style={styles.actionBtn}
          >
            Créer
          </Button>
        </View>

        {leagues.length === 0 ? (
          <EmptyState
            title="Pas encore de ligue"
            message="Rejoins avec un code d’ami, ou crée ta propre ligue (tu deviens admin)."
            actionLabel="Rejoindre une ligue"
            onAction={onJoinLeague}
          />
        ) : (
          <FlatList
            data={leagues}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
            }
            renderItem={({ item }) => {
              const isAdmin = user?.id === item.created_by;
              return (
                <EntityCard
                  title={item.name}
                  subtitle={item.city ?? undefined}
                  chips={isAdmin ? ['Admin'] : ['Joueur']}
                  onPress={() => onLeaguePress(item.id)}
                />
              );
            }}
          />
        )}
      </Screen>
      <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        Lambda = rejoindre · Admin = créer / inviter / saisir les matchs
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: { flex: 1 },
  list: { paddingBottom: 48 },
  hint: {
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
});
