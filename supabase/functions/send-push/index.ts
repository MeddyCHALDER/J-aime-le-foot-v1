/**
 * Notifications push (Web Push) aux membres d'une ligue.
 *   { kind: 'config' }                     → clé publique VAPID (abonnement côté app)
 *   { kind: 'match_open', matchId }        → inscriptions ouvertes pour un match
 *   { kind: 'vote_open', awardIds: [...] } → votes ouverts pour un ou plusieurs trophées
 *   { kind: 'test' }                       → notification de test sur ses propres appareils
 *   { kind: 'due' }                        → inscriptions et votes arrivés à leur heure d'ouverture
 *                                            (appelé chaque minute par pg_cron, migrations 011 et 016)
 * Les annonces sont réservées à l'admin de la ligue et ne partent qu'une fois (table push_sent).
 * « due » n'a pas besoin d'utilisateur : il n'envoie que des annonces dont l'heure est passée
 * et jamais envoyées, donc l'appeler en avance ou deux fois ne change rien.
 *
 * Secrets (Dashboard Supabase → Edge Functions → Secrets) :
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  (npx web-push generate-vapid-keys)
 *   VAPID_SUBJECT                        (ex: mailto:contact@jaimelefoot.app)
 * SUPABASE_SERVICE_ROLE_KEY est fourni d'office aux Edge Functions.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = { title: string; body: string; url: string; tag: string };
type Announce = {
  leagueId: string;
  refs: string[];
  payload: (leagueName: string, fresh: Set<string>) => Payload;
};
type Vapid = { subject: string; publicKey: string; privateKey: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@jaimelefoot.app';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return json({ error: 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquants' }, 500);
    }

    const vapid: Vapid = { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY };
    const body = await req.json().catch(() => ({}));
    const kind = String(body.kind ?? '');

    // Client service : lit les abonnements des autres membres, invisibles sous RLS.
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    if (kind === 'due') {
      return json(await announceDueOpenings(admin, vapid));
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non authentifié' }, 401);

    // Client « utilisateur » : vérifie qui appelle et ses droits, sous RLS.
    const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await asUser.auth.getUser();
    if (userError || !user) return json({ error: 'Session invalide' }, 401);

    if (kind === 'config') {
      return json({ publicKey: VAPID_PUBLIC_KEY });
    }

    // Test : uniquement vers les appareils de l'utilisateur connecté, jamais vers les autres.
    if (kind === 'test') {
      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', user.id);
      const sent = await pushTo(admin, vapid, subs ?? [], {
        title: 'Notification de test',
        body: 'Ça marche ! Les annonces de ta ligue arriveront ici.',
        url: '/',
        tag: 'jlf-test',
      });
      return json({ ok: true, sent, devices: subs?.length ?? 0 });
    }

    let announce: Announce;

    if (kind === 'match_open') {
      const matchId = String(body.matchId ?? '');
      if (!matchId) return json({ error: 'matchId requis' }, 400);

      const { data: isAdmin } = await asUser.rpc('is_match_admin', { p_match_id: matchId });
      if (!isAdmin) return json({ error: 'Seul l’admin de la ligue peut annoncer ce match' }, 403);

      const { data: match } = await admin.from('matches').select('*').eq('id', matchId).maybeSingle();
      if (!match) return json({ error: 'Match introuvable' }, 404);
      // Ouverture programmée plus tard : c'est la tâche planifiée qui annoncera.
      if (match.registration_opens_at && new Date(match.registration_opens_at) > new Date()) {
        return json({ ok: true, sent: 0, scheduled: match.registration_opens_at });
      }
      const built = await matchAnnounce(admin, match);
      if (!built) return json({ error: 'Ligue introuvable' }, 404);
      announce = built;
    } else if (kind === 'vote_open') {
      const awardIds: string[] = Array.isArray(body.awardIds)
        ? body.awardIds.map(String).filter(Boolean)
        : [];
      if (awardIds.length === 0) return json({ error: 'awardIds requis' }, 400);

      const { data: awards } = await admin
        .from('season_awards')
        .select('*')
        .in('id', awardIds)
        .order('created_at');
      const open = (awards ?? []).filter((a) => a.is_open);
      if (open.length === 0) return json({ ok: true, sent: 0 });

      const seasonIds = new Set(open.map((a) => a.season_id));
      if (seasonIds.size > 1) return json({ error: 'Trophées de plusieurs saisons' }, 400);

      const { data: isAdmin } = await asUser.rpc('is_season_admin', { p_season_id: open[0].season_id });
      if (!isAdmin) return json({ error: 'Seul l’admin de la ligue peut ouvrir les votes' }, 403);

      // Ouverture programmée plus tard : c'est la tâche planifiée qui annoncera.
      const now = new Date();
      const ready = open.filter((a) => !a.opens_at || new Date(a.opens_at) <= now);
      if (ready.length === 0) return json({ ok: true, sent: 0, scheduled: true });

      const built = await votesAnnounce(admin, ready);
      if (!built) return json({ error: 'Ligue introuvable' }, 404);
      announce = built;
    } else {
      return json({ error: 'kind inconnu' }, 400);
    }

    return json(await deliver(admin, vapid, kind, announce, user.id));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 500);
  }
});

/** Annonce « inscriptions ouvertes » d'un match (ligne de la table matches). */
async function matchAnnounce(
  admin: SupabaseClient,
  match: Record<string, unknown>
): Promise<Announce | null> {
  const matchId = String(match.id);
  const leagueId = await leagueOfSeason(admin, String(match.season_id));
  if (!leagueId) return null;
  const when = formatKickoff((match.kickoff_at ?? match.match_date) as string | null);
  const where = match.location ? ` · ${match.location}` : '';
  return {
    leagueId,
    refs: [matchId],
    payload: (leagueName) => ({
      title: `Inscriptions ouvertes · ${leagueName}`,
      body: `Match ${when}${where}. Tu viens ?`,
      url: `/?open=match&id=${matchId}`,
      tag: `match-${matchId}`,
    }),
  };
}

