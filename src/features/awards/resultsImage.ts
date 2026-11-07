import { Platform } from 'react-native';
import { brand } from '../../theme/brand';
import { body, display, fit, loadImage } from '../attendance/matchSheet';
import { positionShort } from '../cards/FifaCard';
import type { PitchSlot } from './formations';

/** Joueur tel qu'il apparaît sur sa carte. Les voix ne figurent jamais sur l'image. */
export interface CardPlayer {
  name: string;
  avatarUrl: string | null;
  overall: number | null;
  position: string | null;
}

interface Common {
  leagueName: string | null;
  title: string;
  blurb?: string | null;
}

export type AwardResultsImage =
  | (Common & { kind: 'single'; winners: CardPlayer[] })
  | (Common & {
      kind: 'lineup';
      formation: string;
      slots: PitchSlot[];
      /** Élu de chaque poste, par clé de poste */
      winners: Record<string, CardPlayer>;
    });

const W = 1080;
const H = 1350; // même format que la feuille de match : 4:5, entier dans WhatsApp
const PAD = 72;
// Or de la carte (FifaCard) et encre sur or
const GOLD_STOPS: Array<[number, string]> = [
  [0, '#E8C46A'],
  [0.3, '#F6E7B6'],
  [0.52, '#D9B45A'],
  [0.78, '#C99B3B'],
  [1, '#F2DFA8'],
];
const INK = '#2a2410';

/** Image des vainqueurs d'un trophée (charte de l'app), à partager. Web / PWA uniquement. */
export async function renderAwardResultsPng(data: AwardResultsImage): Promise<Blob> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    throw new Error('L’image des résultats se génère depuis l’app web.');
  }
  try {
    await Promise.all([document.fonts.load(display(64)), document.fonts.load(body(32, 600))]);
  } catch {
    /* polices de repli */
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible sur ce navigateur.');

  ctx.fillStyle = brand.ink;
  ctx.fillRect(0, 0, W, H);

  // Rayons d'abord : tout le reste se dessine par-dessus
  const stageTop = headerBottom(data) + 40;
  const stageBottom = H - PAD - 60;
  const glowY = data.kind === 'single' ? stageTop + (stageBottom - stageTop) * 0.42 : stageTop + 120;
  drawRays(ctx, W / 2, glowY, data.kind === 'single' ? 1 : 0.55);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 3;
  ctx.strokeRect(PAD / 2, PAD / 2, W - PAD, H - PAD);

  // Bandeau lime en diagonale, comme la feuille de match
  ctx.fillStyle = brand.lime;
  ctx.beginPath();
  ctx.moveTo(W - 300, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, 200);
  ctx.lineTo(W - 400, 200);
  ctx.closePath();
  ctx.fill();

  await drawHeader(ctx, data);

  if (data.kind === 'single') await drawSingle(ctx, data.winners, stageTop, stageBottom);
  else await drawLineup(ctx, data, stageTop, stageBottom);

  ctx.fillStyle = brand.muted2;
  ctx.font = body(26, 500);
  const day = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(`Élu par la ligue · ${day}`, PAD, H - PAD - 8);
  const site = 'jaimelefoot.app';
  ctx.fillText(site, W - PAD - ctx.measureText(site).width, H - PAD - 8);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export PNG impossible.'))), 'image/png')
  );
}

/** Ordonnée de la fin de l'en-tête, connue avant de le dessiner. */
function headerBottom(data: AwardResultsImage) {
  return PAD + 8 + 160 + 84 + (data.blurb ? 52 : 0);
}

async function drawHeader(ctx: CanvasRenderingContext2D, data: AwardResultsImage) {
  const mark = await loadImage('/logo192.png');
  let y = PAD + 8;
  if (mark) ctx.drawImage(mark, PAD, y, 72, 72);
  ctx.fillStyle = brand.text;
  ctx.font = display(40);
  ctx.textBaseline = 'middle';
  ctx.fillText("J'AIME LE FOOT", PAD + (mark ? 96 : 0), y + 38);

  y += 160;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = brand.lime;
  ctx.font = body(28, 600);
  const eyebrow = `${data.leagueName ? `${data.leagueName} · ` : ''}RÉSULTATS`;
  ctx.fillText(fit(ctx, eyebrow.toUpperCase(), W - PAD * 2), PAD, y);
  y += 84;
  ctx.fillStyle = brand.text;
  ctx.font = display(80);
  ctx.fillText(fit(ctx, data.title.toUpperCase(), W - PAD * 2), PAD, y);
  if (data.blurb) {
    y += 52;
    ctx.fillStyle = brand.muted;
    ctx.font = body(32, 500);
    ctx.fillText(fit(ctx, data.blurb, W - PAD * 2), PAD, y);
  }
}

