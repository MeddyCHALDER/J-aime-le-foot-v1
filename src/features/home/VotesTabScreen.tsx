import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { useAuth } from '../auth/hooks';
import { useLeagueRoster } from '../members/hooks';
import { AWARD_CATALOG } from '../awards/seasonAwardsApi';
import { useMyVotes, useOpenSeasonAwards, useSeasonAwards } from '../awards/seasonAwardsHooks';
import { EmptyState, LoadingState, ErrorState } from '../../ui';
import { toErrorMessage } from '../../lib/errors';
import { useHomeContext } from './useHomeContext';

interface VotesTabScreenProps {
  onAwardPress: (awardId: string, leagueId: string) => void;
}

/** Liste des trophées : un clic ouvre la page de vote du trophée. */
export function VotesTabScreen({ onAwardPress }: VotesTabScreenProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  const { user } = useAuth();
  const { league, season, isLoading, error, refetch } = useHomeContext();
  const awards = useSeasonAwards(season?.id);
  const roster = useLeagueRoster(league?.id);
  const myVotes = useMyVotes(
    (awards.data ?? []).map((a) => a.id),
    user?.id
  );
  const openAwards = useOpenSeasonAwards();

  const isAdmin = !!user?.id && !!league && user.id === league.created_by;
  const nameOf = (playerId: string) =>
    roster.data?.find((p) => p.player_id === playerId)?.display_name ?? 'Joueur';

  if (isLoading || awards.isLoading) return <LoadingState message="Chargement des votes…" />;
  if (error) return <ErrorState message={toErrorMessage(error)} onRetry={() => refetch()} />;

  const header = (
    <View style={styles.header}>
      <Text style={[styles.eyebrow, { color: tokens.lime, fontFamily: fonts.body }]}>
        {league?.name ?? 'Votes'}
      </Text>
      <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>Votes</Text>
      <Text style={[styles.sub, { color: tokens.muted, fontFamily: fonts.body }]}>
        Un vote par trophée, parmi tous les joueurs de la ligue. Tu peux changer d’avis tant que le
        vote est ouvert.
      </Text>
    </View>
  );

  if (!league || !season) {
    return (
      <View style={[styles.root, { backgroundColor: tokens.ink, paddingTop: insets.top + 16 }]}>
        {header}
        <EmptyState
          title="Pas encore de ligue"
          message="Rejoins ou crée une ligue pour voter aux trophées de fin de saison."
        />
      </View>
    );
  }

  const list = awards.data ?? [];
  const voted = list.filter((a) => myVotes.data?.[a.id]).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.ink }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 22, paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          tintColor={tokens.lime}
          onRefresh={() => {
            awards.refetch();
            myVotes.refetch();
          }}
        />
      }
    >
      {header}

      {list.length === 0 ? (
        <View>
          <EmptyState
            title="Votes pas encore ouverts"
            message={
              isAdmin
                ? 'Ouvre les votes : chaque joueur de la ligue pourra voter pour les trophées.'
                : 'L’admin ouvre les votes en fin de saison.'
            }
          />
          {isAdmin ? (
            <Pressable
              onPress={() => openAwards.mutate({ seasonId: season.id, playerIds: [] })}
              disabled={openAwards.isPending}
              style={[styles.primary, { backgroundColor: tokens.lime }]}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryText, { color: tokens.onLime, fontFamily: fonts.body }]}>
                {openAwards.isPending ? 'Ouverture…' : 'Ouvrir les votes'}
              </Text>
            </Pressable>
          ) : null}
          {openAwards.error ? (
            <Text style={[styles.error, { color: tokens.errorText, fontFamily: fonts.body }]}>
              {toErrorMessage(openAwards.error)}
            </Text>
          ) : null}
        </View>
      ) : (
        <>
          <Text style={[styles.progress, { color: tokens.muted2, fontFamily: fonts.body }]}>
            {voted}/{list.length} trophées votés
          </Text>
          {list.map((award) => {
            const cat = AWARD_CATALOG.find((c) => c.type === award.type);
            const choice = myVotes.data?.[award.id];
            return (
              <Pressable
                key={award.id}
                onPress={() => onAwardPress(award.id, league.id)}
                accessibilityRole="button"
                accessibilityLabel={`${award.title}, ${choice ? `ton vote : ${nameOf(choice)}` : 'pas encore voté'}`}
                style={[styles.card, { backgroundColor: tokens.surface, borderColor: choice ? tokens.lime : tokens.line }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: tokens.text, fontFamily: fonts.display }]}>
                    {award.title}
                  </Text>
                  {cat ? (
                    <Text style={[styles.cardSub, { color: tokens.muted, fontFamily: fonts.body }]}>
                      {cat.blurb}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.cardChoice,
                      { color: choice ? tokens.lime : tokens.muted2, fontFamily: fonts.body },
                    ]}
                  >
                    {choice ? `Ton vote : ${nameOf(choice)}` : award.is_open ? 'À voter' : 'Pas de vote'}
                  </Text>
                </View>
                <View style={[styles.badge, { borderColor: award.is_open ? tokens.lime : tokens.line }]}>
                  <Text
                    style={[
                      styles.badgeText,
                      { color: award.is_open ? tokens.lime : tokens.muted, fontFamily: fonts.body },
                    ]}
                  >
                    {award.is_open ? 'Ouvert' : 'Résultats'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 22 },
  header: { marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  title: { fontSize: 34, fontStyle: 'italic', fontWeight: '700', lineHeight: 36, marginTop: 8 },
  sub: { marginTop: 8, fontSize: 15, lineHeight: 22, maxWidth: 320 },
  progress: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 20, fontStyle: 'italic', fontWeight: '700' },
  cardSub: { fontSize: 13, marginTop: 2 },
  cardChoice: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  primary: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryText: { fontSize: 15, fontWeight: '700' },
  error: { marginTop: 10, fontSize: 13 },
});
