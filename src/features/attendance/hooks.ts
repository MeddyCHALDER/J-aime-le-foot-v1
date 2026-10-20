import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/hooks';
import { useProfile } from '../profiles/hooks';
import * as api from './api';
import type { Attendance, AttendanceStatus, TeamSide } from './api';

export const attendanceKeys = {
  match: (matchId: string) => ['attendance', matchId] as const,
  league: (seasonId: string) => ['attendance', 'league', seasonId] as const,
};

export function useAttendance(matchId: string | undefined) {
  return useQuery({
    queryKey: attendanceKeys.match(matchId ?? ''),
    queryFn: () => api.fetchAttendance(matchId!),
    enabled: !!matchId,
    // Une table absente ne se répare pas en réessayant.
    retry: (count, error) => !(error instanceof api.AttendanceUnavailableError) && count < 2,
  });
}

/** Ligue du match + droit admin de l'utilisateur courant. */
export function useMatchAdmin(seasonId: string | undefined) {
  const { user } = useAuth();
  const league = useQuery({
    queryKey: attendanceKeys.league(seasonId ?? ''),
    queryFn: () => api.fetchMatchLeague(seasonId!),
    enabled: !!seasonId,
  });
  return {
    league: league.data ?? null,
    isAdmin: !!user?.id && league.data?.created_by === user.id,
  };
}

/** Nom affiché copié dans l'inscription. */
export function useMyDisplayName() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  return profile?.display_name || user?.email?.split('@')[0] || 'Joueur';
}

/** Mise à jour optimiste d'une ligne d'inscription dans le cache. */
function patchCache(
  qc: ReturnType<typeof useQueryClient>,
  matchId: string,
  userId: string,
  patch: (row: Attendance | undefined) => Attendance | undefined
) {
  const key = attendanceKeys.match(matchId);
  const previous = qc.getQueryData<Attendance[]>(key);
  if (previous) {
    const current = previous.find((r) => r.user_id === userId);
    const next = patch(current);
    const rest = previous.filter((r) => r.user_id !== userId);
    qc.setQueryData<Attendance[]>(key, next ? [...rest, next] : rest);
  }
  return { key, previous };
}

export function useSetMyAttendance(matchId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const displayName = useMyDisplayName();
  return useMutation({
    mutationFn: (status: AttendanceStatus) =>
      api.setMyAttendance(matchId, user!.id, status, displayName),
    onMutate: async (status) => {
      await qc.cancelQueries({ queryKey: attendanceKeys.match(matchId) });
      return patchCache(qc, matchId, user!.id, (row) => ({
        match_id: matchId,
        user_id: user!.id,
        display_name: displayName,
        updated_at: new Date().toISOString(),
        ...row,
        status,
        team_side: status === 'out' ? null : row?.team_side ?? null,
        // Même règle que la base : l'heure d'arrivée ne change pas si on était déjà inscrit
        in_at:
          status === 'in'
            ? row?.status === 'in'
              ? row.in_at ?? null
              : new Date().toISOString()
            : null,
      }));
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: attendanceKeys.match(matchId) }),
  });
}

export function useSetTeamSide(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, teamSide }: { userId: string; teamSide: TeamSide | null }) =>
      api.setTeamSide(matchId, userId, teamSide),
    onMutate: async ({ userId, teamSide }) => {
      await qc.cancelQueries({ queryKey: attendanceKeys.match(matchId) });
      return patchCache(qc, matchId, userId, (row) => (row ? { ...row, team_side: teamSide } : row));
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: attendanceKeys.match(matchId) }),
  });
}
