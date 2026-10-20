import { supabase } from '../../lib/supabase';
import type {
  Match,
  MatchStatus,
  MatchTeam,
  MatchTeamPlayer,
  MatchEvent,
  MatchEventWithPlayer,
  Profile,
} from '../../types/entities';

/** Normalise une ligne DB (legacy match_date ou V1 kickoff_at). */
function normalizeMatch(row: Record<string, unknown>): Match {
  const kickoff =
    (row.kickoff_at as string | undefined) ??
    (row.match_date as string | undefined) ??
    new Date().toISOString();
  return {
    id: String(row.id),
    season_id: String(row.season_id),
    kickoff_at: kickoff,
    location: (row.location as string | null) ?? null,
    status: (row.status as MatchStatus) ?? 'scheduled',
    home_score: Number(row.home_score ?? 0),
    away_score: Number(row.away_score ?? 0),
    stream_url: (row.stream_url as string | null) ?? null,
    replay_url: (row.replay_url as string | null) ?? null,
    registration_opens_at: (row.registration_opens_at as string | null) ?? null,
    max_players: row.max_players == null ? null : Number(row.max_players),
    created_at: String(row.created_at ?? ''),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function fetchMatchesBySeason(seasonId: string): Promise<Match[]> {
  // Schéma legacy : match_date ; V1 : kickoff_at
  let res = await supabase
    .from('matches')
    .select('*')
    .eq('season_id', seasonId)
    .order('match_date', { ascending: true });

  if (res.error && /match_date/i.test(res.error.message)) {
    res = await supabase
      .from('matches')
      .select('*')
      .eq('season_id', seasonId)
      .order('kickoff_at', { ascending: true });
  }

  if (res.error) throw res.error;
  return (res.data ?? []).map((r) => normalizeMatch(r as Record<string, unknown>));
}

export async function fetchMatchById(id: string): Promise<Match | null> {
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return normalizeMatch(data as Record<string, unknown>);
}

export async function createMatch(
  seasonId: string,
  kickoffAt: string,
  location?: string,
  /** ISO ; absent = inscriptions ouvertes tout de suite */
  registrationOpensAt?: string | null,
  /** Nombre de places ; absent = illimité */
  maxPlayers?: number | null
): Promise<Match> {
  // Ajoutés seulement si renseignés : colonnes des migrations 011 et 012.
  const opening = {
    ...(registrationOpensAt ? { registration_opens_at: registrationOpensAt } : {}),
    ...(maxPlayers ? { max_players: maxPlayers } : {}),
  };
  // V1 (kickoff_at + location)
  {
    const res = await supabase
      .from('matches')
      .insert({
        season_id: seasonId,
        kickoff_at: kickoffAt,
        location: location ?? null,
        status: 'scheduled',
        home_score: 0,
        away_score: 0,
        ...opening,
      })
      .select()
      .single();
    if (!res.error && res.data) return normalizeMatch(res.data as Record<string, unknown>);
  }

  // Legacy : match_date + équipes obligatoires → on crée deux équipes placeholder
  const homeName = 'Équipe A';
  const awayName = 'Équipe B';
  const { data: homeTeam, error: hErr } = await supabase
    .from('teams')
    .insert({ season_id: seasonId, name: homeName })
    .select()
    .single();
  if (hErr) throw hErr;
  const { data: awayTeam, error: aErr } = await supabase
    .from('teams')
    .insert({ season_id: seasonId, name: awayName })
    .select()
    .single();
  if (aErr) throw aErr;

  const { data, error } = await supabase
    .from('matches')
    .insert({
      season_id: seasonId,
      match_date: kickoffAt,
      home_team_id: homeTeam.id,
      away_team_id: awayTeam.id,
      status: 'scheduled',
      home_score: 0,
      away_score: 0,
      ...opening,
    })
    .select()
    .single();
  if (error) throw error;
  return normalizeMatch(data as Record<string, unknown>);
}

export async function updateMatch(
  id: string,
  updates: Partial<
    Pick<
      Match,
      | 'kickoff_at'
      | 'location'
      | 'status'
      | 'home_score'
      | 'away_score'
      | 'stream_url'
      | 'replay_url'
      | 'registration_opens_at'
      | 'max_players'
    >
  >
): Promise<Match> {
  const payload: Record<string, unknown> = { ...updates };
  if (updates.kickoff_at) {
    payload.match_date = updates.kickoff_at;
  }
  const { data, error } = await supabase
    .from('matches')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    // Retry sans match_date si colonne absente
    const { kickoff_at: _k, match_date: _m, ...rest } = payload as Record<string, unknown> & {
      kickoff_at?: string;
      match_date?: string;
    };
    const retry = await supabase.from('matches').update(rest).eq('id', id).select().single();
    if (retry.error) throw retry.error;
    return normalizeMatch(retry.data as Record<string, unknown>);
  }
  return normalizeMatch(data as Record<string, unknown>);
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
  const { data: matches } = await supabase.from('matches').select('id').eq('season_id', seasonId);
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

export async function fetchMatchTeamPlayers(
  matchTeamId: string
): Promise<Array<MatchTeamPlayer & { profile?: Profile | null }>> {
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
    .order('minute', { ascending: true, nullsFirst: true });
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
    .insert({
      match_id: matchId,
      team_side: teamSide,
      player_id: playerId,
      type,
      minute: minute ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as MatchEvent;
}

export async function fetchEventsBySeason(seasonId: string): Promise<MatchEvent[]> {
  const { data: matches } = await supabase.from('matches').select('id').eq('season_id', seasonId);
  const ids = (matches ?? []).map((r) => r.id);
  if (ids.length === 0) return [];
  const { data: events, error } = await supabase.from('match_events').select('*').in('match_id', ids);
  if (error) throw error;
  return (events ?? []) as MatchEvent[];
}
