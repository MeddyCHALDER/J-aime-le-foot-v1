-- Trophées : réservés à des postes, et ouverture programmée des votes.
--   1. season_awards.positions : lignes (Gardien, Défense, Milieu, Attaque) qui peuvent
--      recevoir des voix ; NULL ou vide = tous. Tous les membres actifs votent toujours ;
--   2. position_line() : la ligne d'un poste, comme lineOf() dans l'app ;
--   3. changer les postes d'un trophée retire les voix devenues hors poste ;
--   4. season_awards.opens_at : avant cette heure le trophée est visible mais fermé au vote ;
--   5. cast_award_vote (version 015) et les règles RLS appliquent poste et heure ;
--   6. les trophées classiques déjà créés ouvrent le vendredi 23 octobre 2026 à 9h (Paris) ;
--   7. pg_cron prévient la ligue à l'heure d'ouverture (send-push, mode « due ») ;
--   8. withdraw_award_vote : le votant retire son vote (un joueur ou équipe type).
-- Prérequis : redéployer l'Edge Function send-push.
-- À exécuter dans Supabase → SQL Editor, après la 015. Idempotent.

-- 1. Postes du trophée -------------------------------------------------------
ALTER TABLE public.season_awards
  ADD COLUMN IF NOT EXISTS positions TEXT[];

DO $$
BEGIN
  ALTER TABLE public.season_awards
    ADD CONSTRAINT season_awards_positions_known
    CHECK (positions <@ ARRAY['GB', 'DEF', 'MIL', 'ATT']::TEXT[]);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Le Golden Glove récompense un gardien, y compris pour les trophées déjà créés.
UPDATE public.season_awards
SET positions = ARRAY['GB']
WHERE type = 'golden_glove' AND positions IS NULL;

