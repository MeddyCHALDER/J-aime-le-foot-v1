-- Inscriptions aux matchs : « je viens / je ne viens pas » + équipe attribuée par l'admin.
-- Compatible schéma legacy (leagues.manager_id, matches.home_team_id) et V1 (leagues.created_by) :
-- n'utilise ni match_teams ni league_members, absents en prod.
-- À exécuter dans Supabase → SQL Editor. Idempotent.

CREATE TABLE IF NOT EXISTS public.match_attendance (
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('in', 'out')),
  -- Équipe composée par l'admin parmi les inscrits (null = pas encore placé)
  team_side TEXT CHECK (team_side IN ('home', 'away')),
  -- Nom affiché, copié à l'inscription : la lecture des profils des autres peut être fermée par RLS
  display_name TEXT NOT NULL DEFAULT 'Joueur',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS match_attendance_match_idx ON public.match_attendance (match_id);

-- Admin du match = gérant de la ligue (manager_id en legacy, created_by en V1).
CREATE OR REPLACE FUNCTION public.is_match_admin(p_match_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.seasons s ON s.id = m.season_id
    JOIN public.leagues l ON l.id = s.league_id
    WHERE m.id = p_match_id
      AND auth.uid()::text IN (to_jsonb(l) ->> 'manager_id', to_jsonb(l) ->> 'created_by')
  );
$$;

-- Garde-fous : seul l'admin place les joueurs ; un joueur qui se désiste quitte son équipe.
CREATE OR REPLACE FUNCTION public.match_attendance_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_match_admin(NEW.match_id) THEN
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

DROP TRIGGER IF EXISTS match_attendance_guard ON public.match_attendance;
CREATE TRIGGER match_attendance_guard
  BEFORE INSERT OR UPDATE ON public.match_attendance
  FOR EACH ROW EXECUTE FUNCTION public.match_attendance_guard();

ALTER TABLE public.match_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Attendance read" ON public.match_attendance;
DROP POLICY IF EXISTS "Attendance insert own" ON public.match_attendance;
DROP POLICY IF EXISTS "Attendance update own or admin" ON public.match_attendance;
DROP POLICY IF EXISTS "Attendance delete own or admin" ON public.match_attendance;

CREATE POLICY "Attendance read" ON public.match_attendance
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Attendance insert own" ON public.match_attendance
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Attendance update own or admin" ON public.match_attendance
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_match_admin(match_id))
  WITH CHECK (user_id = auth.uid() OR public.is_match_admin(match_id));

CREATE POLICY "Attendance delete own or admin" ON public.match_attendance
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_match_admin(match_id));
