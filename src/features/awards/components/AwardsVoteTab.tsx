import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, List, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../../auth/hooks';
import { useLeagueMembers } from '../../members/hooks';
import {
  useAwardNominations,
  useCastAwardVote,
  useMyAwardVote,
  useOpenSeasonAwards,
  useSeasonAwards,
} from '../seasonAwardsHooks';
import { AWARD_CATALOG } from '../seasonAwardsApi';
import { EmptyState, ErrorState, LoadingState, SectionHeader } from '../../../ui';

interface AwardsVoteTabProps {
  seasonId: string;
  leagueId: string;
  isAdmin: boolean;
}

export function AwardsVoteTab({ seasonId, leagueId, isAdmin }: AwardsVoteTabProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { data: awards = [], isLoading, error, refetch, isRefetching } = useSeasonAwards(seasonId);
  const { data: members = [] } = useLeagueMembers(leagueId);
  const openAwards = useOpenSeasonAwards();
  const [selectedAwardId, setSelectedAwardId] = useState<string | null>(null);

  const selected = awards.find((a) => a.id === selectedAwardId) ?? awards[0] ?? null;

  const openAll = async () => {
    let playerIds = members.map((m) => m.player_id);
    if (playerIds.length === 0 && user?.id) {
      // Fallback si pas encore de league_members (schéma legacy)
      playerIds = [user.id];
    }
    await openAwards.mutateAsync({ seasonId, playerIds });
    refetch();
  };

  if (isLoading) return <LoadingState message="Chargement des trophées…" />;
  if (error) return <ErrorState message={String(error)} onRetry={() => refetch()} />;

  if (awards.length === 0) {
    return (
      <View style={styles.pad}>
        <EmptyState
          title="Palmarès pas encore ouvert"
          message="L’admin lance les votes For the Best / Ballon d’Or en fin de saison."
          actionLabel={isAdmin ? 'Ouvrir les votes' : undefined}
          onAction={isAdmin ? openAll : undefined}
        />
        {isAdmin ? (
          <Button
            mode="contained"
            loading={openAwards.isPending}
            onPress={openAll}
            style={styles.btn}
          >
            Ouvrir trophées + nominés
          </Button>
        ) : null}
      </View>
    );
  }

  return (
    <FlatList
      data={awards}
      keyExtractor={(a) => a.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          <SectionHeader title="Trophées & For the Best" />
          <Text variant="bodySmall" style={styles.hint}>
            Un vote par trophée. Les nominés sont les membres de la ligue.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const cat = AWARD_CATALOG.find((c) => c.type === item.type);
        const active = (selected?.id ?? '') === item.id;
        return (
          <List.Item
            title={item.title}
            description={cat?.blurb ?? (item.is_open ? 'Vote ouvert' : 'Clôturé')}
            left={(p) => <List.Icon {...p} icon="trophy" color={theme.colors.primary} />}
            right={() => (
              <Text variant="labelSmall" style={{ alignSelf: 'center', opacity: 0.7 }}>
                {item.is_open ? 'Ouvert' : 'Clos'}
              </Text>
            )}
            onPress={() => setSelectedAwardId(item.id)}
            style={[styles.row, active && { backgroundColor: theme.colors.surfaceVariant }]}
          />
        );
      }}
      ListFooterComponent={
        selected && user?.id ? (
          <AwardBallot
            awardId={selected.id}
            awardTitle={selected.title}
            isOpen={selected.is_open}
            voterId={user.id}
          />
        ) : null
      }
    />
  );
}

function AwardBallot({
  awardId,
  awardTitle,
  isOpen,
  voterId,
}: {
  awardId: string;
  awardTitle: string;
  isOpen: boolean;
  voterId: string;
}) {
  const { data: nominations = [], isLoading, refetch } = useAwardNominations(awardId);
  const { data: myVote } = useMyAwardVote(awardId, voterId);
  const cast = useCastAwardVote();
  const sorted = [...nominations].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));

  if (isLoading) return <LoadingState message="Nominés…" />;

  return (
    <View style={styles.ballot}>
      <Text variant="titleMedium" style={styles.ballotTitle}>
        Voter · {awardTitle}
      </Text>
      {sorted.map((n) => {
        const mine = myVote?.nomination_id === n.id;
        return (
          <List.Item
            key={n.id}
            title={n.profile?.display_name ?? n.player_id.slice(0, 6)}
            description={`${n.vote_count ?? 0} voix`}
            onPress={
              isOpen
                ? async () => {
                    await cast.mutateAsync({
                      awardId,
                      nominationId: n.id,
                      voterId,
                    });
                    refetch();
                  }
                : undefined
            }
            right={() =>
              mine ? (
                <Text variant="labelMedium" style={styles.mine}>
                  Ton vote
                </Text>
              ) : null
            }
            style={mine ? styles.mineRow : undefined}
          />
        );
      })}
      {!isOpen ? (
        <Text variant="bodySmall" style={styles.hint}>
          Vote clôturé.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16 },
  list: { paddingBottom: 48 },
  hint: { opacity: 0.7, marginBottom: 12, paddingHorizontal: 4 },
  btn: { marginTop: 8 },
  row: { marginBottom: 2 },
  ballot: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.12)',
  },
  ballotTitle: { marginBottom: 8, paddingHorizontal: 4 },
  mine: { alignSelf: 'center', color: '#000', fontWeight: '700' },
  mineRow: { backgroundColor: 'rgba(201,255,0,0.25)' },
});