-- 2. Ligne du terrain ----------------------------------------------------------
-- Même règle que lineOf() (src/features/cards/positions.ts) : à garder alignées.
CREATE OR REPLACE FUNCTION public.position_line(p_position TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p IS NULL OR p = '' THEN NULL
    WHEN upper(p) = 'GB' THEN 'GB'
    WHEN upper(p) IN ('DC', 'DG', 'DD') THEN 'DEF'
    WHEN upper(p) IN ('MDC', 'MC', 'MOC') THEN 'MIL'
    WHEN upper(p) IN ('AG', 'AD', 'BU') THEN 'ATT'
    -- Anciens textes libres
    WHEN strpos(lower(p), 'gard') > 0 OR lower(p) = 'gk' THEN 'GB'
    WHEN strpos(lower(p), 'déf') > 0 OR strpos(lower(p), 'def') > 0
      OR strpos(lower(p), 'lat') > 0 OR lower(p) = 'cb' THEN 'DEF'
    WHEN strpos(lower(p), 'mil') > 0 OR strpos(lower(p), 'moc') > 0
      OR lower(p) IN ('cm', 'cam') THEN 'MIL'
    WHEN strpos(lower(p), 'att') > 0 OR strpos(lower(p), 'ail') > 0
      OR strpos(lower(p), 'but') > 0 OR lower(p) = 'st' THEN 'ATT'
    ELSE NULL
  END
  FROM (SELECT trim(p_position) AS p) x;
$$;

-- Le joueur peut-il recevoir des voix pour ce trophée ?
CREATE OR REPLACE FUNCTION public.award_accepts_player(p_award_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- COALESCE : sans poste reconnu la comparaison vaut NULL, qu'il faut lire comme « non ».
  SELECT COALESCE(cardinality(a.positions), 0) = 0
    OR COALESCE(
      public.position_line(to_jsonb(p) ->> 'preferred_position') = ANY (a.positions),
      false
    )
  FROM public.season_awards a
  LEFT JOIN public.profiles p ON p.id = p_player_id
  WHERE a.id = p_award_id;
$$;

GRANT EXECUTE ON FUNCTION public.award_accepts_player(UUID, UUID) TO authenticated;

-- 3. Postes modifiés : les voix pour un joueur devenu hors poste sont retirées -----
-- Sinon un défenseur pourrait gagner un trophée réservé aux gardiens. Les votants
-- concernés retrouvent le trophée « à voter ».
CREATE OR REPLACE FUNCTION public.season_awards_prune_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.award_votes v
  USING public.award_nominations n
  WHERE v.nomination_id = n.id
    AND v.award_id = NEW.id
    AND NOT public.award_accepts_player(NEW.id, n.player_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS season_awards_prune_votes ON public.season_awards;
CREATE TRIGGER season_awards_prune_votes
  AFTER UPDATE OF positions ON public.season_awards
  FOR EACH ROW
  WHEN (OLD.positions IS DISTINCT FROM NEW.positions)
  EXECUTE FUNCTION public.season_awards_prune_votes();

-- 4. Heure d'ouverture -------------------------------------------------------
ALTER TABLE public.season_awards
  ADD COLUMN IF NOT EXISTS opens_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS season_awards_opens_idx
  ON public.season_awards (opens_at)
  WHERE opens_at IS NOT NULL;

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

-- 5. Vote : poste et heure d'ouverture -------------------------------------------------
-- Même contrat que la 015, plus le contrôle du poste et de l'heure d'ouverture.
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

  IF lid IS NULL THEN RAISE EXCEPTION 'Trophée introuvable'; END IF;
  IF NOT open_ THEN RAISE EXCEPTION 'Ce vote est clôturé'; END IF;
  IF opens IS NOT NULL AND opens > now() THEN
    RAISE EXCEPTION 'Le vote ouvre le %',
      to_char(opens AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24:MI');
  END IF;
  IF NOT public.is_active_member(lid) THEN
    RAISE EXCEPTION 'Tu dois être membre actif de la ligue pour voter';
  END IF;
  IF p_player_id = auth.uid() THEN RAISE EXCEPTION 'Tu ne peux pas voter pour toi'; END IF;
  IF NOT public.is_active_member(lid, p_player_id) THEN
    RAISE EXCEPTION 'Ce joueur ne peut pas recevoir de vote';
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

-- L'ancienne voie d'écriture directe (règles de la 004) respecte aussi l'heure.
DROP POLICY IF EXISTS "Votes insert member" ON public.award_votes;
CREATE POLICY "Votes insert member" ON public.award_votes FOR INSERT
  WITH CHECK (auth.uid() = voter_id AND public.award_voting_started(award_id));

DROP POLICY IF EXISTS "Votes update own" ON public.award_votes;
CREATE POLICY "Votes update own" ON public.award_votes FOR UPDATE
  USING (auth.uid() = voter_id)
  WITH CHECK (auth.uid() = voter_id AND public.award_voting_started(award_id));

-- 6. Trophées classiques existants : vote à partir du vendredi 23 octobre 2026, 9h -----
-- Sans effet une fois la date passée ou si l'heure a déjà été fixée. S'ils avaient déjà
-- été annoncés à leur création, on efface la trace pour qu'ils le soient à l'ouverture.
WITH postponed AS (
  UPDATE public.season_awards
  SET opens_at = TIMESTAMPTZ '2026-10-23 09:00:00 Europe/Paris'
  WHERE type <> 'custom'
    AND opens_at IS NULL
    AND is_open
    AND now() < TIMESTAMPTZ '2026-10-23 09:00:00 Europe/Paris'
  RETURNING id
)
DELETE FROM public.push_sent ps
USING postponed
WHERE ps.kind = 'vote_open' AND ps.ref_id = postponed.id;

-- 7. Notification à l'heure d'ouverture ---------------------------------------
-- Même mécanisme que les inscriptions (migration 011) : une tâche par minute qui
-- n'appelle send-push que s'il y a une ouverture de vote due et jamais annoncée.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('jlf-vote-opening');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'jlf-vote-opening',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://bavfngaiqwjhufdasjcr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdmZuZ2FpcXdqaHVmZGFzamNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzI1OTMsImV4cCI6MjA4NTk0ODU5M30.F_KL296AsPcnj4yeeOeDhctHiUKQPi0cI7DrgD0cu6g'
    ),
    body := '{"kind":"due"}'::jsonb
  )
  WHERE EXISTS (
    SELECT 1
    FROM public.season_awards a
    WHERE a.is_open
      AND a.opens_at <= now()
      AND a.opens_at > now() - interval '1 day'
      AND NOT EXISTS (
        SELECT 1 FROM public.push_sent ps
        WHERE ps.kind = 'vote_open' AND ps.ref_id = a.id
      )
  );
  $cron$
);

-- 8. Retirer son vote ------------------------------------------------------------
-- Tant que le vote est ouvert : après la clôture, les résultats sont figés.
-- Couvre les deux sortes de trophées (un joueur, équipe type).
CREATE OR REPLACE FUNCTION public.withdraw_award_vote(p_award_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  open_ BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT is_open INTO open_ FROM public.season_awards WHERE id = p_award_id;
  IF open_ IS NULL THEN RAISE EXCEPTION 'Trophée introuvable'; END IF;
  IF NOT open_ THEN RAISE EXCEPTION 'Ce vote est clôturé : il ne peut plus être retiré'; END IF;

  DELETE FROM public.award_votes WHERE award_id = p_award_id AND voter_id = auth.uid();
  DELETE FROM public.award_lineup_votes WHERE award_id = p_award_id AND voter_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.withdraw_award_vote(UUID) TO authenticated;
