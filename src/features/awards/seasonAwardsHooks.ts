import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './seasonAwardsApi';
import { announceVotesOpen } from '../notifications/api';

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
    onSuccess: (created, v) => {
      qc.invalidateQueries({ queryKey: seasonAwardsKeys.list(v.seasonId) });
      // Une seule notification pour tous les trophées ajoutés d'un coup.
      void announceVotesOpen(created.map((a) => a.id));
    },
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
    mutationFn: ({
      title,
      description,
      lineup,
      positions,
    }: {
      title: string;
      description?: string;
      lineup?: { size: number; formation: string };
      positions?: string[];
    }) => api.createAward(seasonId!, title, description, lineup, positions),
    onSuccess: (award) => {
      if (seasonId) qc.invalidateQueries({ queryKey: seasonAwardsKeys.list(seasonId) });
      void announceVotesOpen([award.id]);
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

export const lineupKeys = {
  mine: (voterId: string, awardIds: string[]) => ['award_my_lineups', voterId, ...awardIds] as const,
  minePrefix: ['award_my_lineups'] as const,
  results: (awardId: string) => ['award_lineup_results', awardId] as const,
};

export function useMyLineups(awardIds: string[], voterId: string | undefined) {
  return useQuery({
    queryKey: lineupKeys.mine(voterId ?? '', awardIds),
    queryFn: () => api.fetchMyLineups(awardIds, voterId!),
    enabled: !!voterId && awardIds.length > 0,
  });
}

export function useCastLineupVote(awardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slots: api.LineupSlots) => api.castLineupVote(awardId, slots),
    onSuccess: () => qc.invalidateQueries({ queryKey: lineupKeys.minePrefix }),
  });
}

export function useSetLineupFormat(awardId: string, seasonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ size, formation }: { size: number; formation: string }) =>
      api.setLineupFormat(awardId, size, formation),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: voteKeys.award(awardId) });
      qc.invalidateQueries({ queryKey: lineupKeys.minePrefix });
      if (seasonId) qc.invalidateQueries({ queryKey: seasonAwardsKeys.list(seasonId) });
    },
  });
}

export function useLineupResults(awardId: string, enabled: boolean) {
  return useQuery({
    queryKey: lineupKeys.results(awardId),
    queryFn: () => api.fetchLineupResults(awardId),
    enabled,
  });
}

/** Admin : lignes qui peuvent recevoir des voix pour un trophée. */
export function useUpdateAwardPositions(awardId: string, seasonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (positions: string[]) => api.updateAwardPositions(awardId, positions),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: voteKeys.award(awardId) });
      // Des voix ont pu être retirées : choix et décompte sont à relire.
      qc.invalidateQueries({ queryKey: voteKeys.minePrefix });
      qc.invalidateQueries({ queryKey: voteKeys.tally(awardId) });
      if (seasonId) qc.invalidateQueries({ queryKey: seasonAwardsKeys.list(seasonId) });
    },
  });
}

/**
 * Heure courante, rafraîchie à la prochaine ouverture de vote : un écran resté
 * affiché bascule tout seul sur « Ouvert » à l'heure dite.
 */
export function useNowUntil(opensAt: (string | null | undefined)[]) {
  const [now, setNow] = useState(() => Date.now());
  const next = opensAt
    .map((iso) => (iso ? Date.parse(iso) : NaN))
    .filter((t) => t > now)
    .sort((a, b) => a - b)[0];
  useEffect(() => {
    if (!next) return;
    // setTimeout plafonne à ~24 jours : au-delà, un rechargement suffira.
    const delay = Math.min(next - Date.now() + 500, 2_000_000_000);
    const id = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(id);
  }, [next]);
  return now;
}

/** Le votant retire son vote : le trophée redevient « à voter ». */
export function useWithdrawVote(awardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.withdrawVote(awardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: voteKeys.minePrefix });
      qc.invalidateQueries({ queryKey: lineupKeys.minePrefix });
    },
  });
}
