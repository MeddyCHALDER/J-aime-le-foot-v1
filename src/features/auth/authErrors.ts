/** Traduit les messages Supabase les plus courants. */
export function authErrorMessage(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : '';
  if (/invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect.';
  if (/email not confirmed/i.test(msg)) return 'Confirme ton adresse email avant de te connecter.';
  if (/already registered/i.test(msg)) return 'Un compte existe déjà avec cet email.';
  if (/network|fetch/i.test(msg)) return 'Pas de connexion. Vérifie ton réseau et réessaie.';
  return msg || fallback;
}
