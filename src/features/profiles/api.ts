import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/entities';

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Profile;
}

export async function updateProfile(
  id: string,
  updates: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'preferred_position' | 'strong_foot' | 'bio'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}
