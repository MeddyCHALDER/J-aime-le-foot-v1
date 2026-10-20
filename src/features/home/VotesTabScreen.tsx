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
import { MiniPlayerCard } from '../cards/MiniPlayerCard';
import { awardBlurb } from '../awards/seasonAwardsApi';
import {
  useCreateAward,
  useMyLineups,
  useMyVotes,
  useOpenSeasonAwards,
  useSeasonAwards,
} from '../awards/seasonAwardsHooks';
import { EmptyState, LoadingState, ErrorState, Appear } from '../../ui';
import { toErrorMessage } from '../../lib/errors';
import { useHomeContext } from './useHomeContext';
import { LINEUP_FORMATS, formatOf } from '../awards/formations';

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
  const myLineups = useMyLineups(
    (awards.data ?? []).filter((a) => a.kind === 'lineup').map((a) => a.id),
    user?.id
  );
  const openAwards = useOpenSeasonAwards();
  const createAward = useCreateAward(season?.id);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [newKind, setNewKind] = useState<'single' | 'lineup'>('single');
  const [newSize, setNewSize] = useState(11);
  const [newFormation, setNewFormation] = useState(formatOf(11).formations[0]);

  const isAdmin = !!user?.id && !!league && user.id === league.created_by;
  const playerOf = (playerId: string) => roster.data?.find((p) => p.player_id === playerId);
  const nameOf = (playerId: string) => playerOf(playerId)?.display_name ?? 'Joueur';

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
  const votedFor = (a: (typeof list)[number]) =>
    a.kind === 'lineup' ? !!myLineups.data?.[a.id] : !!myVotes.data?.[a.id];
  const voted = list.filter(votedFor).length;

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
          {list.map((award, i) => {
            const blurb = awardBlurb(award);
            const isLineup = award.kind === 'lineup';
            const choice = isLineup ? undefined : myVotes.data?.[award.id];
            const chosen = choice ? playerOf(choice) : undefined;
            const lineupDone = isLineup && !!myLineups.data?.[award.id];
            return (
              <Appear key={award.id} index={i}>
              <Pressable
                onPress={() => onAwardPress(award.id, league.id)}
                accessibilityRole="button"
                accessibilityLabel={`${award.title}, ${choice ? `ton vote : ${nameOf(choice)}` : lineupDone ? 'ton équipe est votée' : 'pas encore voté'}`}
                style={[styles.card, { backgroundColor: tokens.surface, borderColor: choice || lineupDone ? tokens.lime : tokens.line }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: tokens.text, fontFamily: fonts.display }]}>
                    {award.title}
                  </Text>
                  {isLineup ? (
                    <Text style={[styles.cardSub, { color: tokens.muted, fontFamily: fonts.body }]}>
                      Équipe type · {award.lineup_size} joueurs · {award.formation}
                    </Text>
                  ) : blurb ? (
                    <Text style={[styles.cardSub, { color: tokens.muted, fontFamily: fonts.body }]}>
                      {blurb}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.cardChoice,
                      { color: choice || lineupDone ? tokens.lime : tokens.muted2, fontFamily: fonts.body },
                    ]}
                  >
                    {choice
                      ? `Ton vote : ${nameOf(choice)}`
                      : lineupDone
                        ? 'Ton équipe est votée'
                        : award.is_open
                          ? isLineup
                            ? 'Compose ton équipe'
                            : 'À voter'
                          : 'Pas de vote'}
                  </Text>
                </View>
                {chosen ? (
                  <MiniPlayerCard
                    size="xs"
                    displayName={chosen.display_name}
                    avatarUrl={chosen.avatar_url}
                    overall={chosen.overall}
                    position={chosen.preferred_position}
                  />
                ) : null}
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
              </Appear>
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
              <View style={styles.kindRow}>
                {(
                  [
                    ['single', 'Un joueur'],
                    ['lineup', 'Équipe type'],
                  ] as const
                ).map(([k, label]) => {
                  const on = newKind === k;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setNewKind(k)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[
                        styles.kindBtn,
                        { borderColor: on ? tokens.lime : tokens.line },
                        on && { backgroundColor: tokens.lime },
                      ]}
                    >
                      <Text style={[styles.kindText, { color: on ? tokens.onLime : tokens.text, fontFamily: fonts.body }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {newKind === 'lineup' ? (
                <>
                  <Text style={[styles.pickLabel, { color: tokens.muted, fontFamily: fonts.body }]}>Format</Text>
                  <View style={styles.chips}>
                    {LINEUP_FORMATS.map((f) => {
                      const on = newSize === f.size;
                      return (
                        <Pressable
                          key={f.size}
                          onPress={() => {
                            setNewSize(f.size);
                            setNewFormation(f.formations[0]);
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          style={[styles.chip, { borderColor: on ? tokens.lime : tokens.line }]}
                        >
                          <Text style={[styles.chipText, { color: on ? tokens.lime : tokens.text, fontFamily: fonts.body }]}>
                            {f.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={[styles.pickLabel, { color: tokens.muted, fontFamily: fonts.body }]}>Formation</Text>
                  <View style={styles.chips}>
                    {formatOf(newSize).formations.map((f) => {
                      const on = newFormation === f;
                      return (
                        <Pressable
                          key={f}
                          onPress={() => setNewFormation(f)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          style={[styles.chip, { borderColor: on ? tokens.lime : tokens.line }]}
                        >
                          <Text style={[styles.chipText, { color: on ? tokens.lime : tokens.text, fontFamily: fonts.body }]}>
                            {f}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder={newKind === 'lineup' ? `Nom (ex. Meilleur ${newSize} de la saison)` : 'Nom du trophée (ex. Meilleur tacle)'}
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
              <Pressable
                onPress={async () => {
                  if (!newTitle.trim()) return;
                  await createAward.mutateAsync({
                    title: newTitle,
                    description: newDesc,
                    lineup: newKind === 'lineup' ? { size: newSize, formation: newFormation } : undefined,
                  });
                  setNewTitle('');
                  setNewDesc('');
                  setFormOpen(false);
                }}
                disabled={!newTitle.trim() || createAward.isPending}
                style={[
                  styles.primary,
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
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kindBtn: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kindText: { fontSize: 14, fontWeight: '700' },
  pickLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, height: 34, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '700' },
});
