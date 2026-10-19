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

    const html = brandedInviteEmail({
      appUrl: APP_URL,
      inviterName,
      leagueName: league.name,
      code,
    });

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

/** Email invitation — DA sombre lime (alignée AuthLayout). */
function brandedInviteEmail(opts: {
  appUrl: string;
  inviterName: string;
  leagueName: string;
  code: string;
}) {
  const { appUrl, inviterName, leagueName, code } = opts;
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0B0F0D;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F0D;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#121815;border:1px solid #2A332E;">
  <tr><td style="height:8px;background:#C9FF00;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="padding:28px 28px 8px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px;"><img src="${appUrl}/brand-mark.png" width="40" height="40" alt="" style="display:block;border:0;"/></td>
      <td><img src="${appUrl}/brand-wordmark.png" width="148" height="22" alt="J'aime le foot" style="display:block;border:0;"/></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:40px 28px 8px 28px;">
    <p style="margin:0;font-family:Arial Narrow,Arial,Helvetica,sans-serif;font-style:italic;font-weight:700;font-size:34px;line-height:1;text-transform:uppercase;color:#F3F6F1;">Tu es</p>
    <p style="margin:6px 0 0 0;font-family:Arial Narrow,Arial,Helvetica,sans-serif;font-style:italic;font-weight:700;font-size:34px;line-height:1;text-transform:uppercase;color:#F3F6F1;">invité <span style="color:#C9FF00;">en ligue</span></p>
  </td></tr>
  <tr><td style="padding:16px 28px 0 28px;">
    <p style="margin:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:#A9B2AC;">
      <strong style="color:#F3F6F1;">${escapeHtml(inviterName)}</strong> t’invite dans
      <strong style="color:#F3F6F1;">${escapeHtml(leagueName)}</strong>.
    </p>
  </td></tr>
  <tr><td style="padding:24px 28px 8px 28px;">
    <p style="margin:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6F7973;">Code d’invitation</p>
    <p style="margin:10px 0 0 0;font-family:Arial Narrow,Arial,Helvetica,sans-serif;font-weight:700;font-size:32px;letter-spacing:6px;color:#C9FF00;">${escapeHtml(code)}</p>
  </td></tr>
  <tr><td style="padding:28px;">
    <a href="${appUrl}" style="display:inline-block;background:#C9FF00;color:#0B0F0D;font-family:Arial Narrow,Arial,Helvetica,sans-serif;font-style:italic;font-weight:700;font-size:18px;text-transform:uppercase;text-decoration:none;padding:16px 28px;">Ouvrir l’app →</a>
  </td></tr>
  <tr><td style="padding:0 28px 28px 28px;">
    <p style="margin:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#6F7973;">Connecte-toi (ou inscris-toi), puis « Rejoindre » et entre ce code.</p>
  </td></tr>
  <tr><td style="padding:20px 28px;border-top:1px solid #2A332E;">
    <p style="margin:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;color:#6F7973;">J'aime le foot · <a href="${appUrl}" style="color:#C9FF00;text-decoration:none;">jaimelefoot.app</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
