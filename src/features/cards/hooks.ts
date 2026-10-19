import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export const cardsKeys = {
  detail: (id: string) => ['player_cards', id] as const,
};

export function usePlayerCard(playerId: string | undefined, position?: string | null) {
  return useQuery({
    queryKey: [...cardsKeys.detail(playerId ?? ''), position ?? ''] as const,
    queryFn: () => api.ensurePlayerCard(playerId!, position),
    enabled: !!playerId,
  });
}

export function useApplyMatchSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => api.applyMatchEventsToCards(matchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['player_cards'] }),
  });
}
