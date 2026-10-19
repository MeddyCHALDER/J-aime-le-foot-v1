import { supabase } from '../lib/supabase';
import type { Match, Team } from '../types/database';

export interface MatchWithTeamsRow extends Match {
  home_team?: Team | null;
  away_team?: Team | null;
}

export async function fetchMatchesBySeason(seasonId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('season_id', seasonId)
    .order('match_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Match[];
}

export async function fetchMatchById(id: string): Promise<Match | null> {
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Match;
}

export async function createMatch(
  seasonId: string,
  homeTeamId: string,
  awayTeamId: string,
  matchDate: string
) {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      season_id: seasonId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      match_date: matchDate,
      status: 'scheduled',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Match;
}

export async function updateMatch(
  id: string,
  updates: Partial<
    Pick<Match, 'match_date' | 'home_score' | 'away_score' | 'status' | 'stream_url' | 'replay_url'>
  >
) {
  const { data, error } = await supabase.from('matches').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Match;
}

export async function setMatchResult(id: string, homeScore: number, awayScore: number) {
  return updateMatch(id, { home_score: homeScore, away_score: awayScore, status: 'played' });
}

export async function deleteMatch(id: string) {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) throw error;
}

/** Enrichit un match avec les équipes (à appeler côté app si besoin). */
export function withTeams(match: Match, homeTeam: Team | null, awayTeam: Team | null): MatchWithTeamsRow {
  return { ...match, home_team: homeTeam, away_team: awayTeam };
}
