import { getAppUrl, supabase } from '../../lib/supabase';

export async function signUp(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName ?? email.split('@')[0] } },
  });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Envoie l’email de réinitialisation brandé via Edge Function + Resend. */
export async function requestPasswordReset(email: string) {
  const { data, error } = await supabase.functions.invoke('send-password-reset', {
    body: { email: email.trim().toLowerCase() },
  });
  if (error) throw new Error(error.message || 'Envoi impossible');
  if (data?.error) throw new Error(String(data.error));
  return data as { ok: boolean; id?: string };
}

/** Définit le nouveau mot de passe après clic sur le lien de recovery. */
export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data.user;
}

export function getSession() {
  return supabase.auth.getSession().then(({ data }) => data.session);
}

export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
}
