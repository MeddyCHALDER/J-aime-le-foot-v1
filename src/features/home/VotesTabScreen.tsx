import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { useAuth } from '../auth/hooks';
import { useLeagueRoster } from '../members/hooks';
import { awardBlurb } from '../awards/seasonAwardsApi';
import {
  useCreateAward,
  useMyVotes,
  useOpenSeasonAwards,
  useSeasonAwards,
} from '../awards/seasonAwardsHooks';
import { PositionPicker } from '../awards/components/PositionPicker';
import { positionsLabel } from '../cards/positions';
import { EmptyState, LoadingState, ErrorState } from '../../ui';
import { toErrorMessage } from '../../lib/errors';
import { useHomeContext } from './useHomeContext';

interface VotesTabScreenProps {
  onAwardPress: (awardId: string, leagueId: string) => void;
}

/** Liste des trophées : un clic ouvre la page de vote du trophée. */
export function VotesTabScreen({ onAwardPress }: VotesTabScreenProps) {
  const insets = useSafeAreaInsets();
  const { tokens, scheme } = useAppTheme();
  const { user } = useAuth();
  const { league, season, isLoading, error, refetch } = useHomeContext();
  const awards = useSeasonAwards(season?.id);
  const roster = useLeagueRoster(league?.id);
  const myVotes = useMyVotes(
    (awards.data ?? []).map((a) => a.id),
    user?.id
  );
  const openAwards = useOpenSeasonAwards();
  const createAward = useCreateAward(season?.id);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPositions, setNewPositions] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const isAdmin = !!user?.id && !!league && user.id === league.created_by;
  const nameOf = (playerId: string) =>
    roster.data?.find((p) => p.player_id === playerId)?.display_name ?? 'Joueur';

  const inputColors = [
    {
      backgroundColor: tokens.ink,
      borderColor: tokens.line,
      color: tokens.text,
      fontFamily: fonts.body,
    },
    Platform.OS === 'web' ? ({ outlineStyle: 'none', colorScheme: scheme } as object) : null,
  ];

  if (isLoading || awards.isLoading) return <LoadingState message="Chargement des votes…" />;
  if (error) return <ErrorState message={toErrorMessage(error)} onRetry={() => refetch()} />;

  const header = (
    <View style={styles.header}>
      <Text style={[styles.eyebrow, { color: tokens.lime, fontFamily: fonts.body }]}>
        {league?.name ?? 'Votes'}
      </Text>
      <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>Votes</Text>
      <Text style={[styles.sub, { color: tokens.muted, fontFamily: fonts.body }]}>
        Un vote par trophée, parmi les joueurs de la ligue (certains trophées sont réservés à des
        postes). Tu peux changer d’avis tant que le vote est ouvert.
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
        <EmptyState
          title="Aucun trophée pour l’instant"
          message={
            isAdmin
              ? 'Crée les trophées de la saison avec tes propres noms, ou pars des classiques.'
              : 'L’admin crée les trophées de la saison.'
          }
        />
      ) : (
        <>
          <Text style={[styles.progress, { color: tokens.muted2, fontFamily: fonts.body }]}>
            {voted}/{list.length} trophées votés
          </Text>
          {list.map((award) => {
            const blurb = awardBlurb(award);
            const choice = myVotes.data?.[award.id];
            const reserved = positionsLabel(award.positions);
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
                  {blurb ? (
                    <Text style={[styles.cardSub, { color: tokens.muted, fontFamily: fonts.body }]}>
                      {blurb}
                    </Text>
                  ) : null}
                  {reserved ? (
                    <Text style={[styles.cardReserved, { color: tokens.muted2, fontFamily: fonts.body }]}>
                      {reserved} uniquement
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
      {isAdmin ? (
        <View style={[styles.adminBox, { borderColor: tokens.line, backgroundColor: tokens.surface }]}>
          {formOpen || list.length === 0 ? (
            <>
              <Text style={[styles.adminTitle, { color: tokens.lime, fontFamily: fonts.body }]}>
                Nouveau trophée
              </Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Nom du trophée (ex. Meilleur tacle)"
                placeholderTextColor={tokens.placeholder}
                maxLength={60}
                accessibilityLabel="Nom du trophée"
                style={[styles.input, inputColors]}
              />
              <TextInput
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="Description (optionnel)"
                placeholderTextColor={tokens.placeholder}
                maxLength={120}
                accessibilityLabel="Description du trophée"
                style={[styles.input, inputColors]}
              />
              <Text style={[styles.fieldLabel, { color: tokens.muted, fontFamily: fonts.body }]}>
                Postes éligibles · aucun coché = tous les joueurs
              </Text>
              <PositionPicker
                value={newPositions}
                onChange={setNewPositions}
                disabled={createAward.isPending}
              />
              <Pressable
                onPress={async () => {
                  if (!newTitle.trim()) return;
                  await createAward.mutateAsync({
                    title: newTitle,
                    description: newDesc,
                    positions: newPositions,
                  });
                  setNewTitle('');
                  setNewDesc('');
                  setNewPositions([]);
                  setFormOpen(false);
                }}
                disabled={!newTitle.trim() || createAward.isPending}
                style={[
                  styles.primary,
                  styles.primarySpaced,
                  { backgroundColor: tokens.lime },
                  (!newTitle.trim() || createAward.isPending) && { opacity: 0.5 },
                ]}
                accessibilityRole="button"
              >
                <Text style={[styles.primaryText, { color: tokens.onLime, fontFamily: fonts.body }]}>
                  {createAward.isPending ? 'Création…' : 'Créer le trophée'}
                </Text>
              </Pressable>
              {list.length === 0 ? (
                <Pressable
                  onPress={() => openAwards.mutate({ seasonId: season.id, playerIds: [] })}
                  disabled={openAwards.isPending}
                  style={[styles.secondary, { borderColor: tokens.line }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.secondaryText, { color: tokens.text, fontFamily: fonts.body }]}>
                    {openAwards.isPending ? 'Ajout…' : 'Ajouter les trophées classiques'}
                  </Text>
                </Pressable>
              ) : null}
              {createAward.error || openAwards.error ? (
                <Text style={[styles.error, { color: tokens.errorText, fontFamily: fonts.body }]}>
                  {toErrorMessage(createAward.error ?? openAwards.error)}
                </Text>
              ) : null}
            </>
          ) : (
            <Pressable onPress={() => setFormOpen(true)} accessibilityRole="button" style={styles.addRow}>
              <Text style={[styles.addText, { color: tokens.lime, fontFamily: fonts.body }]}>
                + Ajouter un trophée
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
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
  cardReserved: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 6,
  },
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
  primarySpaced: { marginTop: 16 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  primaryText: { fontSize: 15, fontWeight: '700' },
  error: { marginTop: 10, fontSize: 13 },
  adminBox: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 8 },
  adminTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  secondary: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryText: { fontSize: 14, fontWeight: '700' },
  addRow: { alignItems: 'center', paddingVertical: 4 },
  addText: { fontSize: 15, fontWeight: '700' },
});