/** Annonce « votes ouverts » pour des trophées d'une même saison. */
async function votesAnnounce(
  admin: SupabaseClient,
  awards: Record<string, unknown>[]
): Promise<Announce | null> {
  const seasonId = String(awards[0].season_id);
  const leagueId = await leagueOfSeason(admin, seasonId);
  if (!leagueId) return null;
  return {
    leagueId,
    refs: awards.map((a) => String(a.id)),
    // Seuls les trophées pas encore annoncés figurent dans le message.
    payload: (leagueName, fresh) => {
      const sent = awards.filter((a) => fresh.has(String(a.id)));
      const single = sent.length === 1 ? sent[0] : null;
      return {
        title: `Votes ouverts · ${leagueName}`,
        body: single
          ? single.kind === 'lineup'
            ? `« ${single.title} » : compose ton équipe type.`
            : `« ${single.title} » : choisis ton joueur.`
          : `${sent.length} trophées à voter : ${sent.map((a) => a.title).join(', ')}.`,
        url: single ? `/?open=award&id=${single.id}&league=${leagueId}` : `/?open=votes`,
        tag: `votes-${seasonId}`,
      };
    },
  };
}

/** Matchs et trophées dont l'heure d'ouverture est passée (dernières 24 h), pas encore annoncés. */
async function announceDueOpenings(admin: SupabaseClient, vapid: Vapid) {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 3600 * 1000);
  const { data: due, error } = await admin
    .from('matches')
    .select('*')
    .lte('registration_opens_at', now.toISOString())
    .gt('registration_opens_at', since.toISOString());
  if (error) throw error;

  let sent = 0;
  for (const match of due ?? []) {
    const built = await matchAnnounce(admin, match);
    if (!built) continue;
    // Pas d'expéditeur : toute la ligue est prévenue, admin compris.
    const res = await deliver(admin, vapid, 'match_open', built, null);
    sent += res.sent;
  }

  // Trophées : une notification par saison, même si plusieurs ouvrent à la même heure.
  const { data: dueAwards, error: awardsError } = await admin
    .from('season_awards')
    .select('*')
    .eq('is_open', true)
    .lte('opens_at', now.toISOString())
    .gt('opens_at', since.toISOString())
    .order('created_at');
  // Colonne absente tant que la migration 016 n'est pas passée : on ignore.
  if (awardsError && !/opens_at/.test(awardsError.message)) throw awardsError;
  const bySeason = new Map<string, Record<string, unknown>[]>();
  for (const a of dueAwards ?? []) {
    const key = String(a.season_id);
    bySeason.set(key, [...(bySeason.get(key) ?? []), a]);
  }
  for (const awards of bySeason.values()) {
    const built = await votesAnnounce(admin, awards);
    if (!built) continue;
    const res = await deliver(admin, vapid, 'vote_open', built, null);
    sent += res.sent;
  }

  return { ok: true, matches: due?.length ?? 0, awards: dueAwards?.length ?? 0, sent };
}

