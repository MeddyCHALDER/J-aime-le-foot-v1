-- Correctif : après la 006, league_members était lisible sans être connecté (6 lignes visibles
-- avec la clé anon). La règle prévue — un membre ne voit que les membres de ses ligues — n'était
-- donc pas appliquée (RLS inactif ou autre règle plus permissive).
-- Ne touche à aucune donnée : uniquement le RLS et les règles d'accès de league_members.
-- À exécuter dans Supabase → SQL Editor. Idempotent.

ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- Retire toute règle sur league_members autre que les deux prévues par la 006.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'league_members'
      AND policyname NOT IN ('Members read own leagues', 'Members leave')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.league_members', pol.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Members read own leagues" ON public.league_members;
DROP POLICY IF EXISTS "Members leave" ON public.league_members;

CREATE POLICY "Members read own leagues" ON public.league_members
  FOR SELECT TO authenticated USING (public.is_league_member(league_id));

CREATE POLICY "Members leave" ON public.league_members
  FOR DELETE TO authenticated
  USING (player_id = auth.uid() OR public.league_manager_id(league_id) = auth.uid());

-- Les ajouts passent uniquement par join_league_by_code et le trigger des ligues.
REVOKE INSERT, UPDATE ON public.league_members FROM anon, authenticated;
REVOKE ALL ON public.league_members FROM anon;

-- Contrôle : RLS actif + règles en place (s'affiche en résultat dans l'éditeur).
SELECT
  c.relrowsecurity AS rls_active,
  (SELECT string_agg(p.policyname || ' → ' || array_to_string(p.roles, ','), ' | ')
     FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'league_members') AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'league_members';
