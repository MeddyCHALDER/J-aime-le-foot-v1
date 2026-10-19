import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { useAuth } from '../auth/hooks';
import { AwardsVoteTab } from '../awards/components/AwardsVoteTab';
import { EmptyState, LoadingState, ErrorState } from '../../ui';
import { toErrorMessage } from '../../lib/errors';
import { useHomeContext } from './useHomeContext';

export function VotesTabScreen() {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  const { user } = useAuth();
  const { league, season, isLoading, error, refetch } = useHomeContext();

  const isAdmin = !!user?.id && !!league && user.id === league.created_by;

  if (isLoading) return <LoadingState message="Chargement des votes…" />;
  if (error) return <ErrorState message={toErrorMessage(error)} onRetry={() => refetch()} />;

  if (!league || !season) {
    return (
      <View style={[styles.root, { backgroundColor: tokens.ink, paddingTop: insets.top + 16 }]}>
        <Text style={[styles.eyebrow, { color: tokens.lime, fontFamily: fonts.body }]}>Votes</Text>
        <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>
          For the Best
        </Text>
        <EmptyState
          title="Pas encore de ligue"
          message="Rejoins ou crée une ligue pour voter aux trophées de fin de saison."
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.ink }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 8,
          paddingBottom: 24,
        }}
      >
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: tokens.lime, fontFamily: fonts.body }]}>
            {league.name}
          </Text>
          <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>
            Votes
          </Text>
          <Text style={[styles.sub, { color: tokens.muted, fontFamily: fonts.body }]}>
            Ballon d’Or, For the Best — un vote par trophée.
          </Text>
        </View>
        <AwardsVoteTab seasonId={season.id} leagueId={league.id} isAdmin={isAdmin} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 14, marginBottom: 8 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 34,
    fontStyle: 'italic',
    fontWeight: '700',
    lineHeight: 36,
    marginTop: 8,
  },
  sub: { marginTop: 8, fontSize: 15, lineHeight: 22, maxWidth: 300 },
});
