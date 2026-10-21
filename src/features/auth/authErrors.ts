/** Traduit les messages Supabase les plus courants. */
export function authErrorMessage(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : '';
  if (/invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect.';
  if (/email not confirmed/i.test(msg)) return 'Confirme ton adresse email avant de te connecter.';
  if (/already registered/i.test(msg)) return 'Un compte existe déjà avec cet email.';
  // Quota d'emails de Supabase (inscription, mot de passe oublié) atteint pour l'heure
  if (/email rate limit|over_email_send_rate_limit/i.test(msg)) {
    return 'Trop d’inscriptions en ce moment : réessaie dans une heure. Si ça persiste, préviens l’admin de ta ligue.';
  }
  if (/rate limit|too many requests/i.test(msg)) return 'Trop de tentatives : patiente quelques minutes et réessaie.';
  if (/network|fetch/i.test(msg)) return 'Pas de connexion. Vérifie ton réseau et réessaie.';
  return msg || fallback;
}
