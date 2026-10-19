/**
 * Envoie un email « mot de passe oublié » brandé via Resend
 * (évite le template fallback Supabase Auth).
 *
 * Secrets :
 *   RESEND_API_KEY, RESEND_FROM_EMAIL, APP_URL, SERVICE_ROLE_KEY
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
      Deno.env.get('RESEND_FROM_EMAIL') ?? "J'aime le foot <hello@jaimelefoot.app>";
    const APP_URL = (Deno.env.get('APP_URL') ?? 'https://www.jaimelefoot.app').replace(/\/$/, '');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    if (!RESEND_API_KEY || !SERVICE_ROLE_KEY) {
      return json({ error: 'Configuration email manquante' }, 500);
    }

    const body = await req.json();
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();

    // Réponse neutre (pas d’énumération de comptes)
    const okNeutral = () => json({ ok: true });

    if (!email || !email.includes('@')) {
      return json({ error: 'Email requis' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${APP_URL}/` },
    });

    if (error || !data?.properties?.action_link) {
      // Compte inexistant ou erreur : on répond OK pour ne pas leak
      console.error('generateLink', error?.message);
      return okNeutral();
    }

    const link = data.properties.action_link;
    const html = brandedResetEmail({ appUrl: APP_URL, link });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: "Nouveau mot de passe — J'aime le foot",
        html,
      }),
    });

    const payload = await res.json();
    if (!res.ok) {
      console.error('resend', payload);
      return json({ error: payload?.message ?? 'Échec envoi' }, 500);
    }

    return json({ ok: true, id: payload.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 500);
  }
});

function brandedResetEmail(opts: { appUrl: string; link: string }) {
  const { appUrl, link } = opts;
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
    <p style="margin:0;font-family:Arial Narrow,Arial,Helvetica,sans-serif;font-style:italic;font-weight:700;font-size:34px;line-height:1;text-transform:uppercase;color:#F3F6F1;">Nouveau</p>
    <p style="margin:6px 0 0 0;font-family:Arial Narrow,Arial,Helvetica,sans-serif;font-style:italic;font-weight:700;font-size:34px;line-height:1;text-transform:uppercase;color:#F3F6F1;">mot de <span style="color:#C9FF00;">passe</span></p>
  </td></tr>
  <tr><td style="padding:16px 28px 0 28px;">
    <p style="margin:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:#A9B2AC;">
      Tu as demande a reinitialiser ton mot de passe. Clique ci-dessous pour en choisir un nouveau — le lien expire bientot.
    </p>
  </td></tr>
  <tr><td style="padding:32px 28px;">
    <a href="${link}" style="display:inline-block;background:#C9FF00;color:#0B0F0D;font-family:Arial Narrow,Arial,Helvetica,sans-serif;font-style:italic;font-weight:700;font-size:18px;letter-spacing:0.4px;text-transform:uppercase;text-decoration:none;padding:16px 28px;">
      Choisir mon mot de passe →
    </a>
  </td></tr>
  <tr><td style="padding:0 28px 28px 28px;">
    <p style="margin:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#6F7973;">
      Si tu n'as pas fait cette demande, ignore ce message — ton compte reste securise.
    </p>
  </td></tr>
  <tr><td style="padding:20px 28px;border-top:1px solid #2A332E;">
    <p style="margin:0;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;color:#6F7973;">
      J'aime le foot · <a href="${appUrl}" style="color:#C9FF00;text-decoration:none;">jaimelefoot.app</a>
    </p>
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
