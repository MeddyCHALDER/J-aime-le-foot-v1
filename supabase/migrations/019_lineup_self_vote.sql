-- Équipe type : le votant peut se placer dans sa propre compo.
-- cast_lineup_vote (version 018) sans le refus « Tu ne peux pas te mettre dans ton
-- équipe type ». Le vote pour un seul joueur n'est pas concerné.
-- À exécuter dans Supabase → SQL Editor, après la 018. Idempotent.

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
