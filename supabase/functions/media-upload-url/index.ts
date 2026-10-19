/**
 * Génère une URL présignée (PUT) Cloudflare R2 pour uploader un média.
 * Secrets Supabase Edge Functions :
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET
 *   R2_PUBLIC_URL   (ex: https://media.jaimelefoot.app — domaine custom ou r2.dev)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type MediaKind = 'avatar' | 'image' | 'video';

const ALLOWED: Record<
  MediaKind,
  { types: string[]; maxBytes: number; folder: string }
> = {
  avatar: {
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxBytes: 5 * 1024 * 1024,
    folder: 'avatars',
  },
  image: {
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxBytes: 15 * 1024 * 1024,
    folder: 'images',
  },
  video: {
    types: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxBytes: 200 * 1024 * 1024,
    folder: 'videos',
  },
};

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const accountId = Deno.env.get('R2_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const bucket = Deno.env.get('R2_BUCKET');
    const publicBase = (Deno.env.get('R2_PUBLIC_URL') ?? '').replace(/\/$/, '');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
      return json(
        {
          error:
            'Secrets R2 manquants (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL)',
        },
        500
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non authentifié' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Session invalide' }, 401);

    const body = await req.json();
    const kind = String(body.kind ?? 'image') as MediaKind;
    const contentType = String(body.contentType ?? '').toLowerCase().trim();

    const rules = ALLOWED[kind];
    if (!rules) return json({ error: 'Type de média invalide (avatar | image | video)' }, 400);
    if (!rules.types.includes(contentType)) {
      return json({ error: `Content-Type non autorisé pour ${kind}: ${contentType}` }, 400);
    }

    const ext = EXT[contentType] ?? 'bin';
    const id = crypto.randomUUID();
    const key = `${rules.folder}/${user.id}/${id}.${ext}`;

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const putUrl = new URL(`${endpoint}/${bucket}/${key}`);
    putUrl.searchParams.set('X-Amz-Expires', '600');

    const r2 = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: 's3',
      region: 'auto',
    });

    // URL présignée PUT (valide 10 min) — le client doit renvoyer le même Content-Type
    const signed = await r2.sign(
      new Request(putUrl.toString(), {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
      }),
      { aws: { signQuery: true } }
    );

    const publicUrl = `${publicBase}/${key}`;

    return json({
      uploadUrl: signed.url,
      publicUrl,
      key,
      contentType,
      maxBytes: rules.maxBytes,
      expiresIn: 600,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
