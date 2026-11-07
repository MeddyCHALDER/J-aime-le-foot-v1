import { Platform } from 'react-native';
import { brand } from '../../theme/brand';
import { body, display, fit, loadImage } from '../attendance/matchSheet';
import type { PitchSlot } from './formations';

export interface ResultPlayer {
  name: string;
  avatarUrl: string | null;
  votes: number;
}

interface Common {
  leagueName: string | null;
  title: string;
  blurb?: string | null;
}

export type AwardResultsImage =
  | (Common & { kind: 'single'; ranking: ResultPlayer[]; totalVotes: number })
  | (Common & {
      kind: 'lineup';
      formation: string;
      slots: PitchSlot[];
      /** Gagnant de chaque poste, par clé de poste */
      winners: Record<string, ResultPlayer>;
      voters: number;
    });

const W = 1080;
const H = 1350; // même format que la feuille de match : 4:5, entier dans WhatsApp
const PAD = 72;

/** Image des résultats d'un trophée (charte de l'app), à partager. Web / PWA uniquement. */
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

  const footerTop = H - PAD - 60;
  if (data.kind === 'single') await drawSingle(ctx, data, y + 60, footerTop);
  else await drawLineup(ctx, data, y + 50, footerTop);

  ctx.fillStyle = brand.muted2;
  ctx.font = body(26, 500);
  const count = data.kind === 'single' ? data.totalVotes : data.voters;
  const unit = data.kind === 'single' ? 'voix' : count > 1 ? 'votants' : 'votant';
  ctx.fillText(`${count} ${unit}`, PAD, H - PAD - 8);
  const site = 'jaimelefoot.app';
  ctx.fillText(site, W - PAD - ctx.measureText(site).width, H - PAD - 8);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export PNG impossible.'))), 'image/png')
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** Photo ronde du joueur, ou ses initiales si elle manque ou ne se charge pas. */
async function drawAvatar(
  ctx: CanvasRenderingContext2D,
  p: ResultPlayer,
  cx: number,
  cy: number,
  r: number,
  ring: string
) {
  const img = p.avatarUrl ? await loadImage(p.avatarUrl, true) : null;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = brand.surface2;
  ctx.fill();
  if (img) {
    ctx.clip();
    // Recadrage carré au centre de la photo
    const side = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = brand.text;
    ctx.font = display(Math.round(r * 0.8));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(p.name), cx, cy + r * 0.04);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = ring;
  ctx.lineWidth = Math.max(4, r * 0.06);
  ctx.stroke();
}

function centered(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxWidth: number) {
  const t = fit(ctx, text, maxWidth);
  ctx.fillText(t, cx - ctx.measureText(t).width / 2, y);
}

