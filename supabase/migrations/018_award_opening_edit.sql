-- Ouverture des votes choisie par l'admin, à la création comme après.
--   1. Ouverture repoussée dans le futur : l'annonce « votes ouverts » déjà envoyée est
--      oubliée, pour que la tâche planifiée (migration 016) prévienne à la nouvelle heure ;
--   2. cast_lineup_vote (version 015) refuse aussi les équipes type avant l'ouverture ;
--   3. league_roster renvoie le statut (et la note) : en prod, la version de la 006 était
--      restée en place, donc l'admin voyait les demandes en attente comme joueurs actifs.
-- À exécuter dans Supabase → SQL Editor, après la 017. Idempotent.

-- 1. Nouvelle heure d'ouverture : nouvelle annonce ----------------------------------
CREATE OR REPLACE FUNCTION public.season_awards_reset_announce()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.opens_at IS NOT NULL AND NEW.opens_at > now() THEN
    DELETE FROM public.push_sent WHERE kind = 'vote_open' AND ref_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS season_awards_reset_announce ON public.season_awards;
CREATE TRIGGER season_awards_reset_announce
  AFTER UPDATE OF opens_at ON public.season_awards
  FOR EACH ROW
  WHEN (OLD.opens_at IS DISTINCT FROM NEW.opens_at)
  EXECUTE FUNCTION public.season_awards_reset_announce();

-- 2. Équipe type : même contrat que la 015, plus l'heure d'ouverture -------------------
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
  IF a.opens_at IS NOT NULL AND a.opens_at > now() THEN
    RAISE EXCEPTION 'Le vote ouvre le %',
      to_char(a.opens_at AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24:MI');
  END IF;
  lid := a.lg;
  IF NOT public.is_active_member(lid) THEN
    RAISE EXCEPTION 'Tu dois être membre actif de la ligue pour voter';
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
    WHERE NOT public.is_active_member(lid, e.value::uuid)
  ) THEN
    RAISE EXCEPTION 'Un des joueurs n''est pas (ou plus) actif dans la ligue';
  END IF;

  INSERT INTO public.award_lineup_votes (award_id, voter_id, slots, updated_at)
  VALUES (p_award_id, auth.uid(), p_slots, now())
  ON CONFLICT (award_id, voter_id) DO UPDATE SET slots = EXCLUDED.slots, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_lineup_vote(UUID, JSONB) TO authenticated;

-- 3. Liste des joueurs avec leur statut (version de la 015, réappliquée) -------------
-- Le type de retour change : on supprime puis recrée la fonction.
DROP FUNCTION IF EXISTS public.league_roster(UUID);

CREATE FUNCTION public.league_roster(p_league_id UUID)
RETURNS TABLE (
  player_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT,
  overall INT,
  preferred_position TEXT,
  status TEXT
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
    NULLIF(to_jsonb(p) ->> 'preferred_position', '') AS preferred_position,
    m.status
  FROM public.league_members m
  LEFT JOIN public.profiles p ON p.id = m.player_id
  LEFT JOIN auth.users u ON u.id = m.player_id
  LEFT JOIN public.player_cards c ON c.player_id = m.player_id
  WHERE m.league_id = p_league_id
    AND public.is_league_member(p_league_id)
  ORDER BY 2;
$$;

GRANT EXECUTE ON FUNCTION public.league_roster(UUID) TO authenticated;

-- PostgREST relit les fonctions tout de suite
NOTIFY pgrst, 'reload schema';
