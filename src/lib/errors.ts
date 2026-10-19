/** Message lisible pour une erreur JS ou Supabase (PostgrestError est un objet simple, pas une Error). */
export function toErrorMessage(e: unknown, fallback = 'Une erreur est survenue'): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') return e.message;
  if (typeof e === 'string') return e;
  return fallback;
}