/** Vainqueur (ou ex æquo) en grand, puis les places suivantes. */
async function drawSingle(
  ctx: CanvasRenderingContext2D,
  data: Extract<AwardResultsImage, { kind: 'single' }>,
  top: number,
  bottom: number
) {
  const best = data.ranking[0]?.votes ?? 0;
  const winners = data.ranking.filter((p) => p.votes === best && best > 0).slice(0, 4);
  const others = data.ranking.filter((p) => p.votes > 0 && !winners.includes(p)).slice(0, 3);
  const share = (v: number) => (data.totalVotes ? ` · ${Math.round((v / data.totalVotes) * 100)} %` : '');

  ctx.fillStyle = brand.lime;
  ctx.font = body(30, 700);
  centered(ctx, winners.length > 1 ? 'VAINQUEURS EX ÆQUO' : 'VAINQUEUR', W / 2, top + 20, W - PAD * 2);

  const n = winners.length;
  const r = n === 1 ? 150 : n === 2 ? 130 : 100;
  const cy = top + 60 + r;
  const colW = (W - PAD * 2) / n;
  for (let i = 0; i < n; i++) {
    const p = winners[i]!;
    const cx = PAD + colW * i + colW / 2;
    await drawAvatar(ctx, p, cx, cy, r, brand.lime);
    ctx.fillStyle = brand.text;
    ctx.font = display(n === 1 ? 72 : 46);
    centered(ctx, p.name.toUpperCase(), cx, cy + r + (n === 1 ? 96 : 70), colW - 24);
    ctx.fillStyle = brand.muted;
    ctx.font = body(n === 1 ? 34 : 28, 600);
    centered(ctx, `${p.votes} voix${share(p.votes)}`, cx, cy + r + (n === 1 ? 148 : 112), colW - 24);
  }

  // Places suivantes, alignées en bas, autant que la place le permet
  const rowH = 84;
  const firstRow = cy + r + (n === 1 ? 190 : 150);
  const shown = others.slice(0, Math.max(0, Math.floor((bottom - 10 - firstRow) / rowH)));
  if (shown.length === 0) return;
  let y = bottom - 10 - shown.length * rowH;
  let rank = n + 1;
  for (const p of shown) {
    ctx.fillStyle = brand.surface;
    ctx.beginPath();
    ctx.roundRect(PAD, y, W - PAD * 2, rowH - 14, 18);
    ctx.fill();
    const mid = y + (rowH - 14) / 2 + 12;
    ctx.fillStyle = brand.muted2;
    ctx.font = display(34);
    ctx.fillText(String(rank), PAD + 28, mid);
    ctx.fillStyle = brand.text;
    ctx.font = body(34, 600);
    ctx.fillText(fit(ctx, p.name, W - PAD * 2 - 320), PAD + 90, mid);
    ctx.fillStyle = brand.muted;
    ctx.font = body(28, 600);
    const v = `${p.votes} voix`;
    ctx.fillText(v, W - PAD - 28 - ctx.measureText(v).width, mid);
    y += rowH;
    rank += 1;
  }
}

/** Demi-terrain avec le joueur élu à chaque poste. */
async function drawLineup(
  ctx: CanvasRenderingContext2D,
  data: Extract<AwardResultsImage, { kind: 'lineup' }>,
  top: number,
  bottom: number
) {
  const x0 = PAD;
  const w = W - PAD * 2;
  const h = bottom - top - 20;

  ctx.fillStyle = brand.surface;
  ctx.beginPath();
  ctx.roundRect(x0, top, w, h, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
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
  ctx.fillText(data.formation, x0 + 24, top + 44);

  const r = data.slots.length > 9 ? 44 : 54;
  // Lignes régulièrement espacées : à l'écran le gardien colle à la défense, ce qui
  // ne laisse pas la place des noms. La dernière garde sous elle la place du sien.
  const rows = [...new Set(data.slots.map((sl) => sl.y))].sort((p, q) => p - q);
  const step = rows.length > 1 ? (h - 120 - r * 2) / (rows.length - 1) : 0;
  const yOf = (pct: number) => top + 60 + r + rows.indexOf(pct) * step;
  for (const slot of data.slots) {
    const cx = x0 + (slot.x / 100) * w;
    const cy = yOf(slot.y);
    const p = data.winners[slot.key];
    if (!p) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(242,244,238,0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = brand.muted;
      ctx.font = body(26, 600);
      centered(ctx, slot.label, cx, cy + 10, r * 2);
      continue;
    }
    await drawAvatar(ctx, p, cx, cy, r, brand.lime);
    // Nom et voix sur une seule ligne : deux lignes ne tiennent pas entre gardien et défense
    const ly = cy + r + 34;
    const votes = ` ${p.votes}`;
    ctx.font = body(26, 700);
    const vw = ctx.measureText(votes).width;
    ctx.font = display(28);
    const last = fit(ctx, (p.name.split(' ').pop() ?? p.name).toUpperCase(), 200 - vw);
    const nw = ctx.measureText(last).width;
    const lx = cx - (nw + vw) / 2;
    ctx.fillStyle = brand.text;
    ctx.fillText(last, lx, ly);
    ctx.fillStyle = brand.lime;
    ctx.font = body(26, 700);
    ctx.fillText(votes, lx + nw, ly);
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
