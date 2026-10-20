-- Nombre de places par match + ordre d'arrivée des « Je viens » (liste d'attente).
--   1. matches.max_players : nombre de places (NULL = illimité) ;
--   2. match_attendance.in_at : heure du « Je viens », posée par la base.
--      Se désister la remet à zéro : revenir replace le joueur en fin de file.
-- La liste d'attente se déduit de l'ordre : les max_players premiers jouent, les suivants
-- attendent, et le premier en attente monte tout seul quand un titulaire se désiste.
-- À exécuter dans Supabase → SQL Editor. Idempotent ; ne supprime aucune donnée.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS max_players INT;

DO $$
BEGIN
  ALTER TABLE public.matches
    ADD CONSTRAINT matches_max_players_range CHECK (max_players IS NULL OR max_players BETWEEN 2 AND 60);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.match_attendance
  ADD COLUMN IF NOT EXISTS in_at TIMESTAMPTZ;

-- Inscriptions existantes : on reprend l'heure de la dernière réponse
UPDATE public.match_attendance
SET in_at = COALESCE(updated_at, created_at)
WHERE status = 'in' AND in_at IS NULL;

CREATE INDEX IF NOT EXISTS match_attendance_order_idx
  ON public.match_attendance (match_id, in_at)
  WHERE status = 'in';

-- Même garde qu'en 011 (ouverture programmée, équipes réservées à l'admin),
-- plus l'horodatage du « Je viens », que personne ne peut fixer à la main.
CREATE OR REPLACE FUNCTION public.match_attendance_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  opens TIMESTAMPTZ;
  is_admin BOOLEAN := public.is_match_admin(NEW.match_id);
BEGIN
  IF NOT is_admin THEN
    IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
      SELECT registration_opens_at INTO opens FROM public.matches WHERE id = NEW.match_id;
      IF opens IS NOT NULL AND opens > now() THEN
        RAISE EXCEPTION 'Les inscriptions ouvrent le %',
          to_char(opens AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24:MI');
      END IF;
    END IF;
    IF TG_OP = 'INSERT' THEN
      NEW.team_side := NULL;
    ELSE
      NEW.team_side := OLD.team_side;
    END IF;
  END IF;

  -- Ordre d'arrivée : posé au passage à « je viens », effacé au désistement
  IF NEW.status = 'in' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'in' THEN
      NEW.in_at := now();
    ELSE
      NEW.in_at := OLD.in_at;
    END IF;
  ELSE
    NEW.in_at := NULL;
    NEW.team_side := NULL;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
