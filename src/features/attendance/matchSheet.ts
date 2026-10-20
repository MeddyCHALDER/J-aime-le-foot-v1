import { Platform } from 'react-native';
import { brand } from '../../theme/brand';

export interface MatchSheetData {
  leagueName: string | null;
  kickoffAt: string;
  location: string | null;
  home: string[];
  away: string[];
}

const W = 1080;
const H = 1350; // portrait 4:5, s'affiche en entier dans les messageries et sur Instagram
const PAD = 72;
const DISPLAY = "italic 700 {size}px 'Chakra Petch', 'Arial Narrow', sans-serif";
const BODY = "{weight} {size}px Barlow, 'Helvetica Neue', sans-serif";

const display = (size: number) => DISPLAY.replace('{size}', String(size));
const body = (size: number, weight = 500) =>
  BODY.replace('{size}', String(size)).replace('{weight}', String(weight));

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Coupe un texte trop long avec « … » pour tenir dans maxWidth. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Dessine la feuille de match (charte de l'app) et renvoie un PNG. Web / PWA uniquement. */
export async function renderMatchSheetPng(data: MatchSheetData): Promise<Blob> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    throw new Error('La feuille de match se génère depuis l’app web.');
  }
  // Les polices de la marque doivent être chargées avant de dessiner sur le canvas.
  try {
    await Promise.all([
      document.fonts.load(display(64)),
      document.fonts.load(body(32, 600)),
      document.fonts.load(body(32, 500)),
    ]);
  } catch {
    /* polices de repli */
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible sur ce navigateur.');

  // Fond terrain + lignes
  ctx.fillStyle = brand.ink;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 3;
  ctx.strokeRect(PAD / 2, PAD / 2, W - PAD, H - PAD);
  ctx.beginPath();
  ctx.arc(W / 2, H - PAD / 2, 150, Math.PI, 2 * Math.PI);
  ctx.stroke();

  // Bandeau lime en diagonale (comme les écrans d'entrée)
  ctx.fillStyle = brand.lime;
  ctx.beginPath();
  ctx.moveTo(W - 300, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, 200);
  ctx.lineTo(W - 400, 200);
  ctx.closePath();
  ctx.fill();

  // Logo + nom de l'app
  const mark = await loadImage('/logo192.png');
  let y = PAD + 8;
  if (mark) ctx.drawImage(mark, PAD, y, 72, 72);
  ctx.fillStyle = brand.text;
  ctx.font = display(40);
  ctx.textBaseline = 'middle';
  ctx.fillText("J'AIME LE FOOT", PAD + (mark ? 96 : 0), y + 38);

  // Titre
  y += 170;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = brand.lime;
  ctx.font = body(28, 600);
  ctx.fillText(fit(ctx, (data.leagueName ?? 'Feuille de match').toUpperCase(), W - PAD * 2), PAD, y);
  y += 84;
  ctx.fillStyle = brand.text;
  ctx.font = display(88);
  ctx.fillText('FEUILLE DE MATCH', PAD, y);

  // Date, heure, lieu
  const d = new Date(data.kickoffAt);
  const day = capitalize(
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  );
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  y += 64;
  ctx.fillStyle = brand.muted;
  ctx.font = body(34, 500);
  ctx.fillText(fit(ctx, `${day} · ${time}`, W - PAD * 2), PAD, y);
  if (data.location) {
    y += 48;
    ctx.fillText(fit(ctx, data.location, W - PAD * 2), PAD, y);
  }

  // Deux colonnes : Équipe A / Équipe B
  y += 80;
  const gap = 32;
  const colW = (W - PAD * 2 - gap) / 2;
  const cols: Array<{ title: string; players: string[]; x: number }> = [
    { title: 'ÉQUIPE A', players: data.home, x: PAD },
    { title: 'ÉQUIPE B', players: data.away, x: PAD + colW + gap },
  ];
  const maxRows = Math.max(data.home.length, data.away.length, 1);
  const footerTop = H - PAD - 70;
  const rowH = Math.min(84, Math.floor((footerTop - y - 130) / maxRows));
  const cardH = 110 + rowH * maxRows;
  // Centre le bloc des équipes dans l'espace restant (évite un grand vide en bas)
  y += Math.max(0, Math.floor((footerTop - y - cardH) / 2));

  for (const col of cols) {
    ctx.fillStyle = brand.surface;
    ctx.beginPath();
    ctx.roundRect(col.x, y, colW, cardH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = brand.lime;
    ctx.font = display(44);
    ctx.fillText(col.title, col.x + 32, y + 68);
    ctx.fillStyle = brand.muted;
    ctx.font = body(26, 600);
    const count = `${col.players.length}`;
    ctx.fillText(count, col.x + colW - 32 - ctx.measureText(count).width, y + 66);

    col.players.forEach((name, i) => {
      const ry = y + 110 + i * rowH + rowH * 0.65;
      ctx.fillStyle = brand.muted2;
      ctx.font = body(26, 600);
      ctx.fillText(String(i + 1).padStart(2, '0'), col.x + 32, ry);
      ctx.fillStyle = brand.text;
      ctx.font = body(Math.min(38, rowH * 0.5), 600);
      ctx.fillText(fit(ctx, name, colW - 120), col.x + 84, ry);
    });
  }

  // Pied de page
  ctx.fillStyle = brand.muted2;
  ctx.font = body(26, 500);
  const total = data.home.length + data.away.length;
  ctx.fillText(`${total} joueurs · ${data.home.length} contre ${data.away.length}`, PAD, H - PAD - 8);
  const site = 'jaimelefoot.app';
  ctx.fillText(site, W - PAD - ctx.measureText(site).width, H - PAD - 8);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export PNG impossible.'))), 'image/png')
  );
}

/**
 * Propose l'image au téléphone (menu de partage : « Enregistrer l'image », WhatsApp…)
 * ou la télécharge directement sur ordinateur.
 */
export async function shareOrDownloadPng(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Feuille de match' });
      return 'shared';
    } catch (e) {
      // Partage annulé par l'utilisateur : pas une erreur
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

/** Nom de fichier : feuille-de-match-2026-10-24.png */
export function matchSheetFilename(kickoffAt: string) {
  const d = new Date(kickoffAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `feuille-de-match-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.png`;
}
