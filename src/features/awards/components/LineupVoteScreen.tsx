import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../../theme/brand';
import { useAppTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/hooks';
import { useLeagueRoster } from '../../members/hooks';
import { isActivePlayer, type RosterPlayer } from '../../members/api';
import { MiniPlayerCard } from '../../cards/MiniPlayerCard';
import { formatOpening, votingStarted, type LineupSlots, type SeasonAward } from '../seasonAwardsApi';
import {
  useCastLineupVote,
  useNowUntil,
  useWithdrawVote,
  useCloseAward,
  useDeleteAward,
  useLineupResults,
  useMyLineups,
  useSetLineupFormat,
} from '../seasonAwardsHooks';
import { LINEUP_FORMATS, formatOf, formationSlots, type PitchSlot } from '../formations';
import { LoadingState } from '../../../ui';
import { AwardOpeningEditor } from './OpeningPicker';
import { lineOf, POSITIONS } from '../../cards/positions';
import { toErrorMessage } from '../../../lib/errors';
import { confirmAction } from '../../../lib/confirm';

interface LineupVoteScreenProps {
  award: SeasonAward;
  leagueId: string;
  onDeleted: () => void;
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Équipe type : le votant place des joueurs de la ligue sur un terrain. */
export function LineupVoteScreen({ award, leagueId, onDeleted }: LineupVoteScreenProps) {
  const { tokens, scheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const roster = useLeagueRoster(leagueId);
  const mine = useMyLineups([award.id], user?.id);
  const cast = useCastLineupVote(award.id);
  const withdraw = useWithdrawVote(award.id);
  const setFormat = useSetLineupFormat(award.id, award.season_id);
  const close = useCloseAward(award.season_id);
  const remove = useDeleteAward(award.season_id);
  const isOpen = award.is_open;
  const now = useNowUntil([award.opens_at]);
  // Ouverture programmée : on peut composer, pas encore valider
  const opensAt = isOpen && !votingStarted(award, now) ? award.opens_at : null;
  const results = useLineupResults(award.id, !isOpen);

  const formation = award.formation ?? formatOf(award.lineup_size ?? 11).formations[0];
  const slots = useMemo(() => formationSlots(formation), [formation]);
  const size = slots.length;

  const [draft, setDraft] = useState<LineupSlots>({});
  const [picking, setPicking] = useState<PitchSlot | null>(null);
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);

  // Repart de la compo enregistrée (et la réinitialise si le format a changé)
  const savedSlots = mine.data?.[award.id];
  useEffect(() => {
    const valid = Object.fromEntries(
      Object.entries(savedSlots ?? {}).filter(([k]) => slots.some((s) => s.key === k))
    );
    setDraft(valid);
  }, [savedSlots, slots]);

  const isAdmin = !!roster.data?.find((p) => p.player_id === user?.id && p.role === 'admin');
  const playerOf = (id: string | undefined) => roster.data?.find((p) => p.player_id === id);
  const placedIds = new Set(Object.values(draft));
  const filled = slots.filter((s) => draft[s.key]).length;
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedSlots ?? {});

  // Résultats : pour chaque poste, le joueur le plus voté, un joueur ne pouvant gagner qu'un poste
  const winners = useMemo(() => {
    const rows = [...(results.data ?? [])].sort((a, b) => b.votes - a.votes);
    const bySlot: Record<string, { player_id: string; votes: number }> = {};
    const used = new Set<string>();
    for (const r of rows) {
      if (bySlot[r.slot] || used.has(r.player_id)) continue;
      if (!slots.some((s) => s.key === r.slot)) continue;
      bySlot[r.slot] = { player_id: r.player_id, votes: r.votes };
      used.add(r.player_id);
    }
    return bySlot;
  }, [results.data, slots]);
  const voters = results.data?.[0]?.voters ?? 0;

  // Seuls les joueurs de la ligne du poste touché (un poste MIL ne propose que MDC / MC / MOC)
  const candidates = useMemo(() => {
    const q = normalize(query);
    const line = picking?.label;
    return (roster.data ?? []).filter(
      (p) =>
        p.player_id !== user?.id &&
        isActivePlayer(p) &&
        (!line || lineOf(p.preferred_position) === line) &&
        (!q || normalize(p.display_name).includes(q))
    );
  }, [roster.data, query, user?.id, picking]);
  const lineCodes = picking
    ? POSITIONS.filter((x) => x.line === picking.label).map((x) => x.code).join(', ')
    : '';

  if (roster.isLoading || mine.isLoading) return <LoadingState message="Chargement du terrain…" />;

  const pitchW = Math.min(width, 440) - 44;
  const pitchH = pitchW * 1.28;
  const body = { fontFamily: fonts.body };

  const place = (player: RosterPlayer) => {
    if (!picking) return;
    const next = { ...draft };
    // Un joueur déjà placé ailleurs change de poste
    for (const k of Object.keys(next)) if (next[k] === player.player_id) delete next[k];
    next[picking.key] = player.player_id;
    setDraft(next);
    setSaved(false);
    setPicking(null);
    setQuery('');
  };

  const clearSlot = () => {
    if (!picking) return;
    const next = { ...draft };
    delete next[picking.key];
    setDraft(next);
    setSaved(false);
    setPicking(null);
  };

  const save = () =>
    cast.mutate(draft, {
      onSuccess: () => setSaved(true),
    });

  const changeFormat = (newSize: number, newFormation: string) =>
    confirmAction(
      `Passer en ${newSize} type (${newFormation}) ?`,
      'Les postes changent : toutes les équipes déjà votées seront effacées et chacun devra revoter.',
      () => setFormat.mutate({ size: newSize, formation: newFormation }, { onSuccess: () => setFormatOpen(false) }),
      'Changer'
    );

  const slotView = (slot: PitchSlot) => {
    const win = !isOpen ? winners[slot.key] : undefined;
    const pid = isOpen ? draft[slot.key] : win?.player_id;
    const p = playerOf(pid);
    const label = p ? (p.display_name.split(' ').pop() ?? p.display_name) : slot.label;
    return (
      <Pressable
        key={slot.key}
        onPress={() => (isOpen ? setPicking(slot) : undefined)}
        disabled={!isOpen}
        accessibilityRole="button"
        accessibilityLabel={p ? `${slot.label} : ${p.display_name}` : `Choisir le ${slot.label}`}
        style={[styles.slot, { left: `${slot.x}%`, top: `${slot.y}%` }]}
      >
        {p ? (
          <MiniPlayerCard
            size="xs"
            displayName={p.display_name}
            avatarUrl={p.avatar_url}
            overall={p.overall}
            position={p.preferred_position}
          />
        ) : (
          <View style={[styles.empty, { borderColor: 'rgba(242,244,238,0.55)' }]}>
            <Text style={[styles.plus, { color: tokens.text }]}>{isOpen ? '+' : '—'}</Text>
          </View>
        )}
        <Text numberOfLines={1} style={[styles.slotName, body, { color: tokens.text }]}>
          {label}
        </Text>
        {win ? (
          <Text style={[styles.slotVotes, body, { color: tokens.lime }]}>
            {win.votes} voix
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.ink }}
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 32 }}
    >
      <Text style={[styles.eyebrow, body, { color: tokens.lime }]}>
        {opensAt ? 'Vote bientôt ouvert' : isOpen ? 'Vote ouvert' : 'Résultats'} · Équipe type
      </Text>
      <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>{award.title}</Text>
      <Text style={[styles.sub, body, { color: tokens.muted }]}>
        {size} joueurs · {formation}
        {isOpen
          ? ' · touche un poste pour y placer un joueur'
          : voters
            ? ` · ${voters} votant${voters > 1 ? 's' : ''}`
            : ' · aucun vote'}
      </Text>

      <View style={[styles.pitch, { width: pitchW, height: pitchH }]}>
        {/* Lignes du terrain */}
        <View style={styles.pitchBorder} />
        <View style={[styles.halfLine, { top: '0%' }]} />
        <View style={[styles.centerCircle, { left: pitchW / 2 - 46, top: -46 }]} />
        <View style={[styles.box, { left: '22%', right: '22%' }]} />
        <View style={[styles.smallBox, { left: '36%', right: '36%' }]} />
        {slots.map(slotView)}
      </View>

      {isOpen ? (
        <>
          <Pressable
            onPress={save}
            disabled={!!opensAt || filled < size || cast.isPending || (!dirty && !!savedSlots)}
            accessibilityRole="button"
            style={[
              styles.primary,
              { backgroundColor: tokens.lime },
              (!!opensAt || filled < size || cast.isPending || (!dirty && !!savedSlots)) && { opacity: 0.5 },
            ]}
          >
            <Text style={[styles.primaryText, body, { color: tokens.onLime }]}>
              {opensAt
                ? `Vote dès ${formatOpening(opensAt)}`
                : cast.isPending
                ? 'Enregistrement…'
                : filled < size
                  ? `Place encore ${size - filled} joueur${size - filled > 1 ? 's' : ''}`
                  : savedSlots && !dirty
                    ? 'Équipe enregistrée ✓'
                    : savedSlots
                      ? 'Mettre à jour mon équipe'
                      : 'Valider mon équipe'}
            </Text>
          </Pressable>
          {saved ? (
            <Text style={[styles.note, body, { color: tokens.lime }]}>
              Ton équipe est enregistrée. Tu peux la modifier jusqu’à la clôture.
            </Text>
          ) : null}
          {savedSlots ? (
            <Pressable
              onPress={() =>
                confirmAction(
                  'Retirer ton équipe ?',
                  'Ton équipe type sera supprimée. Tu pourras en revoter une tant que le vote est ouvert.',
                  () => withdraw.mutate(undefined, { onSuccess: () => setSaved(false) }),
                  'Retirer'
                )
              }
              disabled={withdraw.isPending}
              style={[styles.secondary, { borderColor: tokens.line }]}
              accessibilityRole="button"
            >
              <Text style={[styles.secondaryText, body, { color: tokens.errorText }]}>
                {withdraw.isPending ? 'Retrait…' : 'Retirer mon vote'}
              </Text>
            </Pressable>
          ) : null}
          {cast.error || withdraw.error ? (
            <Text style={[styles.note, body, { color: tokens.errorText }]}>
              {toErrorMessage(cast.error ?? withdraw.error)}
            </Text>
          ) : null}
        </>
      ) : results.error ? (
        <Text style={[styles.note, body, { color: tokens.errorText }]}>{toErrorMessage(results.error)}</Text>
      ) : null}

      {isAdmin ? (
        <View style={[styles.adminBox, { borderColor: tokens.line, backgroundColor: tokens.surface }]}>
          <Text style={[styles.adminTitle, body, { color: tokens.lime }]}>Admin</Text>
          {isOpen ? (
            <>
              <AwardOpeningEditor award={award} />
              <Pressable onPress={() => setFormatOpen((v) => !v)} accessibilityRole="button" style={styles.adminRow}>
                <Text style={[styles.adminText, body, { color: tokens.text }]}>Format : {size} type · {formation}</Text>
                <Text style={[styles.adminLink, body, { color: tokens.lime }]}>{formatOpen ? 'Fermer' : 'Modifier'}</Text>
              </Pressable>
              {formatOpen ? (
                <View style={{ gap: 8, marginBottom: 6 }}>
                  {LINEUP_FORMATS.map((f) => (
                    <View key={f.size} style={styles.formatRow}>
                      <Text style={[styles.formatLabel, body, { color: tokens.muted }]}>{f.label}</Text>
                      {f.formations.map((form) => {
                        const on = f.size === size && form === formation;
                        return (
                          <Pressable
                            key={form}
                            onPress={() => (on ? undefined : changeFormat(f.size, form))}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            style={[styles.chip, { borderColor: on ? tokens.lime : tokens.line }]}
                          >
                            <Text style={[styles.chipText, body, { color: on ? tokens.lime : tokens.text }]}>{form}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                  {setFormat.error ? (
                    <Text style={[styles.note, body, { color: tokens.errorText }]}>{toErrorMessage(setFormat.error)}</Text>
                  ) : null}
                </View>
              ) : null}
              <Pressable
                onPress={() =>
                  confirmAction(
                    `Clôturer « ${award.title} » ?`,
                    'Plus personne ne pourra voter, et l’équipe gagnante s’affichera sur le terrain.',
                    () => close.mutate(award.id),
                    'Clôturer'
                  )
                }
                disabled={close.isPending}
                style={[styles.secondary, { borderColor: tokens.line }]}
                accessibilityRole="button"
              >
                <Text style={[styles.secondaryText, body, { color: tokens.text }]}>
                  {close.isPending ? 'Clôture…' : 'Clôturer le vote et afficher l’équipe'}
                </Text>
              </Pressable>
            </>
          ) : null}
          <Pressable
            onPress={() =>
              confirmAction(
                `Supprimer « ${award.title} » ?`,
                'Le trophée et toutes les équipes votées seront définitivement supprimés.',
                () => remove.mutate(award.id, { onSuccess: onDeleted }),
                'Supprimer'
              )
            }
            disabled={remove.isPending}
            style={[styles.secondary, { borderColor: tokens.errorText }]}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryText, body, { color: tokens.errorText }]}>
              {remove.isPending ? 'Suppression…' : 'Supprimer ce trophée'}
            </Text>
          </Pressable>
          {remove.error ? (
            <Text style={[styles.note, body, { color: tokens.errorText }]}>{toErrorMessage(remove.error)}</Text>
          ) : null}
        </View>
      ) : null}

      <Modal visible={!!picking} animationType="slide" transparent onRequestClose={() => setPicking(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { backgroundColor: tokens.ink, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: tokens.text, fontFamily: fonts.display }]}>
                {picking?.label === 'GB' ? 'Gardien' : picking?.label === 'DEF' ? 'Défenseur' : picking?.label === 'MIL' ? 'Milieu' : 'Attaquant'}
              </Text>
              <Pressable onPress={() => setPicking(null)} accessibilityRole="button" hitSlop={12}>
                <Text style={[styles.adminLink, body, { color: tokens.muted }]}>Fermer</Text>
              </Pressable>
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un joueur"
              placeholderTextColor={tokens.placeholder}
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Rechercher un joueur"
              style={[
                styles.search,
                { backgroundColor: tokens.surface, borderColor: tokens.line, color: tokens.text },
                body,
                Platform.OS === 'web' ? ({ outlineStyle: 'none', colorScheme: scheme } as object) : null,
              ]}
            />
            <Text style={[styles.note, body, { color: tokens.muted2, marginTop: 0, marginBottom: 8 }]}>
              Postes proposés : {lineCodes}
            </Text>
            {picking && draft[picking.key] ? (
              <Pressable onPress={clearSlot} accessibilityRole="button" style={[styles.clear, { borderColor: tokens.line }]}>
                <Text style={[styles.secondaryText, body, { color: tokens.errorText }]}>Libérer ce poste</Text>
              </Pressable>
            ) : null}
            <FlatList
              data={candidates}
              keyExtractor={(p) => p.player_id}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 420 }}
              ListEmptyComponent={
                <Text style={[styles.note, body, { color: tokens.muted, textAlign: 'center' }]}>
                  {query
                    ? 'Aucun joueur ne correspond.'
                    : `Aucun joueur à ce poste (${lineCodes}). Les joueurs choisissent leur poste dans leur profil.`}
                </Text>
              }
              renderItem={({ item }) => {
                const here = picking && draft[picking.key] === item.player_id;
                const elsewhere = !here && placedIds.has(item.player_id);
                return (
                  <Pressable
                    onPress={() => place(item)}
                    accessibilityRole="button"
                    style={[styles.pickRow, { borderColor: here ? tokens.lime : tokens.line, backgroundColor: tokens.surface }]}
                  >
                    <MiniPlayerCard
                      size="xs"
                      displayName={item.display_name}
                      avatarUrl={item.avatar_url}
                      overall={item.overall}
                      position={item.preferred_position}
                      highlighted={!!here}
                    />
                    <Text numberOfLines={1} style={[styles.pickName, body, { color: tokens.text }]}>
                      {item.display_name}
                    </Text>
                    {elsewhere ? (
                      <Text style={[styles.pickTag, body, { color: tokens.muted2 }]}>Déjà placé</Text>
                    ) : here ? (
                      <Text style={[styles.pickTag, body, { color: tokens.lime }]}>Ici</Text>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  title: { fontSize: 30, fontStyle: 'italic', fontWeight: '700', lineHeight: 34, marginTop: 6 },
  sub: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  pitch: {
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#163A22',
  },
  pitchBorder: {
    ...StyleSheet.absoluteFillObject,
    margin: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
  },
  halfLine: { position: 'absolute', left: 8, right: 8, height: 2, backgroundColor: 'rgba(255,255,255,0.18)' },
  centerCircle: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  box: {
    position: 'absolute',
    bottom: 8,
    height: '16%',
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  smallBox: {
    position: 'absolute',
    bottom: 8,
    height: '7%',
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  slot: {
    position: 'absolute',
    width: 58,
    marginLeft: -29,
    marginTop: -34,
    alignItems: 'center',
  },
  empty: {
    width: 40,
    height: 54,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  plus: { fontSize: 22, fontWeight: '700' },
  slotName: { fontSize: 10, fontWeight: '700', marginTop: 3, maxWidth: 58, textAlign: 'center' },
  slotVotes: { fontSize: 9, fontWeight: '700' },
  primary: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { fontSize: 15, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 18, marginTop: 10 },
  adminBox: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 20 },
  adminTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 6 },
  adminRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  adminText: { fontSize: 14, fontWeight: '600' },
  adminLink: { fontSize: 14, fontWeight: '700' },
  formatRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  formatLabel: { width: 52, fontSize: 12, fontWeight: '600' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, height: 32, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '700' },
  secondary: { height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { fontSize: 14, fontWeight: '700' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: '86%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 22, fontStyle: 'italic', fontWeight: '700' },
  search: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, marginBottom: 10 },
  clear: { height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    marginBottom: 6,
  },
  pickName: { flex: 1, fontSize: 15, fontWeight: '600' },
  pickTag: { fontSize: 12, fontWeight: '700' },
});
