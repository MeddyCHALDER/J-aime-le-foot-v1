import { Platform } from 'react-native';

const HREF =
  'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Chakra+Petch:ital,wght@1,600;1,700&display=swap';

/** Injecte les polices de la marque dans le <head> (web / PWA uniquement). */
export function loadBrandFonts() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('jf-brand-fonts')) return;
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://fonts.gstatic.com';
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);
  const link = document.createElement('link');
  link.id = 'jf-brand-fonts';
  link.rel = 'stylesheet';
  link.href = HREF;
  document.head.appendChild(link);

  // Texte saisi toujours lisible sur fond sombre (Safari, Chrome, autoremplissage, champ désactivé)
  const style = document.createElement('style');
  style.id = 'jf-auth-inputs';
  style.textContent = `
    input[data-jf-input] { color: #F3F6F1 !important; -webkit-text-fill-color: #F3F6F1; caret-color: #C9FF00; opacity: 1; }
    input[data-jf-input]:disabled { -webkit-text-fill-color: #F3F6F1; opacity: 1; }
    input[data-jf-input]::placeholder { color: #6F7973; -webkit-text-fill-color: #6F7973; }
    input[data-jf-input]:-webkit-autofill,
    input[data-jf-input]:-webkit-autofill:hover,
    input[data-jf-input]:-webkit-autofill:focus {
      -webkit-text-fill-color: #F3F6F1;
      -webkit-box-shadow: 0 0 0 1000px #121815 inset;
      caret-color: #C9FF00;
      transition: background-color 9999s ease-out 0s;
    }
  `;
  document.head.appendChild(style);
}
