import { useMutation } from '@tanstack/react-query';
import * as api from './api';

export function useSendLeagueInvite() {
  return useMutation({
    mutationFn: ({ leagueId, email }: { leagueId: string; email: string }) =>
      api.sendLeagueInviteEmail(leagueId, email),
  });
}
