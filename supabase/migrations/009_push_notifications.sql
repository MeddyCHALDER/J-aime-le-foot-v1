-- Notifications push (Web Push) : ouverture des inscriptions à un match, ouverture des votes.
--   1. push_subscriptions : un abonnement par appareil (navigateur / PWA installée) ;
--   2. save_push_subscription / delete_push_subscription : enregistrement depuis l'app ;
--   3. push_sent : journal qui empêche d'envoyer deux fois la même annonce.
-- L'envoi lui-même passe par l'Edge Function send-push (clé service, secrets VAPID).
-- À exécuter dans Supabase → SQL Editor. Idempotent ; ne supprime aucune donnée.

-- 1. Abonnements -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Push read own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Push delete own" ON public.push_subscriptions;

-- Les clés de chiffrement ne sont lisibles que par leur propriétaire ; l'écriture passe
-- par save_push_subscription.
CREATE POLICY "Push read own" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Push delete own" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 2. Enregistrement ----------------------------------------------------------
-- SECURITY DEFINER : un même appareil peut changer de compte. Un upsert classique
-- buterait sur le RLS de la ligne de l'ancien compte ; ici l'appareil est réattribué.
CREATE OR REPLACE FUNCTION public.save_push_subscription(
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  IF p_endpoint IS NULL OR p_endpoint !~ '^https://' THEN
    RAISE EXCEPTION 'Abonnement invalide';
  END IF;

  INSERT INTO public.push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
  VALUES (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_user_agent, 300))
  ON CONFLICT (endpoint) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    user_agent = EXCLUDED.user_agent,
    updated_at = now();
END;
$$;

-- À la déconnexion, l'appareil ne doit plus recevoir les annonces du compte quitté.
CREATE OR REPLACE FUNCTION public.delete_push_subscription(p_endpoint TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.push_subscriptions
  WHERE endpoint = p_endpoint AND user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.save_push_subscription(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription(TEXT) TO authenticated;

-- 3. Journal des envois ------------------------------------------------------
-- kind : 'match_open' (ref = match) ou 'vote_open' (ref = trophée).
-- RLS sans règle : seule la clé service (Edge Function) y accède.
CREATE TABLE IF NOT EXISTS public.push_sent (
  kind TEXT NOT NULL,
  ref_id UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, ref_id)
);

ALTER TABLE public.push_sent ENABLE ROW LEVEL SECURITY;
