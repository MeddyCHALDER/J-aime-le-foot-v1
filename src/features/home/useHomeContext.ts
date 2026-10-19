import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLeagues, useSeasonsByLeague } from '../leagues/hooks';
import { fetchMatchesBySeason } from '../matches/api';
import type { Match } from '../../types/entities';

/** Ligue + saison active + matchs pour l’onglet Matchs V1. */
export function useHomeContext() {
  const leaguesQuery = useLeagues();
  const league = leaguesQuery.data?.[0] ?? null;

  const seasonsQuery = useSeasonsByLeague(league?.id);
  const season = useMemo(() => {
    const list = seasonsQuery.data ?? [];
    return list.find((s) => s.is_active) ?? list[0] ?? null;
  }, [seasonsQuery.data]);

  const matchesQuery = useQuery({
    queryKey: ['home', 'matches', season?.id ?? ''],
    queryFn: () => fetchMatchesBySeason(season!.id),
    enabled: !!season?.id,
  });

  const matches: Match[] = matchesQuery.data ?? [];
  const upcoming = useMemo(
    () =>
      [...matches].sort(
        (a, b) => +new Date(a.kickoff_at) - +new Date(b.kickoff_at)
      ),
    [matches]
  );
  const featured =
    upcoming.find((m) => m.status === 'scheduled' && +new Date(m.kickoff_at) >= Date.now() - 864e5) ??
    upcoming[0] ??
    null;

  return {
    leagues: leaguesQuery.data ?? [],
    league,
    season,
    matches: upcoming,
    featured,
    isLoading: leaguesQuery.isLoading || (!!league && seasonsQuery.isLoading) || (!!season && matchesQuery.isLoading),
    error: leaguesQuery.error || seasonsQuery.error || matchesQuery.error,
    refetch: async () => {
      await leaguesQuery.refetch();
      await seasonsQuery.refetch();
      await matchesQuery.refetch();
    },
  };
}
