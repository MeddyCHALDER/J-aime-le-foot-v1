import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Web / PWA : aligne le fond de la page (html, body et barre d'état iOS)
 * sur la couleur de l'écran affiché, pour qu'aucune bande claire
 * n'apparaisse sous l'encoche ou pendant le rebond du défilement.
 * L'ancienne couleur est remise quand l'écran se ferme.
 */
export function usePageBackground(color: string) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = {
      html: html.style.backgroundColor,
      body: body.style.backgroundColor,
      meta: meta?.getAttribute('content') ?? null,
    };
    html.style.backgroundColor = color;
    body.style.backgroundColor = color;
    meta?.setAttribute('content', color);
    return () => {
      html.style.backgroundColor = prev.html;
      body.style.backgroundColor = prev.body;
      if (meta && prev.meta !== null) meta.setAttribute('content', prev.meta);
    };
  }, [color]);
}
