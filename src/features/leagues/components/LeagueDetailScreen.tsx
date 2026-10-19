import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Share, Platform } from 'react-native';
import { SegmentedButtons, Text, FAB, Button, TextInput, useTheme } from 'react-native-paper';
import { useLeague, useSeasonsByLeague } from '../hooks';
import { useLeagueMembers } from '../../members/hooks';
import { useAuth } from '../../auth/hooks';
import { useSendLeagueInvite } from '../../invites/hooks';
import {
  useMatchesBySeason,
  useMatchTeamsBySeason,
  useEventsBySeason,
  useMatchTeamPlayersByMatchTeamIds,
} from '../../matches/hooks';
import { buildMatchSidesMap, computePlayerStandings, computePlayerStats } from '../../rankings/calc';
import {
  Screen,
  SectionHeader,
  EntityCard,
  EmptyState,
  LoadingState,
  ErrorState,
  FutCard,
} from '../../../ui';
import { AwardsVoteTab } from '../../awards/components/AwardsVoteTab';
import type { PlayerStandingRow, PlayerStats as PlayerStatsType } from '../../../types/entities';

type TabValue = 'matches' | 'rankings' | 'awards' | 'players';

interface LeagueDetailScreenProps {
  leagueId: string;
  onMatchPress: (matchId: string) => void;
  onCreateSeason: () => void;
  onCreateMatch: (seasonId: string) => void;
  onPlayerPress: (playerId: string) => void;
}

function PlayersTab({
  leagueId,
  onPlayerPress,
  isAdmin,
  inviteCode,
}: {
  leagueId: string;
  onPlayerPress: (playerId: string) => void;
  isAdmin: boolean;
  inviteCode?: string | null;
}) {
  const { data: members = [], isLoading, error, refetch, isRefetching } = useLeagueMembers(leagueId);
  const sendInvite = useSendLeagueInvite();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  const shareInvite = async () => {
    if (!inviteCode) return;
    const message = `Rejoins ma ligue sur J'aime le foot ! Code : ${inviteCode}`;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteCode);
      alert(`Code copié : ${inviteCode}`);
      return;
    }
    await Share.share({ message });
  };

  const sendEmailInvite = async () => {
    setInviteMsg(null);
    setInviteErr(null);
    if (!inviteEmail.trim().includes('@')) {
      setInviteErr('Email invalide');
      return;
    }
    try {
      await sendInvite.mutateAsync({ leagueId, email: inviteEmail.trim() });
      setInviteMsg(`Invitation envoyée à ${inviteEmail.trim()}`);
      setInviteEmail('');
    } catch (e: unknown) {
      setInviteErr(e instanceof Error ? e.message : 'Envoi impossible');
    }
  };

  if (isLoading) return <LoadingState message="Chargement des joueurs…" />;
  if (error) return <ErrorState message={String(error)} onRetry={() => refetch()} />;

  return (
    <FlatList
      data={members}
      keyExtractor={(m) => m.player_id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      ListHeaderComponent={
        isAdmin && inviteCode ? (
          <View style={styles.inviteBox}>
            <Text variant="titleSmall">Inviter des potes</Text>
            <Text variant="headlineSmall" style={styles.inviteCode}>
              {inviteCode}
            </Text>
            <Text variant="bodySmall" style={styles.inviteHint}>
              Partage le code, ou envoie une invitation par email (Resend).
            </Text>
            <Button mode="outlined" onPress={shareInvite} style={styles.inviteBtn}>
              Copier / partager le code
            </Button>
            <TextInput
              label="Email du pote"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              style={styles.inviteInput}
            />
            <Button
              mode="contained"
              onPress={sendEmailInvite}
              loading={sendInvite.isPending}
              disabled={sendInvite.isPending}
              style={styles.inviteBtn}
              labelStyle={{ color: '#000' }}
            >
              Envoyer l’invitation par email
            </Button>
            {inviteMsg ? <Text style={styles.inviteOk}>{inviteMsg}</Text> : null}
            {inviteErr ? <Text style={styles.inviteError}>{inviteErr}</Text> : null}
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          title="Aucun membre"
          message={isAdmin ? 'Partage ton code d’invitation.' : 'La ligue n’a pas encore de joueurs.'}
        />
      }
      renderItem={({ item }) => {
        const p = item.profile;
        return (
          <EntityCard
            title={p?.display_name ?? 'Inconnu'}
            subtitle={[p?.preferred_position, item.role === 'admin' ? 'Admin' : null]
              .filter(Boolean)
              .join(' • ') || undefined}
            onPress={() => onPlayerPress(item.player_id)}
          />
        );
      }}
    />
  );
}

function MatchesTab({
  leagueId,
  onMatchPress,
  onCreateSeason,
  onCreateMatch,
  isAdmin,
}: {
  leagueId: string;
  onMatchPress: (matchId: string) => void;
  onCreateSeason: () => void;
  onCreateMatch: (seasonId: string) => void;
  isAdmin: boolean;
}) {
  const theme = useTheme();
  const { data: seasons = [] } = useSeasonsByLeague(leagueId);
  const seasonId = seasons[0]?.id;
  const { data: matches = [], isLoading, error, refetch, isRefetching } = useMatchesBySeason(seasonId);
  const { data: matchTeams = [] } = useMatchTeamsBySeason(seasonId);

  if (!seasonId)
    return (
      <EmptyState
        title="Aucune saison"
        message={
          isAdmin
            ? 'Crée une saison pour planifier les matchs.'
            : 'L’admin n’a pas encore créé de saison.'
        }
        actionLabel={isAdmin ? 'Créer une saison' : undefined}
        onAction={isAdmin ? onCreateSeason : undefined}
      />
    );
  if (isLoading) return <LoadingState message="Chargement des matchs…" />;
  if (error) return <ErrorState message={String(error)} onRetry={() => refetch()} />;

  const getTeamNames = (matchId: string) => {
    const home = matchTeams.find((t) => t.match_id === matchId && t.side === 'home');
    const away = matchTeams.find((t) => t.match_id === matchId && t.side === 'away');
    return `${home?.name ?? '?'} - ${away?.name ?? '?'}`;
  };

  return (
    <>
      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState
            title="Aucun match"
            message={
              isAdmin
                ? 'Compose ton premier match (2 équipes parmi les membres).'
                : 'Pas encore de match prévu. Patience ⚽'
            }
            actionLabel={isAdmin ? 'Créer un match' : undefined}
            onAction={isAdmin && seasonId ? () => onCreateMatch(seasonId) : undefined}
          />
        }
        renderItem={({ item }) => (
          <EntityCard
            title={getTeamNames(item.id)}
            subtitle={new Date(item.kickoff_at).toLocaleDateString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
            chips={
              item.status === 'played'
                ? [`${item.home_score} - ${item.away_score}`]
                : [item.status === 'scheduled' ? 'À venir' : item.status]
            }
            onPress={() => onMatchPress(item.id)}
          />
        )}
      />
      {isAdmin && seasonId ? (
        <FAB
          icon="plus"
          label="Match"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => onCreateMatch(seasonId)}
          color="#000"
        />
      ) : null}
    </>
  );
}

