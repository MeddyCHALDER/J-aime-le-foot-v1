-- Cartes FIFA joueur + trophées / votes (For the Best)
-- Compatible schéma actuel (leagues.manager_id) et V1 (created_by) via fonction helper.

-- Colonnes profil utiles à la carte
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_position TEXT,
  ADD COLUMN IF NOT EXISTS strong_foot TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- ============ PLAYER_CARDS ============
CREATE TABLE IF NOT EXISTS public.player_cards (
  player_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  overall INTEGER NOT NULL DEFAULT 50 CHECK (overall BETWEEN 1 AND 99),
  pace INTEGER NOT NULL DEFAULT 50 CHECK (pace BETWEEN 1 AND 99),
  shooting INTEGER NOT NULL DEFAULT 50 CHECK (shooting BETWEEN 1 AND 99),
  passing INTEGER NOT NULL DEFAULT 50 CHECK (passing BETWEEN 1 AND 99),
  dribbling INTEGER NOT NULL DEFAULT 50 CHECK (dribbling BETWEEN 1 AND 99),
  defending INTEGER NOT NULL DEFAULT 50 CHECK (defending BETWEEN 1 AND 99),
  physical INTEGER NOT NULL DEFAULT 50 CHECK (physical BETWEEN 1 AND 99),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.player_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cards read" ON public.player_cards;
DROP POLICY IF EXISTS "Cards upsert own" ON public.player_cards;
DROP POLICY IF EXISTS "Cards update own" ON public.player_cards;
DROP POLICY IF EXISTS "Cards update authenticated" ON public.player_cards;

CREATE POLICY "Cards read" ON public.player_cards FOR SELECT USING (true);
CREATE POLICY "Cards upsert own" ON public.player_cards FOR INSERT
  WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Cards update authenticated" ON public.player_cards FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Helper : est admin de la ligue d'une saison ?
CREATE OR REPLACE FUNCTION public.is_season_admin(p_season_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seasons s
    JOIN public.leagues l ON l.id = s.league_id
    WHERE s.id = p_season_id
      AND (
        (to_jsonb(l) ? 'created_by' AND (to_jsonb(l)->>'created_by')::uuid = auth.uid())
        OR (to_jsonb(l) ? 'manager_id' AND (to_jsonb(l)->>'manager_id')::uuid = auth.uid())
      )
  );
$$;

-- ============ SEASON AWARDS ============
DO $$ BEGIN
  CREATE TYPE public.award_type AS ENUM (
    'ballon_dor',
    'puskas',
    'pichichi',
    'golden_glove',
    'best_young',
    'for_the_best'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.season_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  type public.award_type NOT NULL,
  title TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (season_id, type)
);

CREATE TABLE IF NOT EXISTS public.award_nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID NOT NULL REFERENCES public.season_awards(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (award_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.award_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID NOT NULL REFERENCES public.season_awards(id) ON DELETE CASCADE,
  nomination_id UUID NOT NULL REFERENCES public.award_nominations(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (award_id, voter_id)
);

ALTER TABLE public.season_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Awards read" ON public.season_awards;
DROP POLICY IF EXISTS "Nominations read" ON public.award_nominations;
DROP POLICY IF EXISTS "Votes read" ON public.award_votes;
DROP POLICY IF EXISTS "Awards insert admin" ON public.season_awards;
DROP POLICY IF EXISTS "Awards update admin" ON public.season_awards;
DROP POLICY IF EXISTS "Nominations insert admin" ON public.award_nominations;
DROP POLICY IF EXISTS "Votes insert member" ON public.award_votes;
DROP POLICY IF EXISTS "Votes update own" ON public.award_votes;

CREATE POLICY "Awards read" ON public.season_awards FOR SELECT USING (true);
CREATE POLICY "Nominations read" ON public.award_nominations FOR SELECT USING (true);
CREATE POLICY "Votes read" ON public.award_votes FOR SELECT USING (true);

CREATE POLICY "Awards insert admin" ON public.season_awards FOR INSERT
  WITH CHECK (public.is_season_admin(season_id));

CREATE POLICY "Awards update admin" ON public.season_awards FOR UPDATE
  USING (public.is_season_admin(season_id));

CREATE POLICY "Nominations insert admin" ON public.award_nominations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.season_awards a
      WHERE a.id = award_id AND public.is_season_admin(a.season_id)
    )
  );

CREATE POLICY "Votes insert member" ON public.award_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1 FROM public.season_awards a
      WHERE a.id = award_id AND a.is_open = true
    )
  );

CREATE POLICY "Votes update own" ON public.award_votes FOR UPDATE
  USING (auth.uid() = voter_id);

-- Impact carte : best-effort selon schéma match_events (V1 type/team_side ou legacy event_type)
CREATE OR REPLACE FUNCTION public.apply_card_from_match_events(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  has_type boolean;
  n_goals int;
  n_assists int;
  n_mvp int;
  n_red int;
  card public.player_cards%ROWTYPE;
  delta int;
  pid uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'match_events' AND column_name = 'type'
  ) INTO has_type;

  IF has_type THEN
    FOR r IN SELECT DISTINCT player_id AS pid FROM public.match_events WHERE match_id = p_match_id
    LOOP
      pid := r.pid;
      SELECT
        COUNT(*) FILTER (WHERE type::text IN ('goal')),
        COUNT(*) FILTER (WHERE type::text IN ('assist')),
        COUNT(*) FILTER (WHERE type::text IN ('mvp')),
        COUNT(*) FILTER (WHERE type::text IN ('red'))
      INTO n_goals, n_assists, n_mvp, n_red
      FROM public.match_events
      WHERE match_id = p_match_id AND player_id = pid;

      INSERT INTO public.player_cards (player_id) VALUES (pid) ON CONFLICT DO NOTHING;
      SELECT * INTO card FROM public.player_cards WHERE player_id = pid;

      card.shooting := LEAST(99, card.shooting + n_goals);
      card.passing := LEAST(99, card.passing + n_assists);
      IF n_red > 0 THEN card.physical := GREATEST(1, card.physical - n_red); END IF;
      delta := n_goals + n_assists + n_mvp - n_red;

      UPDATE public.player_cards SET
        shooting = card.shooting,
        passing = card.passing,
        physical = card.physical,
        overall = GREATEST(1, LEAST(99, card.overall + delta)),
        updated_at = now()
      WHERE player_id = pid;
    END LOOP;
  ELSE
    -- Legacy : event_type + player_id → players (pas profiles). On ignore silencieusement.
    NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_card_from_match_events(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_season_admin(UUID) TO authenticated;
