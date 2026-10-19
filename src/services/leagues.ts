import { supabase } from '../lib/supabase';
import type { League } from '../types/database';

export async function fetchLeagues(): Promise<League[]> {
  const { data, error } = await supabase.from('leagues').select('*').order('name');
  if (error) throw error;
  return data as League[];
}

export async function fetchLeaguesFollowedByUser(userId: string): Promise<League[]> {
  const { data: follows, error: err1 } = await supabase
    .from('league_follows')
    .select('league_id')
    .eq('user_id', userId);
  if (err1) throw err1;
  if (!follows?.length) return [];
  const ids = follows.map((f: { league_id: string }) => f.league_id);
  const { data, error } = await supabase.from('leagues').select('*').in('id', ids).order('name');
  if (error) throw error;
  return (data ?? []) as League[];
}

export async function fetchLeagueById(id: string): Promise<League | null> {
  const { data, error } = await supabase.from('leagues').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as League;
}

export async function createLeague(name: string, description?: string, managerId: string) {
  const { data, error } = await supabase
    .from('leagues')
    .insert({ name, description, manager_id: managerId })
    .select()
    .single();
  if (error) throw error;
  return data as League;
}

export async function updateLeague(id: string, updates: Partial<Pick<League, 'name' | 'description'>>) {
  const { data, error } = await supabase.from('leagues').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as League;
}

export async function deleteLeague(id: string) {
  const { error } = await supabase.from('leagues').delete().eq('id', id);
  if (error) throw error;
}

export async function followLeague(userId: string, leagueId: string) {
  const { error } = await supabase.from('league_follows').insert({ user_id: userId, league_id: leagueId });
  if (error) throw error;
}

export async function unfollowLeague(userId: string, leagueId: string) {
  const { error } = await supabase.from('league_follows').delete().eq('user_id', userId).eq('league_id', leagueId);
  if (error) throw error;
}

export async function isFollowingLeague(userId: string, leagueId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('league_follows')
    .select('id')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
