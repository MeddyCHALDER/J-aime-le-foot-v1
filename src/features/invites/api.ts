import { supabase } from '../../lib/supabase';

export async function sendLeagueInviteEmail(leagueId: string, email: string) {
  const { data, error } = await supabase.functions.invoke('send-invite', {
    body: { leagueId, email: email.trim().toLowerCase() },
  });

  if (error) {
    throw new Error(error.message || 'Envoi impossible');
  }
  if (data?.error) {
    throw new Error(String(data.error));
  }
  return data as { ok: boolean; id?: string };
}