/** Éclat de lumière : halo, faisceaux alternés or / lime et étincelles. */
function drawRays(ctx: CanvasRenderingContext2D, cx: number, cy: number, strength: number) {
  const R = Math.hypot(W, H);
  ctx.save();

  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 620);
  halo.addColorStop(0, `rgba(246,231,182,${0.55 * strength})`);
  halo.addColorStop(0.35, `rgba(198,255,0,${0.18 * strength})`);
  halo.addColorStop(1, 'rgba(198,255,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  const count = 28;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    // Faisceaux de largeurs inégales, comme des projecteurs
    const a = (i / count) * Math.PI * 2 + 0.06;
    const spread = (Math.PI / count) * (i % 3 === 0 ? 0.62 : 0.32);
    const tint = i % 2 === 0 ? '246,231,182' : '198,255,0';
    const g = ctx.createRadialGradient(cx, cy, 30, cx, cy, R * 0.75);
    g.addColorStop(0, `rgba(${tint},${(i % 2 === 0 ? 0.5 : 0.32) * strength})`);
    g.addColorStop(0.45, `rgba(${tint},${0.1 * strength})`);
    g.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a - spread, a + spread);
    ctx.closePath();
    ctx.fill();
  }

  // Étincelles à des places fixes : la même image à chaque export
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 120 + rnd() * 560;
    const r = 1 + rnd() * 3.2;
    ctx.fillStyle = `rgba(255,248,220,${(0.35 + rnd() * 0.6) * strength})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

function centered(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxWidth: number) {
  const t = fit(ctx, text, maxWidth);
  ctx.fillText(t, cx - ctx.measureText(t).width / 2, y);
}

/** Carte or du joueur, comme FifaCard : note, poste, photo et nom. */
async function drawCard(
  ctx: CanvasRenderingContext2D,
  p: CardPlayer,
  x: number,
  y: number,
  w: number,
  glow: boolean
) {
  const h = w * 1.36;
  const radius = w * 0.075;
  const img = p.avatarUrl ? await loadImage(p.avatarUrl, true) : null;

  ctx.save();
  if (glow) {
    ctx.shadowColor = 'rgba(246,231,182,0.9)';
    ctx.shadowBlur = w * 0.28;
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = w * 0.12;
    ctx.shadowOffsetY = w * 0.04;
  }
  ctx.fillStyle = '#D9B45A';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();

  const gold = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  for (const [o, c] of GOLD_STOPS) gold.addColorStop(o, c);
  ctx.fillStyle = gold;
  ctx.fillRect(x, y, w, h);

  // Photo (ou initiales) sur la partie droite
  const px = x + w * 0.3;
  const py = y + h * 0.12;
  const pw = w * 0.66;
  const ph = h * 0.66;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, w * 0.05);
  ctx.clip();
  if (img) {
    // Recadrage au centre de la photo, aux proportions du cadre
    const ratio = pw / ph;
    const sw = Math.min(img.width, img.height * ratio);
    const sh = sw / ratio;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, px, py, pw, ph);
  } else {
    ctx.fillStyle = 'rgba(42,36,16,0.10)';
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = 'rgba(42,36,16,0.5)';
    ctx.font = display(Math.round(w * 0.26));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(p.name), px + pw / 2, py + ph / 2);
  }
  ctx.restore();

  // Reflet en diagonale
  ctx.save();
  ctx.translate(x + w * 0.2, y);
  ctx.rotate(0.35);
  const shine = ctx.createLinearGradient(0, 0, w * 0.35, 0);
  shine.addColorStop(0, 'rgba(255,255,255,0)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.32)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, -h, w * 0.35, h * 3);
  ctx.restore();

  ctx.fillStyle = INK;
  ctx.font = display(Math.round(w * 0.24));
  ctx.fillText(p.overall != null ? String(p.overall) : '—', x + w * 0.07, y + w * 0.27);
  ctx.font = body(Math.round(w * 0.075), 700);
  ctx.fillText(positionShort(p.position), x + w * 0.08, y + w * 0.37);
  ctx.fillStyle = 'rgba(42,36,16,0.35)';
  ctx.fillRect(x + w * 0.08, y + w * 0.42, w * 0.12, Math.max(2, w * 0.008));

  ctx.fillStyle = 'rgba(242,223,168,0.92)';
  ctx.fillRect(x, y + h * 0.8, w, h * 0.2);
  ctx.fillStyle = INK;
  ctx.font = display(Math.round(w * 0.12));
  centered(ctx, (p.name.split(' ').pop() ?? p.name).toUpperCase(), x + w / 2, y + h * 0.935, w * 0.88);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,248,220,0.7)';
  ctx.lineWidth = Math.max(2, w * 0.008);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();
}

/** Vainqueur, ou ex æquo, en grande carte au cœur des rayons. */
async function drawSingle(ctx: CanvasRenderingContext2D, winners: CardPlayer[], top: number, bottom: number) {
  const list = winners.slice(0, 4);
  const n = list.length;
  if (n === 0) return;

  ctx.fillStyle = brand.lime;
  ctx.font = body(30, 700);
  centered(ctx, n > 1 ? 'VAINQUEURS EX ÆQUO' : 'VAINQUEUR', W / 2, top + 40, W - PAD * 2);

  const nameH = n === 1 ? 90 : 0;
  const avail = bottom - top - 80 - nameH;
  const perRow = n === 4 ? 2 : n;
  const rowsN = n === 4 ? 2 : 1;
  const gap = 36;
  const byWidth = (W - PAD * 2 - gap * (perRow - 1)) / perRow;
  const byHeight = (avail - gap * (rowsN - 1)) / rowsN / 1.36;
  const w = Math.min(byWidth, byHeight, 430);
  const h = w * 1.36;
  const y0 = top + 70 + (avail - (rowsN * h + (rowsN - 1) * gap)) / 2;

  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    const rowW = inRow * w + (inRow - 1) * gap;
    await drawCard(ctx, list[i]!, (W - rowW) / 2 + (i % perRow) * (w + gap), y0 + row * (h + gap), w, true);
  }

  if (n === 1) {
    ctx.fillStyle = brand.text;
    ctx.font = display(64);
    centered(ctx, list[0]!.name.toUpperCase(), W / 2, y0 + h + 82, W - PAD * 2);
  }
}

/** Demi-terrain avec la carte de l'élu à chaque poste. */
async function drawLineup(
  ctx: CanvasRenderingContext2D,
  data: Extract<AwardResultsImage, { kind: 'lineup' }>,
  top: number,
  bottom: number
) {
  const x0 = PAD;
  const w = W - PAD * 2;
  const h = bottom - top - 10;

  ctx.fillStyle = 'rgba(24,27,22,0.72)';
  ctx.beginPath();
  ctx.roundRect(x0, top, w, h, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Rond central en haut, surface de réparation en bas
  ctx.beginPath();
  ctx.arc(x0 + w / 2, top, 110, 0, Math.PI);
  ctx.stroke();
  ctx.strokeRect(x0 + w * 0.22, top + h - 170, w * 0.56, 170);
  ctx.strokeRect(x0 + w * 0.36, top + h - 70, w * 0.28, 70);

  ctx.fillStyle = brand.muted;
  ctx.font = body(26, 600);
  // En bas à gauche : seul coin du terrain où aucune carte ne se pose
  ctx.fillText(data.formation, x0 + 24, top + h - 24);

  // Lignes régulièrement espacées : à l'écran le gardien colle à la défense, ce qui
  // ne laisse pas la place des cartes.
  const rows = [...new Set(data.slots.map((sl) => sl.y))].sort((p, q) => p - q);
  const widest = Math.max(...rows.map((r) => data.slots.filter((sl) => sl.y === r).length));
  const cardW = Math.min(150, (w - 40) / widest - 24, (h - 40) / rows.length / 1.36 - 14);
  const cardH = cardW * 1.36;
  const step = rows.length > 1 ? (h - 40 - cardH) / (rows.length - 1) : 0;

  for (const slot of data.slots) {
    const cx = x0 + (slot.x / 100) * w;
    const y = top + 20 + rows.indexOf(slot.y) * step;
    const p = data.winners[slot.key];
    if (p) {
      await drawCard(ctx, p, cx - cardW / 2, y, cardW, false);
      continue;
    }
    ctx.strokeStyle = 'rgba(242,244,238,0.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.roundRect(cx - cardW / 2, y, cardW, cardH, cardW * 0.075);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = brand.muted;
    ctx.font = body(26, 600);
    centered(ctx, slot.label, cx, y + cardH / 2 + 9, cardW);
  }
}

/** Nom de fichier : resultats-ballon-d-or.png */
export function resultsFilename(title: string) {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `resultats-${slug || 'trophee'}.png`;
}
