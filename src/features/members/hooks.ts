import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export const membersKeys = {
  byLeague: (leagueId: string) => ['league_members', leagueId] as const,
};

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