/**
 * Envoie une annonce aux membres de la ligue (sauf l'expéditeur), une seule fois par
 * référence grâce à push_sent, et nettoie les abonnements expirés.
 */
async function deliver(
  admin: SupabaseClient,
  vapid: Vapid,
  kind: string,
  announce: Announce,
  senderId: string | null
): Promise<{ ok: true; sent: number; devices?: number; already?: boolean }> {
  // Une annonce ne part qu'une fois, même si l'app rappelle la fonction.
  const { data: logged, error: logError } = await admin
    .from('push_sent')
    .upsert(
      announce.refs.map((ref_id) => ({ kind, ref_id })),
      { onConflict: 'kind,ref_id', ignoreDuplicates: true }
    )
    .select('ref_id');
  if (logError) throw logError;
  const fresh = new Set((logged ?? []).map((r) => r.ref_id as string));
  if (fresh.size === 0) return { ok: true, sent: 0, already: true };

  const { data: league } = await admin
    .from('leagues')
    .select('name')
    .eq('id', announce.leagueId)
    .maybeSingle();
  const payload = announce.payload(league?.name ?? 'Ta ligue', fresh);

  const { data: members } = await admin
    .from('league_members')
    .select('player_id')
    .eq('league_id', announce.leagueId);
  const recipients = (members ?? [])
    .map((m) => m.player_id as string)
    .filter((id) => id !== senderId);
  if (recipients.length === 0) return { ok: true, sent: 0 };

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', recipients);

  const sent = await pushTo(admin, vapid, subs ?? [], payload);
  return { ok: true, sent, devices: subs?.length ?? 0 };
}

type Sub = { endpoint: string; p256dh: string; auth: string };

/** Envoie la notification aux abonnements donnés et supprime ceux qui n'existent plus. */
async function pushTo(admin: SupabaseClient, vapid: Vapid, subs: Sub[], payload: Payload) {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const message = JSON.stringify(payload);
  const gone: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message,
          // 2 jours : un téléphone éteint le week-end reçoit encore l'annonce.
          { TTL: 172800 }
        );
        sent += 1;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404 / 410 : l'abonnement n'existe plus (app désinstallée, permission retirée).
        if (status === 404 || status === 410) gone.push(s.endpoint);
        else console.error('Push échoué', status, (e as Error).message);
      }
    })
  );

  if (gone.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', gone);
  }
  return sent;
}

async function leagueOfSeason(admin: SupabaseClient, seasonId: string): Promise<string | null> {
  const { data } = await admin.from('seasons').select('league_id').eq('id', seasonId).maybeSingle();
  return (data?.league_id as string | undefined) ?? null;
}

/** « samedi 24 octobre à 20:00 », à l'heure de Paris (la fonction tourne en UTC). */
function formatKickoff(iso: string | null | undefined): string {
  if (!iso) return 'à venir';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'à venir';
  const tz = 'Europe/Paris';
  const day = d.toLocaleDateString('fr-FR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' });
  const time = d.toLocaleTimeString('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  return `${day} à ${time}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
