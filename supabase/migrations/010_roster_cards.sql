-- Mini cartes joueurs : league_roster renvoie aussi la note de la carte et le poste,
-- pour afficher les miniatures dans la compo d'équipe et les votes.
-- Le type de retour change : on supprime puis recrée la fonction (même accès qu'en 006).
-- À exécuter dans Supabase → SQL Editor. Idempotent ; ne touche à aucune donnée.

DROP FUNCTION IF EXISTS public.league_roster(UUID);

CREATE FUNCTION public.league_roster(p_league_id UUID)
RETURNS TABLE (
  player_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT,
  overall INT,
  preferred_position TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.player_id,
    COALESCE(NULLIF(trim(p.display_name), ''), split_part(u.email, '@', 1), 'Joueur') AS display_name,
    p.avatar_url,
    m.role,
    c.overall::int AS overall,
    -- Colonne absente du schéma legacy : lue via jsonb pour ne pas échouer
    NULLIF(to_jsonb(p) ->> 'preferred_position', '') AS preferred_position
  FROM public.league_members m
  LEFT JOIN public.profiles p ON p.id = m.player_id
  LEFT JOIN auth.users u ON u.id = m.player_id
  LEFT JOIN public.player_cards c ON c.player_id = m.player_id
  WHERE m.league_id = p_league_id
    AND public.is_league_member(p_league_id)
  ORDER BY 2;
$$;

GRANT EXECUTE ON FUNCTION public.league_roster(UUID) TO authenticated;
