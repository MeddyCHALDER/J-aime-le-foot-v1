import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './seasonAwardsApi';

export const seasonAwardsKeys = {
  list: (seasonId: string) => ['season_awards', seasonId] as const,
  nominations: (awardId: string) => ['award_nominations', awardId] as const,
  myVote: (awardId: string, voterId: string) => ['award_my_vote', awardId, voterId] as const,
};

export function useSeasonAwards(seasonId: string | undefined) {
  return useQuery({
    queryKey: seasonAwardsKeys.list(seasonId ?? ''),
    queryFn: () => api.fetchSeasonAwards(seasonId!),
    enabled: !!seasonId,
  });
}

export function useOpenSeasonAwards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ seasonId, playerIds }: { seasonId: string; playerIds: string[] }) =>
      api.openSeasonAwards(seasonId, playerIds),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: seasonAwardsKeys.list(v.seasonId) }),
  });
}

export function useAwardNominations(awardId: string | undefined) {
  return useQuery({
    queryKey: seasonAwardsKeys.nominations(awardId ?? ''),
    queryFn: () => api.fetchNominations(awardId!),
    enabled: !!awardId,
  });
}

export function useMyAwardVote(awardId: string | undefined, voterId: string | undefined) {
  return useQuery({
    queryKey: seasonAwardsKeys.myVote(awardId ?? '', voterId ?? ''),
    queryFn: () => api.fetchMyVote(awardId!, voterId!),
    enabled: !!awardId && !!voterId,
  });
}

export function useCastAwardVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      awardId,
      nominationId,
      voterId,
    }: {
      awardId: string;
      nominationId: string;
      voterId: string;
    }) => api.castVote(awardId, nominationId, voterId),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: seasonAwardsKeys.nominations(v.awardId) });
      qc.invalidateQueries({ queryKey: seasonAwardsKeys.myVote(v.awardId, v.voterId) });
    },
  });
}
