import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, SegmentedButtons, useTheme } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { League, Season } from '../types/database';
import { LeagueStandingsTab } from '../components/LeagueStandingsTab';
import { LeagueCalendarTab } from '../components/LeagueCalendarTab';
import { LeagueResultsTab } from '../components/LeagueResultsTab';
import { QuickAddMatch } from '../components/QuickAddMatch';
import { fetchTeamsBySeason } from '../services/teams';
import { fetchMatchesBySeason, createMatch } from '../services/matches';
import { fetchPlayersBySeason } from '../services/players';
import { createMatchEvent } from '../services/events';

type TabValue = 'standings' | 'calendar' | 'results';

type Props = {
  league: League;
  seasons: Season[];
  currentSeasonId: string | null;
  onSeasonChange: (seasonId: string) => void;
  onMatchPress: (matchId: string) => void;
  onTeamPress: (teamId: string) => void;
};

export function LeagueScreen({
  league,
  seasons,
  currentSeasonId,
  onSeasonChange,
  onMatchPress,
  onTeamPress,
}: Props) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabValue>('standings');
  const currentSeason = seasons.find((s) => s.id === currentSeasonId) ?? seasons[0];
  const seasonId = currentSeason?.id ?? '';

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', seasonId],
    queryFn: () => fetchTeamsBySeason(seasonId),
    enabled: !!seasonId,
  });
  const { data: matches = [] } = useQuery({
    queryKey: ['matches', seasonId],
    queryFn: () => fetchMatchesBySeason(seasonId),
    enabled: !!seasonId,
  });
  const { data: players = [] } = useQuery({
    queryKey: ['players_season', seasonId],
    queryFn: () => fetchPlayersBySeason(seasonId),
    enabled: !!seasonId,
  });

  const createMatchMutation = useMutation({
    mutationFn: ({ homeId, awayId, date }: { homeId: string; awayId: string; date: string }) =>
      createMatch(seasonId, homeId, awayId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches', seasonId] });
    },
  });
  const createEventMutation = useMutation({
    mutationFn: ({
      matchId,
      playerId,
      teamId,
      type,
      minute,
    }: {
      matchId: string;
      playerId: string;
      teamId: string;
      type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'motm';
      minute?: number;
    }) => createMatchEvent(matchId, playerId, teamId, type, minute),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['matches', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['match_events', variables.matchId] });
    },
  });

  const handleAddMatch = async (homeTeamId: string, awayTeamId: string, date: string) => {
    await createMatchMutation.mutateAsync({ homeId: homeTeamId, awayId: awayTeamId, date });
  };
  const handleAddEvent = async (
    matchId: string,
    playerId: string,
    teamId: string,
    type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'motm',
    minute?: number
  ) => {
    await createEventMutation.mutateAsync({ matchId, playerId, teamId, type, minute });
  };

  const invalidateSeason = () => {
    queryClient.invalidateQueries({ queryKey: ['matches', seasonId] });
    queryClient.invalidateQueries({ queryKey: ['teams', seasonId] });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        {league.name}
      </Text>
      {league.description ? (
        <Text variant="bodyMedium" style={styles.description}>
          {league.description}
        </Text>
      ) : null}
      {seasons.length > 1 && (
        <SegmentedButtons
          value={currentSeasonId ?? ''}
          onValueChange={onSeasonChange}
          buttons={seasons.map((s) => ({ value: s.id, label: s.name }))}
          style={styles.seasonSelector}
        />
      )}
      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as TabValue)}
        buttons={[
          { value: 'standings', label: 'Classement' },
          { value: 'calendar', label: 'Calendrier' },
          { value: 'results', label: 'Résultats' },
        ]}
        style={styles.tabs}
      />
      {tab === 'standings' && currentSeason && (
        <LeagueStandingsTab seasonId={currentSeason.id} onTeamPress={onTeamPress} />
      )}
      {tab === 'calendar' && currentSeason && (
        <LeagueCalendarTab seasonId={currentSeason.id} onMatchPress={onMatchPress} />
      )}
      {tab === 'results' && currentSeason && (
        <LeagueResultsTab seasonId={currentSeason.id} onMatchPress={onMatchPress} />
      )}
      {seasonId ? (
        <QuickAddMatch
          seasonId={seasonId}
          matches={matches}
          teams={teams}
          players={players}
          onAddMatch={handleAddMatch}
          onAddEvent={handleAddEvent}
          onSuccess={invalidateSeason}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 4,
  },
  description: {
    opacity: 0.8,
    marginBottom: 12,
  },
  seasonSelector: {
    marginBottom: 12,
  },
  tabs: {
    marginBottom: 16,
  },
});
