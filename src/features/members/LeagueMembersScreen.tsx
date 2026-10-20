import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { useAuth } from '../auth/hooks';
import { useLeague } from '../leagues/hooks';
import { InviteCard } from '../leagues/components/InviteCard';
import { MiniPlayerCard } from '../cards/MiniPlayerCard';
import {
  useLeagueRoster,
  useRegenerateInviteCode,
  useRemoveMember,
  useSetMemberStatus,
} from './hooks';
import type { RosterPlayer } from './api';
import { ErrorState, LoadingState } from '../../ui';
import { toErrorMessage } from '../../lib/errors';
import { confirmAction } from '../../lib/confirm';

/** Écran de l'admin : demandes à valider, joueurs actifs, suspendus, et invitation. */
export function LeagueMembersScreen({ leagueId }: { leagueId: string }) {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  const { user } = useAuth();
  const league = useLeague(leagueId);
  const roster = useLeagueRoster(leagueId);
  const setStatus = useSetMemberStatus(leagueId);
  const remove = useRemoveMember(leagueId);
  const regenerate = useRegenerateInviteCode(leagueId);
  const body = { fontFamily: fonts.body };

  if (league.isLoading || roster.isLoading) return <LoadingState message="Chargement des joueurs…" />;
  if (!league.data) return <ErrorState message="Ligue introuvable." />;
  if (league.data.created_by !== user?.id) {
    return <ErrorState message="Seul l’admin de la ligue peut gérer ses joueurs." />;
  }

  const all = roster.data ?? [];
  const pending = all.filter((p) => p.status === 'pending');
  const active = all.filter((p) => !p.status || p.status === 'active');
  const suspended = all.filter((p) => p.status === 'suspended');
  const busy = setStatus.isPending || remove.isPending;
  const error = setStatus.error ?? remove.error ?? regenerate.error;

  const action = (label: string, onPress: () => void, tone: 'lime' | 'danger' | 'plain' = 'plain') => (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={[
        styles.action,
        {
          borderColor: tone === 'lime' ? tokens.lime : tone === 'danger' ? tokens.errorText : tokens.line,
          backgroundColor: tone === 'lime' ? tokens.lime : 'transparent',
        },
        busy && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          styles.actionText,
          body,
          { color: tone === 'lime' ? tokens.onLime : tone === 'danger' ? tokens.errorText : tokens.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const row = (p: RosterPlayer, actions: React.ReactNode) => {
    const me = p.player_id === user?.id;
    return (
      <View key={p.player_id} style={[styles.row, { borderColor: tokens.line, backgroundColor: tokens.surface }]}>
        <MiniPlayerCard
          size="xs"
          displayName={p.display_name}
          avatarUrl={p.avatar_url}
          overall={p.overall}
          position={p.preferred_position}
        />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.name, body, { color: tokens.text }]}>
            {p.display_name}
            {me ? ' (toi)' : ''}
          </Text>
          <Text style={[styles.meta, body, { color: tokens.muted }]}>
            {p.role === 'admin' ? 'Admin' : 'Joueur'}
            {p.preferred_position ? ` · ${p.preferred_position}` : ''}
          </Text>
        </View>
        {me ? null : <View style={styles.actions}>{actions}</View>}
      </View>
    );
  };

  const section = (title: string, count: number, hint: string | null, children: React.ReactNode, accent = false) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, body, { color: accent ? tokens.lime : tokens.muted2 }]}>
        {title} · {count}
      </Text>
      {hint ? <Text style={[styles.hint, body, { color: tokens.muted }]}>{hint}</Text> : null}
      {children}
    </View>
  );

  const confirmRemove = (p: RosterPlayer, verb: 'Retirer' | 'Refuser') =>
    confirmAction(
      verb === 'Refuser' ? `Refuser ${p.display_name} ?` : `Retirer ${p.display_name} de la ligue ?`,
      verb === 'Refuser'
        ? 'Sa demande sera supprimée. Il pourra redemander avec le code d’invitation.'
        : 'Il ne verra plus la ligue. Il pourra redemander avec le code : pense à générer un nouveau code si besoin.',
      () => remove.mutate(p.player_id),
      verb
    );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.ink }}
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 32 }}
    >
      <Text style={[styles.eyebrow, body, { color: tokens.lime }]}>{league.data.name}</Text>
      <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>Joueurs</Text>

      {error ? <Text style={[styles.error, body, { color: tokens.errorText }]}>{toErrorMessage(error)}</Text> : null}

      {section(
        'Demandes à valider',
        pending.length,
        pending.length ? 'Ces joueurs ont utilisé ton lien ou ton code. Ils ne voient rien de la ligue tant que tu n’as pas accepté.' : 'Aucune demande en attente.',
        pending.map((p) =>
          row(
            p,
            <>
              {action('Accepter', () => setStatus.mutate({ playerId: p.player_id, status: 'active' }), 'lime')}
              {action('Refuser', () => confirmRemove(p, 'Refuser'), 'danger')}
            </>
          )
        ),
        pending.length > 0
      )}

      {section(
        'Joueurs actifs',
        active.length,
        null,
        active.map((p) =>
          row(
            p,
            <>
              {action('Suspendre', () =>
                confirmAction(
                  `Suspendre ${p.display_name} ?`,
                  'Il voit toujours la ligue mais ne peut plus s’inscrire aux matchs ni voter, et ne peut plus être choisi dans les votes.',
                  () => setStatus.mutate({ playerId: p.player_id, status: 'suspended' }),
                  'Suspendre'
                )
              )}
              {action('Retirer', () => confirmRemove(p, 'Retirer'), 'danger')}
            </>
          )
        )
      )}

      {suspended.length
        ? section(
            'Suspendus',
            suspended.length,
            'Pas d’inscription aux matchs ni de vote tant que tu ne les réintègres pas.',
            suspended.map((p) =>
              row(
                p,
                <>
                  {action('Réintégrer', () => setStatus.mutate({ playerId: p.player_id, status: 'active' }), 'lime')}
                  {action('Retirer', () => confirmRemove(p, 'Retirer'), 'danger')}
                </>
              )
            )
          )
        : null}

      <View style={styles.section}>
        {league.data.invite_code ? (
          <InviteCard leagueName={league.data.name} code={league.data.invite_code} />
        ) : null}
        <Pressable
          onPress={() =>
            confirmAction(
              'Générer un nouveau code ?',
              'L’ancien lien et l’ancien code ne fonctionneront plus. Les joueurs déjà dans la ligue ne sont pas touchés.',
              () => regenerate.mutate(),
              'Nouveau code'
            )
          }
          disabled={regenerate.isPending}
          accessibilityRole="button"
          style={[styles.secondary, { borderColor: tokens.line }]}
        >
          <Text style={[styles.secondaryText, body, { color: tokens.text }]}>
            {regenerate.isPending ? 'Génération…' : 'Générer un nouveau code'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  title: { fontSize: 32, fontStyle: 'italic', fontWeight: '700', lineHeight: 36, marginTop: 6 },
  error: { fontSize: 13, marginTop: 10 },
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  actions: { gap: 6, alignItems: 'flex-end' },
  action: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 32, justifyContent: 'center', minWidth: 92, alignItems: 'center' },
  actionText: { fontSize: 13, fontWeight: '700' },
  secondary: { height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { fontSize: 14, fontWeight: '700' },
});
