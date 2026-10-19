import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

export type MediaKind = 'avatar' | 'image' | 'video';

export type UploadUrlResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  contentType: string;
  maxBytes: number;
  expiresIn: number;
};

export async function requestUploadUrl(
  kind: MediaKind,
  contentType: string
): Promise<UploadUrlResponse> {
  const { data, error } = await supabase.functions.invoke('media-upload-url', {
    body: { kind, contentType },
  });

  if (error) throw new Error(error.message || 'Impossible d’obtenir une URL d’upload');
  if (data?.error) throw new Error(String(data.error));
  return data as UploadUrlResponse;
}

/** Upload direct vers R2 via URL présignée, retourne l’URL publique. */
export async function uploadMedia(
  kind: MediaKind,
  file: Blob | ArrayBuffer,
  contentType: string
): Promise<{ publicUrl: string; key: string }> {
  const size = file instanceof Blob ? file.size : file.byteLength;
  const signed = await requestUploadUrl(kind, contentType);

  if (size > signed.maxBytes) {
    throw new Error(`Fichier trop volumineux (max ${Math.round(signed.maxBytes / 1024 / 1024)} Mo)`);
  }

  const res = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload R2 échoué (${res.status}) ${text}`.trim());
  }

  return { publicUrl: signed.publicUrl, key: signed.key };
}

/** Sélecteur de fichier (web + fallback). */
export function pickMediaFile(opts: {
  accept: string;
}): Promise<{ blob: Blob; contentType: string; name: string } | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    throw new Error('Sélection de fichier native à venir — utilise la version web pour l’instant.');
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = opts.accept;
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => {
      input.remove();
    };

    input.onchange = () => {
      const file = input.files?.[0];
      cleanup();
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        blob: file,
        contentType: file.type || 'application/octet-stream',
        name: file.name,
      });
    };

    input.oncancel = () => {
      cleanup();
      resolve(null);
    };

    input.click();
  });
}
