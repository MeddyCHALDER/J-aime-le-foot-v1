-- Trophées : la contrainte season_awards_positions_known est redéfinie.
-- La 016 l'ajoute dans un bloc qui ignore duplicate_object : si une version antérieure
-- existait déjà sous ce nom, elle est restée en place et refuse les lignes de l'app
-- (« violates check constraint season_awards_positions_known »).
-- À exécuter dans Supabase → SQL Editor, après la 016. Idempotent.

ALTER TABLE public.season_awards
  DROP CONSTRAINT IF EXISTS season_awards_positions_known;

-- Valeurs déjà stockées sous une autre forme (« Gardien », « def »…) : ramenées au code
-- de ligne, celles qu'on ne reconnaît pas sont retirées.
UPDATE public.season_awards a
SET positions = NULLIF(
  ARRAY(
    SELECT DISTINCT public.position_line(p)
    FROM unnest(a.positions) p
    WHERE public.position_line(p) IS NOT NULL
  ),
  '{}'::TEXT[]
)
WHERE a.positions IS NOT NULL
  AND NOT (a.positions <@ ARRAY['GB', 'DEF', 'MIL', 'ATT']::TEXT[]);

ALTER TABLE public.season_awards
  ADD CONSTRAINT season_awards_positions_known
  CHECK (positions <@ ARRAY['GB', 'DEF', 'MIL', 'ATT']::TEXT[]);
