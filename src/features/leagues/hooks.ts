import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export const leaguesKeys = {
  all: ['leagues'] as const,
  list: () => [...leaguesKeys.all, 'list'] as const,
  detail: (id: string) => [...leaguesKeys.all, id] as const,
  seasons: (leagueId: string) => [...leaguesKeys.all, 'seasons', leagueId] as const,
};

export function useLeagues() {
  return useQuery({
    queryKey: leaguesKeys.list(),
    queryFn: api.fetchLeagues,
  });
}

export function useLeague(id: string | undefined) {
  return useQuery({
    queryKey: leaguesKeys.detail(id ?? ''),
    queryFn: () => api.fetchLeagueById(id!),
    enabled: !!id,
  });
}

export function useSeasonsByLeague(leagueId: string | undefined) {
  return useQuery({
    queryKey: leaguesKeys.seasons(leagueId ?? ''),
    queryFn: () => api.fetchSeasonsByLeague(leagueId!),
    enabled: !!leagueId,
  });
}

export function useCreateSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leagueId,
      name,
      startDate,
      endDate,
    }: {
      leagueId: string;
      name: string;
      startDate?: string;
      endDate?: string;
    }) => api.createSeason(leagueId, name, startDate, endDate),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: leaguesKeys.seasons(variables.leagueId) }),
  });
}

export function useCreateLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, createdBy, city }: { name: string; createdBy: string; city?: string }) =>
      api.createLeague(name, createdBy, city),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaguesKeys.list() }),
  });
}

export function useJoinLeagueByCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.joinLeagueByCode(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaguesKeys.list() }),
  });
}
