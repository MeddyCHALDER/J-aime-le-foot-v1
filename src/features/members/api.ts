import { supabase } from '../../lib/supabase';
import type { LeagueMemberWithProfile, Profile } from '../../types/entities';

export async function fetchLeagueMembersWithProfiles(
  leagueId: string
): Promise<LeagueMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('league_members')
    .select('*, profile:profiles(*)')
    .eq('league_id', leagueId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    profile: row.profile as Profile | null,
  })) as LeagueMemberWithProfile[];
}

export async function addLeagueMember(
  leagueId: string,
  playerId: string,
  role: 'admin' | 'player' = 'player'
): Promise<void> {
  const { error } = await supabase.from('league_members').insert({
    league_id: leagueId,
    player_id: playerId,
    role,
  });
  if (error) throw error;
}

export async function removeLeagueMember(leagueId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('player_id', playerId);
  if (error) throw error;
}

export interface RosterPlayer {
  player_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'admin' | 'player';
  /** Note de la carte et poste (migration 010 ; absents avant) */
  overall?: number | null;
  preferred_position?: string | null;
  /** 'pending' (demande à valider), 'active', 'suspended' — migration 015 */
  status?: 'pending' | 'active' | 'suspended';
}

/** Joueur qui peut agir et être choisi dans un vote (accepté, non suspendu). */
export function isActivePlayer(p: Pick<RosterPlayer, 'status'>) {
  return !p.status || p.status === 'active';
}

/** Tous les joueurs d'une ligue, noms compris (fonction league_roster, migration 006). */
export async function fetchLeagueRoster(leagueId: string): Promise<RosterPlayer[]> {
  const { data, error } = await supabase.rpc('league_roster', { p_league_id: leagueId });
  if (error) throw error;
  return (data ?? []) as RosterPlayer[];
}

/** Quitter une ligue (règle « Members leave », migration 006). */
export async function leaveLeague(leagueId: string, playerId: string): Promise<void> {
  const { error, count } = await supabase
    .from('league_members')
    .delete({ count: 'exact' })
    .eq('league_id', leagueId)
    .eq('player_id', playerId);
  if (error) throw error;
  // RLS : une suppression refusée ne renvoie pas d'erreur, juste 0 ligne.
  if (count === 0) throw new Error('Impossible de quitter cette ligue.');
}

/** Admin : accepter une demande, suspendre ou réintégrer un joueur. */
export async function setMemberStatus(
  leagueId: string,
  playerId: string,
  status: 'active' | 'suspended'
): Promise<void> {
  const { error } = await supabase.rpc('set_member_status', {
    p_league_id: leagueId,
    p_player_id: playerId,
    p_status: status,
  });
  if (error) throw error;
}

/** Admin : retirer un joueur ou refuser une demande (contrôle côté base). */
export async function kickLeagueMember(leagueId: string, playerId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_league_member', {
    p_league_id: leagueId,
    p_player_id: playerId,
  });
  if (error) throw error;
}

/** Admin : nouveau code d'invitation (l'ancien lien ne marche plus). */
export async function regenerateInviteCode(leagueId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_invite_code', { p_league_id: leagueId });
  if (error) throw error;
  return String(data);
}

export interface JoinRequest {
  league_id: string;
  league_name: string;
  requested_at: string;
}

/** Mes demandes en attente de validation par l'admin. */
export async function fetchMyJoinRequests(): Promise<JoinRequest[]> {
  const { data, error } = await supabase.rpc('my_join_requests');
  // Fonction absente (migration 015 non passée) : aucune demande
  if (error) return [];
  return (data ?? []) as JoinRequest[];
}
