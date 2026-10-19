/**
 * Envoie une invitation de ligue par email via Resend.
 * Secrets (Dashboard Supabase → Edge Functions → Secrets) :
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL  (ex: "J'aime le foot <onboarding@resend.dev>" ou ton domaine vérifié)
 *   APP_URL            (ex: https://www.jaimelefoot.app)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const RESEND_FROM =
      Deno.env.get('RESEND_FROM_EMAIL') ?? "J'aime le foot <onboarding@resend.dev>";
    const APP_URL = (Deno.env.get('APP_URL') ?? 'http://localhost:8081').replace(/\/$/, '');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY manquant' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Non authentifié' }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Session invalide' }, 401);
    }

    const body = await req.json();
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const leagueId = String(body.leagueId ?? '').trim();

    if (!email || !email.includes('@') || !leagueId) {
      return json({ error: 'email et leagueId requis' }, 400);
    }

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, invite_code, created_by')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      return json({ error: 'Ligue introuvable' }, 404);
    }

    if (league.created_by !== user.id) {
      return json({ error: 'Seul l’admin peut envoyer des invitations' }, 403);
    }

    const code = league.invite_code ?? '';
    const inviterName =
      (user.user_metadata?.display_name as string | undefined) ?? user.email ?? 'Un ami';

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background:#C9FF00;padding:20px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;color:#000;font-size:22px;">J'aime le foot</h1>
        </div>
        <div style="border:1px solid #eee;padding:24px;border-radius:0 0 12px 12px;">
          <p style="color:#000;">Salut !</p>
          <p style="color:#000;"><strong>${escapeHtml(inviterName)}</strong> t’invite dans la ligue
            <strong>${escapeHtml(league.name)}</strong>.</p>
          <p style="color:#000;">Ton code d’invitation :</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px;color:#000;margin:16px 0;">
            ${escapeHtml(code)}
          </p>
          <p style="color:#000;">
            <a href="${APP_URL}" style="display:inline-block;background:#C9FF00;color:#000;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
              Ouvrir l’app
            </a>
          </p>
          <p style="color:#666;font-size:13px;margin-top:24px;">
            Connecte-toi (ou inscris-toi), puis utilise « Rejoindre » et entre ce code.
          </p>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: `Invitation · ${league.name} — J'aime le foot`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return json({ error: data?.message ?? 'Échec Resend', details: data }, res.status);
    }

    return json({ ok: true, id: data.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 500);
  }
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
