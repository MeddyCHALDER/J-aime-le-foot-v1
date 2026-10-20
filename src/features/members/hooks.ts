import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export const membersKeys = {
  byLeague: (leagueId: string) => ['league_members', leagueId] as const,
  roster: (leagueId: string) => ['league_roster', leagueId] as const,
};

export function useLeagueRoster(leagueId: string | undefined) {
  return useQuery({
    queryKey: membersKeys.roster(leagueId ?? ''),
    queryFn: () => api.fetchLeagueRoster(leagueId!),
    enabled: !!leagueId,
  });
}

export function useLeagueMembers(leagueId: string | undefined) {
  return useQuery({
    queryKey: membersKeys.byLeague(leagueId ?? ''),
    queryFn: () => api.fetchLeagueMembersWithProfiles(leagueId!),
    enabled: !!leagueId,
  });
}

export function useAddLeagueMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leagueId,
      playerId,
      role,
    }: {
      leagueId: string;
      playerId: string;
      role?: 'admin' | 'player';
    }) => api.addLeagueMember(leagueId, playerId, role),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: membersKeys.byLeague(variables.leagueId) }),
  });
}

export function useRemoveLeagueMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leagueId, playerId }: { leagueId: string; playerId: string }) =>
      api.removeLeagueMember(leagueId, playerId),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: membersKeys.byLeague(variables.leagueId) }),
  });
}

export function useLeaveLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leagueId, playerId }: { leagueId: string; playerId: string }) =>
      api.leaveLeague(leagueId, playerId),
    // Ligue, matchs, votes, inscriptions : tout l'accueil dépend de la ligue courante.
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useSetMemberStatus(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, status }: { playerId: string; status: 'active' | 'suspended' }) =>
      api.setMemberStatus(leagueId, playerId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKeys.roster(leagueId) }),
  });
}

export function useRemoveMember(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) => api.kickLeagueMember(leagueId, playerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKeys.roster(leagueId) }),
  });
}

export function useRegenerateInviteCode(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.regenerateInviteCode(leagueId),
    // Le code est lu avec la ligue
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useMyJoinRequests(enabled = true) {
  return useQuery({
    queryKey: ['my_join_requests'],
    queryFn: () => api.fetchMyJoinRequests(),
    enabled,
  });
}
