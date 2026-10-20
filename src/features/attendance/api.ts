import { supabase } from '../../lib/supabase';
import { fetchLeagueById } from '../leagues/api';
import type { League } from '../../types/entities';

export type AttendanceStatus = 'in' | 'out';
export type TeamSide = 'home' | 'away';

export interface Attendance {
  match_id: string;
  user_id: string;
  status: AttendanceStatus;
  team_side: TeamSide | null;
  display_name: string;
  updated_at: string;
  /** Heure du « Je viens », posée par la base (migration 012) */
  in_at?: string | null;
}

/** Levée quand la table match_attendance n'existe pas encore (migration 005 non exécutée). */
export class AttendanceUnavailableError extends Error {
  constructor() {
    super('Inscriptions indisponibles : la migration 005 n’a pas encore été exécutée sur Supabase.');
    this.name = 'AttendanceUnavailableError';
  }
}

function check(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === 'PGRST205' || /match_attendance/.test(error.message)) {
    throw new AttendanceUnavailableError();
  }
  throw error;
}

export async function fetchAttendance(matchId: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('match_attendance')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  check(error);
  return (data ?? []) as Attendance[];
}

export async function fetchAttendanceForMatches(matchIds: string[]): Promise<Attendance[]> {
  if (matchIds.length === 0) return [];
  const { data, error } = await supabase
    .from('match_attendance')
    .select('*')
    .in('match_id', matchIds);
  check(error);
  return (data ?? []) as Attendance[];
}

export async function setMyAttendance(
  matchId: string,
  userId: string,
  status: AttendanceStatus,
  displayName: string
): Promise<void> {
  const { error } = await supabase
    .from('match_attendance')
    .upsert(
      { match_id: matchId, user_id: userId, status, display_name: displayName },
      { onConflict: 'match_id,user_id' }
    );
  check(error);
}

/** Admin : place un inscrit dans une équipe (null = le retirer des équipes). */
export async function setTeamSide(
  matchId: string,
  userId: string,
  teamSide: TeamSide | null
): Promise<void> {
  const { error } = await supabase
    .from('match_attendance')
    .update({ team_side: teamSide })
    .eq('match_id', matchId)
    .eq('user_id', userId);
  check(error);
}

/** Ligue d'un match, pour savoir si l'utilisateur en est l'admin (manager_id ou created_by). */
export async function fetchMatchLeague(seasonId: string): Promise<League | null> {
  const { data, error } = await supabase
    .from('seasons')
    .select('league_id')
    .eq('id', seasonId)
    .single();
  if (error) throw error;
  return data?.league_id ? fetchLeagueById(data.league_id) : null;
}
