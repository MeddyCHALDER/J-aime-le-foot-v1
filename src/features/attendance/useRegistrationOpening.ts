import { useEffect, useState } from 'react';

/** « dans 3 h 12 », « dans 2 j 4 h », « dans 5 min » */
function untilLabel(ms: number) {
  const min = Math.max(1, Math.ceil(ms / 60000));
  if (min < 60) return `dans ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `dans ${h} h ${String(min % 60).padStart(2, '0')}`;
  const d = Math.floor(h / 24);
  return `dans ${d} j ${h % 24} h`;
}

/**
 * État des inscriptions d'un match : ouvertes, ou ouverture programmée avec compte à rebours.
 * Se met à jour toute seule (les boutons se débloquent à l'heure, sans recharger la page).
 */
export function useRegistrationOpening(opensAt: string | null | undefined) {
  const target = opensAt ? new Date(opensAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target || target <= Date.now()) return;
    // Rafraîchit chaque minute, et pile à l'heure d'ouverture si elle tombe avant.
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const atOpening = setTimeout(() => setNow(Date.now()), target - Date.now() + 500);
    return () => {
      clearInterval(tick);
      clearTimeout(atOpening);
    };
  }, [target]);

  const open = !target || target <= now;
  const date = target ? new Date(target) : null;
  const when = date
    ? `${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  return {
    open,
    /** « dimanche 20 oct. à 12:00 » */
    when,
    /** « dans 3 h 12 » */
    countdown: !open && target ? untilLabel(target - now) : '',
  };
}
