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

export const voteKeys = {
  award: (awardId: string) => ['season_award', awardId] as const,
  mine: (voterId: string, awardIds: string[]) => ['award_my_votes', voterId, ...awardIds] as const,
  minePrefix: ['award_my_votes'] as const,
  tally: (awardId: string) => ['award_tally', awardId] as const,
};

export function useAward(awardId: string | undefined) {
  return useQuery({
    queryKey: voteKeys.award(awardId ?? ''),
    queryFn: () => api.fetchAward(awardId!),
    enabled: !!awardId,
  });
}

export function useMyVotes(awardIds: string[], voterId: string | undefined) {
  return useQuery({
    queryKey: voteKeys.mine(voterId ?? '', awardIds),
    queryFn: () => api.fetchMyVotes(awardIds, voterId!),
    enabled: !!voterId && awardIds.length > 0,
  });
}

export function useAwardTally(awardId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: voteKeys.tally(awardId ?? ''),
    queryFn: () => api.fetchAwardTally(awardId!),
    enabled: !!awardId && enabled,
  });
}

/** Vote pour un joueur ; le choix s'affiche tout de suite (mise à jour optimiste). */
export function useVoteForPlayer(awardId: string, voterId: string | undefined) {
  const qc = useQueryClient();
  const key = voteKeys.mine(voterId ?? '', [awardId]);
  return useMutation({
    mutationFn: (playerId: string) => api.voteForPlayer(awardId, playerId),
    onMutate: async (playerId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Record<string, string>>(key);
      qc.setQueryData<Record<string, string>>(key, { ...previous, [awardId]: playerId });
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: voteKeys.minePrefix });
      qc.invalidateQueries({ queryKey: voteKeys.tally(awardId) });
    },
  });
}

export function useCloseAward(seasonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (awardId: string) => api.closeAward(awardId),
    onSuccess: (_, awardId) => {
      qc.invalidateQueries({ queryKey: voteKeys.award(awardId) });
      if (seasonId) qc.invalidateQueries({ queryKey: seasonAwardsKeys.list(seasonId) });
    },
  });
}

export function useCreateAward(seasonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, description }: { title: string; description?: string }) =>
      api.createAward(seasonId!, title, description),
    onSuccess: () => {
      if (seasonId) qc.invalidateQueries({ queryKey: seasonAwardsKeys.list(seasonId) });
    },
  });
}

export function useDeleteAward(seasonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (awardId: string) => api.deleteAward(awardId),
    onSuccess: (_, awardId) => {
      qc.removeQueries({ queryKey: voteKeys.award(awardId) });
      qc.invalidateQueries({ queryKey: voteKeys.minePrefix });
      if (seasonId) qc.invalidateQueries({ queryKey: seasonAwardsKeys.list(seasonId) });
    },
  });
}
