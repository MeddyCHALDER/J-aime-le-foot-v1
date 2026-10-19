import { AccessibilityInfo } from 'react-native';

/** Respecte le réglage « Réduire les animations » du téléphone. */
let reduceMotion = false;

try {
  AccessibilityInfo.isReduceMotionEnabled()
    .then((v) => {
      reduceMotion = v;
    })
    .catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
    reduceMotion = v;
  });
} catch {
  // plateforme sans support : animations normales
}

export function isReduceMotion() {
  return reduceMotion;
}

/** Durée en ms, ramenée à 0 si l'utilisateur a demandé moins d'animations. */
export function dur(ms: number) {
  return reduceMotion ? 0 : ms;
}
