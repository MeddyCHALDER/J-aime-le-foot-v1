import { supabase } from '../../lib/supabase';
import type {
  Match,
  MatchTeam,
  MatchTeamPlayer,
  MatchEvent,
  MatchEventWithPlayer,
  Profile,
} from '../../types/entities';

export async function fetchMatchesBySeason(seasonId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('season_id', seasonId)
    .order('kickoff_at', { ascending: true });
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
  kickoffAt: string,
  location?: string
): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      season_id: seasonId,
      kickoff_at: kickoffAt,
      location: location ?? null,
      status: 'scheduled',
      home_score: 0,
      away_score: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Match;
}

export async function updateMatch(
  id: string,
  updates: Partial<Pick<Match, 'kickoff_at' | 'location' | 'status' | 'home_score' | 'away_score' | 'stream_url' | 'replay_url'>>
): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Match;
}

// Match teams (équipes ponctuelles)
export async function fetchMatchTeams(matchId: string): Promise<MatchTeam[]> {
  const { data, error } = await supabase
    .from('match_teams')
    .select('*')
    .eq('match_id', matchId)
    .order('side');
  if (error) throw error;
  return (data ?? []) as MatchTeam[];
}

export async function fetchMatchTeamsBySeason(seasonId: string): Promise<MatchTeam[]> {
  const { data: matches } = await supabase
    .from('matches')
    .select('id')
    .eq('season_id', seasonId);
  const matchIds = (matches ?? []).map((r) => r.id);
  if (matchIds.length === 0) return [];
  const { data, error } = await supabase
    .from('match_teams')
    .select('*')
    .in('match_id', matchIds)
    .order('match_id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MatchTeam[];
}

export async function fetchMatchTeamPlayersByMatchTeamIds(
  matchTeamIds: string[]
): Promise<Array<MatchTeamPlayer & { match_team_id: string }>> {
  if (matchTeamIds.length === 0) return [];
  const { data, error } = await supabase
    .from('match_team_players')
    .select('*')
    .in('match_team_id', matchTeamIds);
  if (error) throw error;
  return (data ?? []) as Array<MatchTeamPlayer & { match_team_id: string }>;
}

export async function createMatchTeam(
  matchId: string,
  side: 'home' | 'away',
  name: string
): Promise<MatchTeam> {
  const { data, error } = await supabase
    .from('match_teams')
    .insert({ match_id: matchId, side, name })
    .select()
    .single();
  if (error) throw error;
  return data as MatchTeam;
}

export async function fetchMatchTeamPlayers(matchTeamId: string): Promise<Array<MatchTeamPlayer & { profile?: Profile | null }>> {
  const { data, error } = await supabase
    .from('match_team_players')
    .select('*, profile:profiles(*)')
    .eq('match_team_id', matchTeamId);
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    profile: (row as { profile?: Profile | null }).profile ?? null,
  })) as Array<MatchTeamPlayer & { profile?: Profile | null }>;
}

export async function addMatchTeamPlayer(
  matchTeamId: string,
  playerId: string,
  position?: string
): Promise<void> {
  const { error } = await supabase.from('match_team_players').insert({
    match_team_id: matchTeamId,
    player_id: playerId,
    position: position ?? null,
  });
  if (error) throw error;
}

export async function removeMatchTeamPlayer(matchTeamId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('match_team_players')
    .delete()
    .eq('match_team_id', matchTeamId)
    .eq('player_id', playerId);
  if (error) throw error;
}

// Match events
export async function fetchEventsByMatch(matchId: string): Promise<MatchEventWithPlayer[]> {
  const { data, error } = await supabase
    .from('match_events')
    .select('*, profile:profiles(*)')
    .eq('match_id', matchId)
    .order('minute', { ascending: true, nullFirst: true });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    profile: (row as { profile?: Profile | null }).profile ?? null,
  })) as MatchEventWithPlayer[];
}

export async function createMatchEvent(
  matchId: string,
  teamSide: 'home' | 'away',
  playerId: string,
  type: 'goal' | 'assist' | 'yellow' | 'red' | 'mvp',
  minute?: number
): Promise<MatchEvent> {
  const { data, error } = await supabase
    .from('match_events')
    .insert({ match_id: matchId, team_side: teamSide, player_id: playerId, type, minute: minute ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as MatchEvent;
}

export async function fetchEventsBySeason(seasonId: string): Promise<MatchEvent[]> {
  const { data: matches } = await supabase
    .from('matches')
    .select('id')
    .eq('season_id', seasonId);
  const ids = (matches ?? []).map((r) => r.id);
  if (ids.length === 0) return [];
  const { data: events, error } = await supabase
    .from('match_events')
    .select('*')
    .in('match_id', ids);
  if (error) throw error;
  return (events ?? []) as MatchEvent[];
}
