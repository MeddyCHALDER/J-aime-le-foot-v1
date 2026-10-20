import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { announceMatchOpen } from '../notifications/api';

export const matchesKeys = {
  all: ['matches'] as const,
  bySeason: (seasonId: string) => [...matchesKeys.all, 'season', seasonId] as const,
  detail: (id: string) => [...matchesKeys.all, id] as const,
  teams: (matchId: string) => [...matchesKeys.all, 'teams', matchId] as const,
  teamPlayers: (matchTeamId: string) => [...matchesKeys.all, 'team_players', matchTeamId] as const,
  events: (matchId: string) => [...matchesKeys.all, 'events', matchId] as const,
  eventsBySeason: (seasonId: string) => [...matchesKeys.all, 'events_season', seasonId] as const,
};

export function useMatchesBySeason(seasonId: string | undefined) {
  return useQuery({
    queryKey: matchesKeys.bySeason(seasonId ?? ''),
    queryFn: () => api.fetchMatchesBySeason(seasonId!),
    enabled: !!seasonId,
  });
}

export function useMatch(id: string | undefined) {
  return useQuery({
    queryKey: matchesKeys.detail(id ?? ''),
    queryFn: () => api.fetchMatchById(id!),
    enabled: !!id,
  });
}

export function useCreateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      seasonId,
      kickoffAt,
      location,
    }: {
      seasonId: string;
      kickoffAt: string;
      location?: string;
    }) => api.createMatch(seasonId, kickoffAt, location),
    onSuccess: (match, variables) => {
      qc.invalidateQueries({ queryKey: matchesKeys.bySeason(variables.seasonId) });
      // Un match créé est ouvert aux inscriptions : on prévient la ligue.
      void announceMatchOpen(match.id);
    },
  });
}

export function useUpdateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Parameters<typeof api.updateMatch>[1];
    }) => api.updateMatch(id, updates),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: matchesKeys.detail(data.id) });
      qc.invalidateQueries({ queryKey: matchesKeys.bySeason(data.season_id) });
    },
  });
}

export function useMatchTeams(matchId: string | undefined) {
  return useQuery({
    queryKey: matchesKeys.teams(matchId ?? ''),
    queryFn: () => api.fetchMatchTeams(matchId!),
    enabled: !!matchId,
  });
}

export function useMatchTeamsBySeason(seasonId: string | undefined) {
  return useQuery({
    queryKey: [...matchesKeys.bySeason(seasonId ?? ''), 'teams'] as const,
    queryFn: () => api.fetchMatchTeamsBySeason(seasonId!),
    enabled: !!seasonId,
  });
}

export function useMatchTeamPlayers(matchTeamId: string | undefined) {
  return useQuery({
    queryKey: matchesKeys.teamPlayers(matchTeamId ?? ''),
    queryFn: () => api.fetchMatchTeamPlayers(matchTeamId!),
    enabled: !!matchTeamId,
  });
}

export function useCreateMatchTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      side,
      name,
    }: { matchId: string; side: 'home' | 'away'; name: string }) =>
      api.createMatchTeam(matchId, side, name),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: matchesKeys.teams(variables.matchId) }),
  });
}

export function useAddMatchTeamPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchTeamId,
      playerId,
      position,
    }: { matchTeamId: string; playerId: string; position?: string }) =>
      api.addMatchTeamPlayer(matchTeamId, playerId, position),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: matchesKeys.teamPlayers(variables.matchTeamId) }),
  });
}

export function useRemoveMatchTeamPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ matchTeamId, playerId }: { matchTeamId: string; playerId: string }) =>
      api.removeMatchTeamPlayer(matchTeamId, playerId),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: matchesKeys.teamPlayers(variables.matchTeamId) }),
  });
}

export function useMatchEvents(matchId: string | undefined) {
  return useQuery({
    queryKey: matchesKeys.events(matchId ?? ''),
    queryFn: () => api.fetchEventsByMatch(matchId!),
    enabled: !!matchId,
  });
}

export function useEventsBySeason(seasonId: string | undefined) {
  return useQuery({
    queryKey: matchesKeys.eventsBySeason(seasonId ?? ''),
    queryFn: () => api.fetchEventsBySeason(seasonId!),
    enabled: !!seasonId,
  });
}

export function useCreateMatchEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      teamSide,
      playerId,
      type,
      minute,
    }: {
      matchId: string;
      teamSide: 'home' | 'away';
      playerId: string;
      type: 'goal' | 'assist' | 'yellow' | 'red' | 'mvp';
      minute?: number;
    }) => api.createMatchEvent(matchId, teamSide, playerId, type, minute),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: matchesKeys.events(variables.matchId) }),
  });
}

export function useMatchTeamPlayersByMatchTeamIds(matchTeamIds: string[]) {
  return useQuery({
    queryKey: [...matchesKeys.all, 'team_players_bulk', matchTeamIds.join(',')] as const,
    queryFn: () => api.fetchMatchTeamPlayersByMatchTeamIds(matchTeamIds),
    enabled: matchTeamIds.length > 0,
  });
}
