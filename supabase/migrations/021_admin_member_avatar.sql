-- L'admin d'une ligue peut changer la photo (carte FIFA) d'un joueur de sa ligue.
--   profiles n'autorise la mise à jour que de son propre profil : on passe par une
--   fonction SECURITY DEFINER qui vérifie que l'appelant est admin d'une ligue dont le
--   joueur est membre, et ne touche qu'à avatar_url.
-- Lecture des profils : l'écran « Carte et photo » (et le profil d'un joueur ouvert
--   depuis un match) lit le profil d'un autre joueur. La policy d'origine (001) ne
--   laissait lire que son propre profil → page noire. Tout joueur connecté peut lire
--   les profils (pseudo, poste, photo, bio), comme le prévoyait la 002.
-- À exécuter dans Supabase → SQL Editor, après la 020. Idempotent.

CREATE OR REPLACE FUNCTION public.admin_set_member_avatar(p_player_id UUID, p_avatar_url TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.league_members m
    JOIN public.leagues l ON l.id = m.league_id
    WHERE m.player_id = p_player_id AND l.created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Seul l''admin de la ligue du joueur peut changer sa photo';
  END IF;

  IF p_avatar_url IS NOT NULL AND p_avatar_url !~ '^https://' THEN
    RAISE EXCEPTION 'URL de photo invalide';
  END IF;

  UPDATE public.profiles SET avatar_url = p_avatar_url WHERE id = p_player_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_member_avatar(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_member_avatar(UUID, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Profiles read authenticated" ON public.profiles;
CREATE POLICY "Profiles read authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
