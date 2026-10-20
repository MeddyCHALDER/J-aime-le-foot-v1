import { Platform } from 'react-native';

/**
 * Retour visuel au toucher sur tout l'app (web / PWA) : un élément cliquable se contracte
 * légèrement quand on appuie, et ses changements de couleur sont fondus.
 * Une feuille de style globale plutôt que des dizaines de Pressable modifiés un par un.
 * Les styles transform inline (animations) restent prioritaires, rien n'est cassé.
 */
export function installPressFeedback() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('jlf-press-feedback')) return;

  const style = document.createElement('style');
  style.id = 'jlf-press-feedback';
  style.textContent = `
    [role="button"], [role="tab"], [role="switch"], [role="link"] {
      transition: transform 140ms cubic-bezier(.2,.9,.2,1), opacity 140ms ease,
        background-color 180ms ease, border-color 180ms ease, color 180ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    [role="button"]:active, [role="tab"]:active, [role="switch"]:active, [role="link"]:active {
      transform: scale(0.97);
    }
    [role="button"][aria-disabled="true"]:active {
      transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        transition-duration: 0ms !important;
        animation-duration: 0ms !important;
      }
      [role="button"]:active, [role="tab"]:active, [role="switch"]:active, [role="link"]:active {
        transform: none;
      }
    }
  `;
  document.head.appendChild(style);
}
