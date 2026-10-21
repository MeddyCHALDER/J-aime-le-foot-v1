import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fonts } from '../../../theme/brand';
import { useAppTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/hooks';
import { useLeagueRoster } from '../../members/hooks';
import type { RosterPlayer } from '../../members/api';
import { awardBlurb, formatOpening, votingStarted } from '../seasonAwardsApi';
import {
  useAward,
  useAwardTally,
  useCloseAward,
  useDeleteAward,
  useMyVotes,
  useNowUntil,
  useUpdateAwardPositions,
  useVoteForPlayer,
} from '../seasonAwardsHooks';
import { isEligible, positionsLabel } from '../../cards/positions';
import { PositionPicker } from './PositionPicker';
import { ErrorState, LoadingState } from '../../../ui';
import { toErrorMessage } from '../../../lib/errors';
import { confirmAction } from '../../../lib/confirm';

interface AwardVoteScreenProps {
  awardId: string;
  leagueId: string;
  /** Après suppression du trophée par l'admin */
  onDeleted: () => void;
}

/** Recherche sans tenir compte des accents ni des majuscules. */
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Page d'un trophée : les joueurs de la ligue (du poste visé), recherche, vote en un geste. */
export function AwardVoteScreen({ awardId, leagueId, onDeleted }: AwardVoteScreenProps) {
  const { tokens, scheme } = useAppTheme();
  const { user } = useAuth();
  const award = useAward(awardId);
  const roster = useLeagueRoster(leagueId);
  const myVotes = useMyVotes([awardId], user?.id);
  const vote = useVoteForPlayer(awardId, user?.id);
  const isOpen = award.data?.is_open ?? true;
  const now = useNowUntil([award.data?.opens_at]);
  // Trophée visible mais vote pas encore commencé (ouverture programmée).
  const started = award.data ? votingStarted(award.data, now) : isOpen;
  const opensAt = isOpen && !started ? award.data?.opens_at : null;
  // Voix masquées pendant le vote pour ne pas influencer ; visibles une fois clôturé.
  const tally = useAwardTally(awardId, !isOpen);
  const close = useCloseAward(award.data?.season_id);
  const remove = useDeleteAward(award.data?.season_id);
  const savePositions = useUpdateAwardPositions(awardId, award.data?.season_id);
  const [query, setQuery] = useState('');
  // Postes en cours de modification par l'admin ; null = ceux du trophée.
  const [draftPositions, setDraftPositions] = useState<string[] | null>(null);
  // Le toucher qui ouvre la page peut retomber sur la ligne affichée au même endroit
  // et voter sans le vouloir : on ignore les touchers juste après l'ouverture.
  const openedAt = useRef(Date.now());
  const castVote = (playerId: string) => {
    if (Date.now() - openedAt.current < 600) return;
    vote.mutate(playerId);
  };

  const isAdmin = !!roster.data?.find((p) => p.player_id === user?.id && p.role === 'admin');
  const myChoice = myVotes.data?.[awardId];

  const positions = award.data?.positions ?? null;
  const eligible = useMemo(
    () => (roster.data ?? []).filter((p) => isEligible(positions, p.preferred_position)),
    [roster.data, positions]
  );

  const players = useMemo(() => {
    const q = normalize(query);
    const list = eligible.filter((p) => !q || normalize(p.display_name).includes(q));
    if (!isOpen && tally.data) {
      return [...list].sort((a, b) => (tally.data[b.player_id] ?? 0) - (tally.data[a.player_id] ?? 0));
    }
    return list;
  }, [eligible, query, isOpen, tally.data]);

  if (award.isLoading || roster.isLoading) return <LoadingState message="Chargement du vote…" />;
  if (award.error || roster.error) {
    return (
      <ErrorState
        message={toErrorMessage(award.error ?? roster.error)}
        onRetry={() => {
          award.refetch();
          roster.refetch();
        }}
      />
    );
  }
  if (!award.data) return <ErrorState message="Trophée introuvable." />;

  const blurb = awardBlurb(award.data);
  const reserved = positionsLabel(positions);
  const currentPositions = positions ?? [];
  const editedPositions = draftPositions ?? currentPositions;
  const positionsChanged =
    editedPositions.length !== currentPositions.length ||
    editedPositions.some((c) => !currentPositions.includes(c));
  const applyPositions = () =>
    savePositions.mutate(editedPositions, { onSuccess: () => setDraftPositions(null) });
  const choiceName = roster.data?.find((p) => p.player_id === myChoice)?.display_name;

  const renderPlayer = ({ item, index }: { item: RosterPlayer; index: number }) => {
    const me = item.player_id === user?.id;
    const chosen = item.player_id === myChoice;
    const votes = tally.data?.[item.player_id] ?? 0;
    const disabled = !started || me || vote.isPending;
    return (
      <Pressable
        onPress={() => castVote(item.player_id)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected: chosen, disabled }}
        accessibilityLabel={`${item.display_name}${chosen ? ', ton vote' : ''}${me ? ', toi' : ''}`}
        style={[
          styles.row,
          { backgroundColor: tokens.surface, borderColor: chosen ? tokens.lime : tokens.line },
          me && { opacity: 0.5 },
        ]}
      >
        {!isOpen ? (
          <Text style={[styles.rank, { color: tokens.muted2, fontFamily: fonts.display }]}>
            {index + 1}
          </Text>
        ) : null}
        <View style={[styles.avatar, { backgroundColor: chosen ? tokens.lime : tokens.surface2 }]}>
          <Text
            style={[
              styles.avatarText,
              { color: chosen ? tokens.onLime : tokens.text, fontFamily: fonts.display },
            ]}
          >
            {item.display_name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: tokens.text, fontFamily: fonts.body }]} numberOfLines={1}>
          {item.display_name}
          {me ? ' (toi)' : ''}
        </Text>
        {!isOpen ? (
          <Text style={[styles.votes, { color: tokens.text, fontFamily: fonts.body }]}>
            {votes} voix
          </Text>
        ) : chosen ? (
          <Text style={[styles.mine, { color: tokens.lime, fontFamily: fonts.body }]}>Ton vote</Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: tokens.ink }}
      contentContainerStyle={styles.content}
      data={players}
      keyExtractor={(p) => p.player_id}
      renderItem={renderPlayer}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: tokens.lime, fontFamily: fonts.body }]}>
            {opensAt ? 'Vote bientôt ouvert' : isOpen ? 'Vote ouvert' : 'Résultats'}
          </Text>
          <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>
            {award.data.title}
          </Text>
          {blurb ? (
            <Text style={[styles.sub, { color: tokens.muted, fontFamily: fonts.body }]}>{blurb}</Text>
          ) : null}
          {reserved ? (
            <Text style={[styles.reserved, { color: tokens.muted, fontFamily: fonts.body }]}>
              Réservé aux {reserved.toLowerCase()}. Un joueur apparaît ici selon le poste de son
              profil.
            </Text>
          ) : null}

          <View style={[styles.choice, { backgroundColor: tokens.surface, borderColor: tokens.line }]}>
            <Text style={[styles.choiceText, { color: choiceName ? tokens.lime : tokens.muted, fontFamily: fonts.body }]}>
              {choiceName
                ? `Ton vote : ${choiceName}`
                : opensAt
                  ? `Tu pourras voter à partir du ${formatOpening(opensAt)}.`
                  : isOpen
                    ? 'Touche un joueur pour voter.'
                    : 'Tu n’as pas voté.'}
            </Text>
            {started && choiceName ? (
              <Text style={[styles.choiceHint, { color: tokens.muted2, fontFamily: fonts.body }]}>
                Tu peux changer d’avis jusqu’à la clôture.
              </Text>
            ) : null}
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un joueur"
            placeholderTextColor={tokens.placeholder}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel="Rechercher un joueur"
            style={[
              styles.search,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.line,
                color: tokens.text,
                fontFamily: fonts.body,
              },
              Platform.OS === 'web' ? ({ outlineStyle: 'none', colorScheme: scheme } as object) : null,
            ]}
          />
          <Text style={[styles.count, { color: tokens.muted2, fontFamily: fonts.body }]}>
            {players.length} joueur{players.length > 1 ? 's' : ''}
            {query ? ` pour « ${query} »` : reserved ? ' éligible' + (players.length > 1 ? 's' : '') : ' dans la ligue'}
          </Text>

          {vote.error ? (
            <Text style={[styles.error, { color: tokens.errorText, fontFamily: fonts.body }]}>
              {toErrorMessage(vote.error)}
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: tokens.muted, fontFamily: fonts.body }]}>
          {query
            ? 'Aucun joueur ne correspond.'
            : reserved
              ? 'Aucun joueur de ce poste dans la ligue. Chacun renseigne son poste dans son profil.'
              : 'Aucun joueur dans la ligue pour l’instant.'}
        </Text>
      }
      ListFooterComponent={
        isAdmin ? (
          <View style={styles.adminActions}>
            {isOpen ? (
              <View style={[styles.positionsBox, { backgroundColor: tokens.surface, borderColor: tokens.line }]}>
                <Text style={[styles.positionsTitle, { color: tokens.lime, fontFamily: fonts.body }]}>
                  Postes éligibles
                </Text>
                <Text style={[styles.positionsHint, { color: tokens.muted, fontFamily: fonts.body }]}>
                  Aucun coché : tous les joueurs de la ligue.
                </Text>
                <PositionPicker
                  value={editedPositions}
                  onChange={setDraftPositions}
                  disabled={savePositions.isPending}
                />
                {positionsChanged ? (
                  <Pressable
                    onPress={() =>
                      editedPositions.length > 0
                        ? confirmAction(
                            'Changer les postes ?',
                            'Les voix déjà données à un joueur hors de ces postes seront retirées.',
                            applyPositions,
                            'Changer'
                          )
                        : applyPositions()
                    }
                    disabled={savePositions.isPending}
                    style={[styles.savePositions, { backgroundColor: tokens.lime }]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.closeText, { color: tokens.onLime, fontFamily: fonts.body }]}>
                      {savePositions.isPending ? 'Enregistrement…' : 'Enregistrer les postes'}
                    </Text>
                  </Pressable>
                ) : null}
                {savePositions.error ? (
                  <Text style={[styles.error, styles.positionsError, { color: tokens.errorText, fontFamily: fonts.body }]}>
                    {toErrorMessage(savePositions.error)}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {isOpen ? (
              <Pressable
                onPress={() => close.mutate(awardId)}
                disabled={close.isPending}
                style={[styles.close, { borderColor: tokens.line }]}
                accessibilityRole="button"
              >
                <Text style={[styles.closeText, { color: tokens.text, fontFamily: fonts.body }]}>
                  {close.isPending ? 'Clôture…' : 'Clôturer le vote et afficher les résultats'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() =>
                confirmAction(
                  `Supprimer « ${award.data!.title} » ?`,
                  'Le trophée et tous ses votes seront définitivement supprimés.',
                  () => remove.mutate(awardId, { onSuccess: onDeleted }),
                  'Supprimer'
                )
              }
              disabled={remove.isPending}
              style={[styles.close, { borderColor: tokens.errorText }]}
              accessibilityRole="button"
            >
              <Text style={[styles.closeText, { color: tokens.errorText, fontFamily: fonts.body }]}>
                {remove.isPending ? 'Suppression…' : 'Supprimer ce trophée'}
              </Text>
            </Pressable>
            {remove.error ? (
              <Text style={[styles.error, { color: tokens.errorText, fontFamily: fonts.body }]}>
                {toErrorMessage(remove.error)}
              </Text>
            ) : null}
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 32 },
  header: { marginBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  title: { fontSize: 32, fontStyle: 'italic', fontWeight: '700', lineHeight: 36, marginTop: 6 },
  sub: { fontSize: 15, marginTop: 4 },
  reserved: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  choice: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 16 },
  choiceText: { fontSize: 15, fontWeight: '700' },
  choiceHint: { fontSize: 12, marginTop: 4 },
  search: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    marginTop: 16,
  },
  count: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  error: { fontSize: 13, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rank: { width: 22, fontSize: 16, fontStyle: 'italic', fontWeight: '700', textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontStyle: 'italic', fontWeight: '700' },
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
  votes: { fontSize: 14, fontWeight: '700' },
  mine: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 24 },
  close: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  closeText: { fontSize: 14, fontWeight: '700' },
  adminActions: { marginTop: 8 },
  positionsBox: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 16 },
  positionsTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  positionsHint: { fontSize: 13, marginTop: 4, marginBottom: 12 },
  savePositions: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  positionsError: { marginTop: 10, marginBottom: 0 },
});