function RankingsTab({
  leagueId,
  onPlayerPress,
}: {
  leagueId: string;
  onPlayerPress: (playerId: string) => void;
}) {
  const { data: seasons = [] } = useSeasonsByLeague(leagueId);
  const seasonId = seasons[0]?.id;
  const { data: members = [] } = useLeagueMembers(leagueId);
  const { data: matches = [] } = useMatchesBySeason(seasonId);
  const { data: matchTeams = [] } = useMatchTeamsBySeason(seasonId);
  const { data: teamPlayersRaw = [] } = useMatchTeamPlayersForSeason(seasonId);
  const { data: events = [] } = useEventsBySeason(seasonId);

  const matchSides = React.useMemo(
    () =>
      buildMatchSidesMap(
        matchTeams.map((t) => ({ id: t.id, match_id: t.match_id, side: t.side })),
        teamPlayersRaw.map((p) => ({ match_team_id: p.match_team_id, player_id: p.player_id }))
      ),
    [matchTeams, teamPlayersRaw]
  );

  const standings: PlayerStandingRow[] = seasonId
    ? computePlayerStandings(members, matches, events, matchSides)
    : [];
  const stats: PlayerStatsType[] = seasonId
    ? computePlayerStats(members, matches, events, matchSides)
    : [];

  const topScorers = [...stats].sort((a, b) => b.goals - a.goals).slice(0, 5);
  const topAssists = [...stats].sort((a, b) => b.assists - a.assists).slice(0, 5);
  const ballonDor = [...stats].sort((a, b) => b.ballon_dor_score - a.ballon_dor_score).slice(0, 5);

  if (!seasonId)
    return <EmptyState title="Aucune saison" message="Les classements apparaîtront après les matchs." />;
  if (standings.length === 0)
    return (
      <EmptyState title="Classement vide" message="Dès qu’un match est joué, les points s’affichent ici." />
    );

  return (
    <FlatList
      data={[]}
      ListHeaderComponent={
        <>
          <SectionHeader title="Classement général" />
          {standings.slice(0, 10).map((r, i) => (
            <EntityCard
              key={r.player_id}
              title={`${i + 1}. ${r.player_name}`}
              subtitle={`${r.points} pts • ${r.played} J • ${r.goals}B ${r.assists}P`}
              onPress={() => onPlayerPress(r.player_id)}
            />
          ))}
          <SectionHeader title="Soulier d'Or" />
          {topScorers.map((s, i) => (
            <EntityCard
              key={s.player_id}
              title={`${i + 1}. ${s.player_name}`}
              subtitle={`${s.goals} buts`}
              onPress={() => onPlayerPress(s.player_id)}
            />
          ))}
          <SectionHeader title="Meilleur passeur" />
          {topAssists.map((s, i) => (
            <EntityCard
              key={s.player_id}
              title={`${i + 1}. ${s.player_name}`}
              subtitle={`${s.assists} passes`}
              onPress={() => onPlayerPress(s.player_id)}
            />
          ))}
          <SectionHeader title="Ballon d'Or" />
          {ballonDor.map((s, i) => (
            <EntityCard
              key={s.player_id}
              title={`${i + 1}. ${s.player_name}`}
              subtitle={`${s.ballon_dor_score} pts`}
              onPress={() => onPlayerPress(s.player_id)}
            />
          ))}
          <SectionHeader title="FUT Cards" />
          {stats.slice(0, 6).map((s) => (
            <FutCard
              key={s.player_id}
              playerName={s.player_name}
              rating={s.fut_rating}
              position={s.preferred_position}
              avatarUrl={s.avatar_url}
              stats={{ goals: s.goals, assists: s.assists, mvp: s.mvp }}
              onPress={() => onPlayerPress(s.player_id)}
            />
          ))}
        </>
      }
      renderItem={() => null}
      contentContainerStyle={styles.list}
    />
  );
}

