-- Code d'invitation + rejoindre une ligue (parcours joueur lambda)

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS invite_code TEXT;

UPDATE public.leagues
SET invite_code = upper(substr(replace(id::text, '-', ''), 1, 6))
WHERE invite_code IS NULL OR invite_code = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_leagues_invite_code
  ON public.leagues (invite_code);

-- Rejoindre via code (SECURITY DEFINER : contourne RLS insert membres)
CREATE OR REPLACE FUNCTION public.join_league_by_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT id INTO lid
  FROM public.leagues
  WHERE upper(invite_code) = upper(trim(p_code));

  IF lid IS NULL THEN
    RAISE EXCEPTION 'Code d''invitation invalide';
  END IF;

  INSERT INTO public.league_members (league_id, player_id, role)
  VALUES (lid, auth.uid(), 'player')
  ON CONFLICT (league_id, player_id) DO NOTHING;

  RETURN lid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_league_by_code(TEXT) TO authenticated;
