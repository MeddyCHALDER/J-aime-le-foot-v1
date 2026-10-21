-- Ouverture programmée des votes : un trophée peut être visible avant que l'on puisse voter.
--   1. season_awards.opens_at (NULL = vote possible tout de suite) ;
--   2. cast_award_vote et la règle d'insertion refusent un vote avant l'heure ;
--   3. les trophées classiques déjà créés ouvrent le vendredi 23 octobre 2026 à 9h (Paris).
-- À exécuter dans Supabase → SQL Editor, après la 010. Idempotent.

-- 1. Heure d'ouverture -------------------------------------------------------
ALTER TABLE public.season_awards
  ADD COLUMN IF NOT EXISTS opens_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.award_voting_started(p_award_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.is_open AND (a.opens_at IS NULL OR a.opens_at <= now())
  FROM public.season_awards a
  WHERE a.id = p_award_id;
$$;

-- 2. Vote : même contrat que la 010, plus l'heure d'ouverture -------------------
CREATE OR REPLACE FUNCTION public.cast_award_vote(p_award_id UUID, p_player_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lid UUID;
  open_ BOOLEAN;
  opens TIMESTAMPTZ;
  nid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT s.league_id, a.is_open, a.opens_at INTO lid, open_, opens
  FROM public.season_awards a
  JOIN public.seasons s ON s.id = a.season_id
  WHERE a.id = p_award_id;

  IF lid IS NULL THEN
    RAISE EXCEPTION 'Trophée introuvable';
  END IF;
  IF NOT open_ THEN
    RAISE EXCEPTION 'Ce vote est clôturé';
  END IF;
  IF opens IS NOT NULL AND opens > now() THEN
    RAISE EXCEPTION 'Le vote ouvre le % à %',
      to_char(opens AT TIME ZONE 'Europe/Paris', 'DD/MM'),
      to_char(opens AT TIME ZONE 'Europe/Paris', 'HH24"h"MI');
  END IF;
  IF NOT public.is_league_member(lid) THEN
    RAISE EXCEPTION 'Tu dois être membre de la ligue pour voter';
  END IF;
  IF p_player_id = auth.uid() THEN
    RAISE EXCEPTION 'Tu ne peux pas voter pour toi';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.league_members m WHERE m.league_id = lid AND m.player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'Ce joueur n''est pas dans la ligue';
  END IF;
  IF NOT public.award_accepts_player(p_award_id, p_player_id) THEN
    RAISE EXCEPTION 'Ce trophée est réservé à d''autres postes';
  END IF;

  BEGIN
    INSERT INTO public.profiles (id) VALUES (p_player_id), (auth.uid())
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN not_null_violation THEN
    NULL;
  END;

  INSERT INTO public.award_nominations (award_id, player_id)
  VALUES (p_award_id, p_player_id)
  ON CONFLICT (award_id, player_id) DO NOTHING;

  SELECT id INTO nid FROM public.award_nominations
  WHERE award_id = p_award_id AND player_id = p_player_id;

  INSERT INTO public.award_votes (award_id, nomination_id, voter_id)
  VALUES (p_award_id, nid, auth.uid())
  ON CONFLICT (award_id, voter_id) DO UPDATE SET nomination_id = EXCLUDED.nomination_id;

  RETURN nid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_award_vote(UUID, UUID) TO authenticated;

-- L'ancienne voie d'écriture directe (règle de la 004) respecte aussi l'heure d'ouverture.
DROP POLICY IF EXISTS "Votes insert member" ON public.award_votes;
CREATE POLICY "Votes insert member" ON public.award_votes FOR INSERT
  WITH CHECK (auth.uid() = voter_id AND public.award_voting_started(award_id));

DROP POLICY IF EXISTS "Votes update own" ON public.award_votes;
CREATE POLICY "Votes update own" ON public.award_votes FOR UPDATE
  USING (auth.uid() = voter_id)
  WITH CHECK (auth.uid() = voter_id AND public.award_voting_started(award_id));

-- 3. Trophées classiques existants : vote à partir du vendredi 23 octobre 2026, 9h ------
-- Sans effet une fois la date passée ou si l'heure a déjà été fixée.
UPDATE public.season_awards
SET opens_at = TIMESTAMPTZ '2026-10-23 09:00:00 Europe/Paris'
WHERE type <> 'custom'
  AND opens_at IS NULL
  AND is_open
  AND now() < TIMESTAMPTZ '2026-10-23 09:00:00 Europe/Paris';