function useMatchTeamPlayersForSeason(seasonId: string | undefined) {
  const { data: matchTeams = [] } = useMatchTeamsBySeason(seasonId);
  const teamIds = matchTeams.map((t) => t.id);
  const { data: players } = useMatchTeamPlayersByMatchTeamIds(teamIds);
  return { data: players ?? [] };
}

export function LeagueDetailScreen({
  leagueId,
  onMatchPress,
  onCreateSeason,
  onCreateMatch,
  onPlayerPress,
}: LeagueDetailScreenProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabValue>('matches');
  const { data: league, isLoading, error, refetch } = useLeague(leagueId);
  const { data: seasons = [] } = useSeasonsByLeague(leagueId);

  if (isLoading) return <LoadingState message="Chargement de la ligue…" />;
  if (error) return <ErrorState message={String(error)} onRetry={() => refetch()} />;
  if (!league) return null;

  const isAdmin = user?.id === league.created_by;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Screen
        title={league.name}
        subtitle={
          [
            league.city,
            seasons[0] ? `Saison ${seasons[0].name}` : null,
            isAdmin ? 'Tu es admin' : 'Tu es joueur',
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        noScroll
      />
      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as TabValue)}
        buttons={[
          { value: 'matches', label: 'Matchs' },
          { value: 'rankings', label: 'Class.' },
          { value: 'awards', label: 'Votes' },
          { value: 'players', label: 'Joueurs' },
        ]}
        style={styles.tabs}
      />
      {tab === 'matches' && (
        <MatchesTab
          leagueId={leagueId}
          onMatchPress={onMatchPress}
          onCreateSeason={onCreateSeason}
          onCreateMatch={onCreateMatch}
          isAdmin={isAdmin}
        />
      )}
      {tab === 'rankings' && <RankingsTab leagueId={leagueId} onPlayerPress={onPlayerPress} />}
      {tab === 'awards' && seasons[0]?.id ? (
        <AwardsVoteTab seasonId={seasons[0].id} leagueId={leagueId} isAdmin={isAdmin} />
      ) : tab === 'awards' ? (
        <EmptyState title="Pas de saison" message="Crée une saison pour ouvrir les votes." />
      ) : null}
      {tab === 'players' && (
        <PlayersTab
          leagueId={leagueId}
          onPlayerPress={onPlayerPress}
          isAdmin={isAdmin}
          inviteCode={league.invite_code}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { marginHorizontal: 16, marginBottom: 12 },
  list: { padding: 20, paddingBottom: 88 },
  fab: { position: 'absolute', right: 20, bottom: 24 },
  inviteBox: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C9FF00',
    backgroundColor: '#f7ffe0',
  },
  inviteCode: { marginTop: 8, letterSpacing: 4, fontWeight: '700' },
  inviteHint: { marginTop: 4, opacity: 0.75 },
  inviteBtn: { marginTop: 12 },
  inviteInput: { marginTop: 12 },
  inviteOk: { marginTop: 8, color: '#1a472a' },
  inviteError: { marginTop: 8, color: '#b00020' },
});

