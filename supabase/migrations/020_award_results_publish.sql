-- Trophées : clôturer le vote, puis publier les résultats plus tard.
--   1. season_awards.results_hidden : vote clôturé mais résultats pas encore publiés.
--      Les trophées déjà clôturés restent publiés (défaut false) ;
--   2. award_results_visible() : voix lisibles une fois le vote clôturé, et tant qu'il
--      n'est pas publié, par l'admin seul (pour dépouiller) ;
--   3. award_votes : chacun lit son vote ; les autres voix suivent award_results_visible().
--      Avant, toutes les voix étaient lisibles par tous, même pendant le vote ;
--   4. lineup_results applique la même règle aux équipes type.
-- À exécuter dans Supabase → SQL Editor, après la 019. Idempotent.

-- 1. Résultats masqués -----------------------------------------------------------
ALTER TABLE public.season_awards
  ADD COLUMN IF NOT EXISTS results_hidden BOOLEAN NOT NULL DEFAULT false;

-- 2. Qui voit les voix ? ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_results_visible(p_award_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NOT a.is_open AND (NOT a.results_hidden OR public.is_season_admin(a.season_id)),
    false
  )
  FROM public.season_awards a
  WHERE a.id = p_award_id;
$$;

GRANT EXECUTE ON FUNCTION public.award_results_visible(UUID) TO authenticated;

-- 3. Lecture des voix ---------------------------------------------------------------
DROP POLICY IF EXISTS "Votes read" ON public.award_votes;
CREATE POLICY "Votes read" ON public.award_votes FOR SELECT
  USING (voter_id = auth.uid() OR public.award_results_visible(award_id));

-- 4. Équipe type : même règle -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lineup_results(p_award_id UUID)
RETURNS TABLE (slot TEXT, player_id UUID, votes INT, voters INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a RECORD;
BEGIN
  SELECT s.league_id AS lg INTO a
  FROM public.season_awards sa
  JOIN public.seasons s ON s.id = sa.season_id
  WHERE sa.id = p_award_id AND sa.kind = 'lineup';

  IF NOT FOUND OR NOT public.is_league_member(a.lg) THEN RETURN; END IF;
  -- Voix masquées pendant le vote, et jusqu'à la publication sauf pour l'admin
  IF NOT public.award_results_visible(p_award_id) THEN RETURN; END IF;

  RETURN QUERY
  SELECT e.key, e.value::uuid, count(*)::int,
         (SELECT count(*)::int FROM public.award_lineup_votes v2 WHERE v2.award_id = p_award_id)
  FROM public.award_lineup_votes v, jsonb_each_text(v.slots) e
  WHERE v.award_id = p_award_id
  GROUP BY e.key, e.value
  ORDER BY e.key, count(*) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lineup_results(UUID) TO authenticated;
