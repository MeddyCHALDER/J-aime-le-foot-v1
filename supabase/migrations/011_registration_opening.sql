-- Ouverture programmée des inscriptions à un match + notification à l'heure d'ouverture.
--   1. matches.registration_opens_at : heure d'ouverture (NULL = ouvertes tout de suite) ;
--   2. la base refuse « je viens / je ne viens pas » avant l'heure (sauf pour l'admin) ;
--   3. pg_cron vérifie chaque minute les ouvertures dues et appelle send-push
--      (mode « due », qui n'envoie que les annonces arrivées à l'heure et jamais envoyées).
-- Prérequis : redéployer l'Edge Function send-push (mode « due »).
-- À exécuter dans Supabase → SQL Editor. Idempotent ; ne supprime aucune donnée.

-- 1. Heure d'ouverture --------------------------------------------------------
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS registration_opens_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS matches_registration_opens_idx
  ON public.matches (registration_opens_at)
  WHERE registration_opens_at IS NOT NULL;

-- 2. Pas d'inscription avant l'heure (l'admin peut toujours placer et s'inscrire) ---
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
  IF NEW.status = 'out' THEN
    NEW.team_side := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 3. Notification à l'heure d'ouverture ---------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remplace une éventuelle version précédente de la tâche
DO $$
BEGIN
  PERFORM cron.unschedule('jlf-registration-opening');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Chaque minute : n'appelle send-push que s'il y a une ouverture due et pas encore annoncée.
-- La clé anon est publique (elle est déjà dans l'app) ; elle sert uniquement à passer la
-- vérification JWT de la fonction, qui n'envoie que les annonces dues.
SELECT cron.schedule(
  'jlf-registration-opening',
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
    FROM public.matches m
    WHERE m.registration_opens_at <= now()
      AND m.registration_opens_at > now() - interval '1 day'
      AND NOT EXISTS (
        SELECT 1 FROM public.push_sent ps
        WHERE ps.kind = 'match_open' AND ps.ref_id = m.id
      )
  );
  $cron$
);
