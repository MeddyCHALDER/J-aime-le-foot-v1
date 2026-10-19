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
