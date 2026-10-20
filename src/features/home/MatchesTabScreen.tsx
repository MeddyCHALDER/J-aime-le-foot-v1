import React, { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { LoadingState, ErrorState, EmptyState } from '../../ui';
import { toErrorMessage } from '../../lib/errors';
import { useHomeContext } from './useHomeContext';
import { useAuth } from '../auth/hooks';
import { AttendanceQuick } from '../attendance/AttendanceQuick';
import type { Match } from '../../types/entities';

function formatDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'À venir',
  played: 'Terminé',
  postponed: 'Reporté',
  cancelled: 'Annulé',
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

interface MatchesTabScreenProps {
  onMatchPress: (matchId: string) => void;
  onCreateLeague: () => void;
  onJoinLeague: () => void;
  onCreateMatch: (leagueId: string, seasonId: string) => void;
}

export function MatchesTabScreen({
  onMatchPress,
  onCreateLeague,
  onJoinLeague,
  onCreateMatch,
}: MatchesTabScreenProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  const { league, season, matches, featured, isLoading, error, refetch } = useHomeContext();
  const { user } = useAuth();
  // Seul le gérant de la ligue crée des matchs (RLS côté Supabase).
  const isAdmin = !!user?.id && league?.created_by === user.id;

  const rest = useMemo(
    () => matches.filter((m) => m.id !== featured?.id).slice(0, 12),
    [matches, featured]
  );

  if (isLoading) return <LoadingState message="Chargement des matchs…" />;
  if (error) return <ErrorState message={toErrorMessage(error)} onRetry={() => refetch()} />;

  if (!league) {
    return (
      <View style={[styles.root, { backgroundColor: tokens.ink, paddingTop: insets.top + 16 }]}>
        <Text style={[styles.eyebrow, { color: tokens.lime, fontFamily: fonts.body }]}>
          J&apos;aime le foot
        </Text>
        <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>Matchs</Text>
        <EmptyState
          title="Pas encore de club"
          message="Crée une ligue ou rejoins avec un code d’invitation."
        />
        <View style={styles.row}>
          <Pressable
            onPress={onJoinLeague}
            style={[styles.btn, { backgroundColor: tokens.lime }]}
          >
            <Text style={[styles.btnText, { color: tokens.onLime, fontFamily: fonts.body }]}>
              Rejoindre
            </Text>
          </Pressable>
          <Pressable
            onPress={onCreateLeague}
            style={[styles.btnOutline, { borderColor: tokens.line }]}
          >
            <Text style={[styles.btnText, { color: tokens.text, fontFamily: fonts.body }]}>
              Créer
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.ink }]}>
      <FlatList
        data={rest}
        keyExtractor={(m) => m.id}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={tokens.lime} />
        }
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 22,
          paddingBottom: 24,
          gap: 10,
        }}
        ListHeaderComponent={
          <View style={{ gap: 18, marginBottom: 8 }}>
            <View>
              <Text style={[styles.eyebrow, { color: tokens.lime, fontFamily: fonts.body }]}>
                {league.name}
              </Text>
              <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>
                Matchs
              </Text>
              <Text style={[styles.sub, { color: tokens.muted, fontFamily: fonts.body }]}>
                Inscris-toi, joue, fais bouger ta carte.
              </Text>
            </View>

            {featured ? (
              <Pressable
                onPress={() => onMatchPress(featured.id)}
                style={[styles.featured, { backgroundColor: tokens.surface, borderColor: tokens.line }]}
              >
                <Text style={[styles.pill, { color: tokens.lime, fontFamily: fonts.body }]}>
                  {featured.status === 'played' ? 'Terminé' : 'Prochain'}
                </Text>
                <Text style={[styles.featDay, { color: tokens.text, fontFamily: fonts.display }]}>
                  {formatDay(featured.kickoff_at)}
                </Text>
                <Text style={[styles.featTime, { color: tokens.muted, fontFamily: fonts.body }]}>
                  {formatTime(featured.kickoff_at)}
                  {featured.location ? ` · ${featured.location}` : ''}
                </Text>
                {featured.status === 'played' ? (
                  <Text style={[styles.score, { color: tokens.text, fontFamily: fonts.display }]}>
                    {featured.home_score} – {featured.away_score}
                  </Text>
                ) : (
                  <AttendanceQuick
                    matchId={featured.id}
                    registrationOpensAt={featured.registration_opens_at}
                  />
                )}
              </Pressable>
            ) : (
              <EmptyState title="Aucun match" message="Le prochain match apparaîtra ici." />
            )}

            {season && isAdmin ? (
              <Pressable
                onPress={() => onCreateMatch(league.id, season.id)}
                // styles.btn (flex: 1, base 0) est pensé pour une rangée ; en colonne il écrasait la hauteur.
                style={[
                  styles.btn,
                  {
                    backgroundColor: tokens.lime,
                    alignSelf: 'stretch',
                    flexGrow: 0,
                    flexShrink: 0,
                    flexBasis: 'auto',
                  },
                ]}
              >
                <Text style={[styles.btnText, { color: tokens.onLime, fontFamily: fonts.body }]}>
                  Nouveau match
                </Text>
              </Pressable>
            ) : null}

            {rest.length > 0 ? (
              <Text style={[styles.section, { color: tokens.muted2, fontFamily: fonts.body }]}>
                À venir
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }: { item: Match }) => (
          <Pressable
            onPress={() => onMatchPress(item.id)}
            style={[styles.rowCard, { backgroundColor: tokens.surface, borderColor: tokens.line }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: tokens.text, fontFamily: fonts.body }]}>
                {formatDay(item.kickoff_at)}
              </Text>
              <Text style={[styles.rowSub, { color: tokens.muted, fontFamily: fonts.body }]}>
                {formatTime(item.kickoff_at)}
                {item.location ? ` · ${item.location}` : ''}
              </Text>
            </View>
            {item.status === 'played' ? (
              <Text style={[styles.scoreSm, { color: tokens.text, fontFamily: fonts.display }]}>
                {item.home_score}-{item.away_score}
              </Text>
            ) : (
              <Text style={[styles.pill, { color: tokens.lime, fontFamily: fonts.body }]}>
                {STATUS_LABEL[item.status] ?? item.status}
              </Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    letterSpacing: -0.2,
  },
  sub: { marginTop: 8, fontSize: 15, lineHeight: 22, maxWidth: 280 },
  featured: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 6,
  },
  pill: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  featDay: { fontSize: 28, fontStyle: 'italic', fontWeight: '700' },
  featTime: { fontSize: 14 },
  score: { fontSize: 32, fontStyle: 'italic', fontWeight: '700', marginTop: 8 },
  scoreSm: { fontSize: 18, fontStyle: 'italic', fontWeight: '700' },
  section: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 22, marginTop: 16 },
  btn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    flex: 1,
  },
  btnOutline: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    flex: 1,
  },
  btnText: { fontSize: 15, fontWeight: '700' },
});
