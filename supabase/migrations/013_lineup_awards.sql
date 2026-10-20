-- Trophée « équipe type » (meilleur 11, 9, 8…) : chaque votant place des joueurs sur un terrain.
--   1. season_awards.kind ('single' = un joueur, 'lineup' = équipe type), lineup_size, formation ;
--   2. award_lineup_votes : une compo par votant (poste → joueur) ;
--   3. cast_lineup_vote : enregistre la compo après contrôle (membres, nombre, pas de doublon) ;
--   4. set_lineup_format : l'admin change le format (11 → 9…) ; les compos déjà votées sont effacées ;
--   5. lineup_results : voix par poste, visibles une fois le vote clôturé.
-- À exécuter dans Supabase → SQL Editor. Idempotent ; ne supprime aucune donnée existante.

-- 1. Type de trophée -----------------------------------------------------------
ALTER TABLE public.season_awards
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS lineup_size INT,
  ADD COLUMN IF NOT EXISTS formation TEXT;

DO $$
BEGIN
  ALTER TABLE public.season_awards
    ADD CONSTRAINT season_awards_kind_check CHECK (kind IN ('single', 'lineup'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.season_awards
    ADD CONSTRAINT season_awards_lineup_check CHECK (
      kind = 'single'
      OR (lineup_size BETWEEN 5 AND 11 AND formation ~ '^[0-9](-[0-9]){1,4}$')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Compos votées -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.award_lineup_votes (
  award_id UUID NOT NULL REFERENCES public.season_awards(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- { "GK": "<uuid joueur>", "0-0": "<uuid>", … } : poste → joueur
  slots JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (award_id, voter_id)
);

ALTER TABLE public.award_lineup_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lineup read own" ON public.award_lineup_votes;
-- Chacun ne lit que sa compo ; l'écriture passe par cast_lineup_vote, les résultats par lineup_results.
CREATE POLICY "Lineup read own" ON public.award_lineup_votes
  FOR SELECT TO authenticated USING (voter_id = auth.uid());

-- 3. Voter -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_lineup_vote(p_award_id UUID, p_slots JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a RECORD;
  lid UUID;
  n INT;
  distinct_n INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT sa.*, s.league_id AS lg INTO a
  FROM public.season_awards sa
  JOIN public.seasons s ON s.id = sa.season_id
  WHERE sa.id = p_award_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Trophée introuvable'; END IF;
  IF a.kind <> 'lineup' THEN RAISE EXCEPTION 'Ce trophée se vote pour un seul joueur'; END IF;
  IF NOT a.is_open THEN RAISE EXCEPTION 'Ce vote est clôturé'; END IF;
  lid := a.lg;
  IF NOT public.is_league_member(lid) THEN
    RAISE EXCEPTION 'Tu dois être membre de la ligue pour voter';
  END IF;
  IF jsonb_typeof(p_slots) <> 'object' THEN RAISE EXCEPTION 'Compo invalide'; END IF;

  SELECT count(*), count(DISTINCT value) INTO n, distinct_n FROM jsonb_each_text(p_slots);
  IF n <> a.lineup_size THEN
    RAISE EXCEPTION 'Place les % joueurs avant de valider', a.lineup_size;
  END IF;
  IF distinct_n <> n THEN RAISE EXCEPTION 'Un joueur ne peut occuper qu''un seul poste'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each_text(p_slots) WHERE value = auth.uid()::text) THEN
    RAISE EXCEPTION 'Tu ne peux pas te mettre dans ton équipe type';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each_text(p_slots) e
    WHERE NOT EXISTS (
      SELECT 1 FROM public.league_members m
      WHERE m.league_id = lid AND m.player_id::text = e.value
    )
  ) THEN
    RAISE EXCEPTION 'Un des joueurs n''est pas dans la ligue';
  END IF;

  INSERT INTO public.award_lineup_votes (award_id, voter_id, slots, updated_at)
  VALUES (p_award_id, auth.uid(), p_slots, now())
  ON CONFLICT (award_id, voter_id) DO UPDATE SET slots = EXCLUDED.slots, updated_at = now();
END;
$$;

-- 4. Changer de format (admin) --------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_lineup_format(p_award_id UUID, p_size INT, p_formation TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid UUID;
  removed INT;
BEGIN
  SELECT season_id INTO sid FROM public.season_awards WHERE id = p_award_id AND kind = 'lineup';
  IF sid IS NULL THEN RAISE EXCEPTION 'Équipe type introuvable'; END IF;
  IF NOT public.is_season_admin(sid) THEN
    RAISE EXCEPTION 'Seul l''admin de la ligue peut changer le format';
  END IF;

  UPDATE public.season_awards
  SET lineup_size = p_size, formation = p_formation
  WHERE id = p_award_id;

  -- Les postes changent : les compos déjà votées ne correspondent plus
  DELETE FROM public.award_lineup_votes WHERE award_id = p_award_id;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

-- 5. Résultats (après clôture) ---------------------------------------------------
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
  SELECT sa.is_open, s.league_id AS lg INTO a
  FROM public.season_awards sa
  JOIN public.seasons s ON s.id = sa.season_id
  WHERE sa.id = p_award_id AND sa.kind = 'lineup';

  IF NOT FOUND OR NOT public.is_league_member(a.lg) THEN RETURN; END IF;
  -- Voix masquées pendant le vote pour ne pas influencer
  IF a.is_open THEN RETURN; END IF;

  RETURN QUERY
  SELECT e.key, e.value::uuid, count(*)::int,
         (SELECT count(*)::int FROM public.award_lineup_votes v2 WHERE v2.award_id = p_award_id)
  FROM public.award_lineup_votes v, jsonb_each_text(v.slots) e
  WHERE v.award_id = p_award_id
  GROUP BY e.key, e.value
  ORDER BY e.key, count(*) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_lineup_vote(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_lineup_format(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lineup_results(UUID) TO authenticated;
