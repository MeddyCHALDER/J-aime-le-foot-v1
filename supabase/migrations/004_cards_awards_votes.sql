-- Cartes FIFA joueur + trophées / votes (For the Best)

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

CREATE POLICY "Cards read" ON public.player_cards FOR SELECT USING (true);
CREATE POLICY "Cards upsert own" ON public.player_cards FOR INSERT
  WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Cards update own" ON public.player_cards FOR UPDATE
  USING (auth.uid() = player_id);
-- Admins de ligue peuvent mettre à jour après feuille (via RPC plus bas)
CREATE POLICY "Cards update authenticated" ON public.player_cards FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ============ SEASON AWARDS ============
CREATE TYPE public.award_type AS ENUM (
  'ballon_dor',
  'puskas',
  'pichichi',
  'golden_glove',
  'best_young',
  'for_the_best'
);

CREATE TABLE IF NOT EXISTS public.season_awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  type public.award_type NOT NULL,
  title TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (season_id, type)
);

CREATE TABLE IF NOT EXISTS public.award_nominations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  award_id UUID NOT NULL REFERENCES public.season_awards(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (award_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.award_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  award_id UUID NOT NULL REFERENCES public.season_awards(id) ON DELETE CASCADE,
  nomination_id UUID NOT NULL REFERENCES public.award_nominations(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (award_id, voter_id)
);

ALTER TABLE public.season_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Awards read" ON public.season_awards FOR SELECT USING (true);
CREATE POLICY "Nominations read" ON public.award_nominations FOR SELECT USING (true);
CREATE POLICY "Votes read" ON public.award_votes FOR SELECT USING (true);

CREATE POLICY "Awards insert admin" ON public.season_awards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.seasons s
      JOIN public.leagues l ON l.id = s.league_id
      WHERE s.id = season_id AND l.created_by = auth.uid()
    )
  );

CREATE POLICY "Awards update admin" ON public.season_awards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.seasons s
      JOIN public.leagues l ON l.id = s.league_id
      WHERE s.id = season_id AND l.created_by = auth.uid()
    )
  );

CREATE POLICY "Nominations insert admin" ON public.award_nominations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.season_awards a
      JOIN public.seasons s ON s.id = a.season_id
      JOIN public.leagues l ON l.id = s.league_id
      WHERE a.id = award_id AND l.created_by = auth.uid()
    )
  );

CREATE POLICY "Votes insert member" ON public.award_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1 FROM public.season_awards a
      JOIN public.seasons s ON s.id = a.season_id
      JOIN public.league_members m ON m.league_id = s.league_id
      WHERE a.id = award_id AND m.player_id = auth.uid() AND a.is_open = true
    )
  );

CREATE POLICY "Votes update own" ON public.award_votes FOR UPDATE
  USING (auth.uid() = voter_id);

-- Appliquer l'impact carte après événements d'un match
CREATE OR REPLACE FUNCTION public.apply_card_from_match_events(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  ev_types TEXT[];
  card public.player_cards%ROWTYPE;
  delta INT;
  new_overall INT;
BEGIN
  FOR r IN
    SELECT DISTINCT player_id FROM public.match_events WHERE match_id = p_match_id
  LOOP
    SELECT array_agg(type::text) INTO ev_types
    FROM public.match_events
    WHERE match_id = p_match_id AND player_id = r.player_id;

    INSERT INTO public.player_cards (player_id)
    VALUES (r.player_id)
    ON CONFLICT (player_id) DO NOTHING;

    SELECT * INTO card FROM public.player_cards WHERE player_id = r.player_id;

    delta := 0;
    IF 'goal' = ANY(ev_types) THEN
      card.shooting := LEAST(99, card.shooting + (SELECT COUNT(*) FROM unnest(ev_types) t WHERE t = 'goal'));
      delta := delta + (SELECT COUNT(*) FROM unnest(ev_types) t WHERE t = 'goal');
    END IF;
    IF 'assist' = ANY(ev_types) THEN
      card.passing := LEAST(99, card.passing + (SELECT COUNT(*) FROM unnest(ev_types) t WHERE t = 'assist'));
      delta := delta + (SELECT COUNT(*) FROM unnest(ev_types) t WHERE t = 'assist');
    END IF;
    IF 'mvp' = ANY(ev_types) THEN
      delta := delta + 1;
    END IF;
    IF 'red' = ANY(ev_types) THEN
      card.physical := GREATEST(1, card.physical - 1);
      delta := delta - 1;
    END IF;
    IF 'yellow' = ANY(ev_types) THEN
      delta := delta; -- neutre sur overall, déjà compté en malus soft si besoin
    END IF;

    new_overall := GREATEST(1, LEAST(99, card.overall + delta));

    UPDATE public.player_cards SET
      shooting = card.shooting,
      passing = card.passing,
      physical = card.physical,
      overall = new_overall,
      updated_at = now()
    WHERE player_id = r.player_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_card_from_match_events(UUID) TO authenticated;
