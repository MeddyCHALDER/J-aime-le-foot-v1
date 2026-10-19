// Génération de la feuille de match en PNG partageable.
//
// Le rendu passe par un canvas plutôt que par une capture DOM : on maîtrise
// exactement la typographie et la mise en page, et ça évite une dépendance de
// plus. Deux présentations, même identité :
//   · « liste »  — grand titre et noms en colonnes par ligne de jeu ;
//   · « terrain » — les inscrits disposés sur un terrain vu du dessus.
//
// Attention : l'app ne distingue pas titulaires et remplaçants. La version
// terrain place donc *tous les inscrits* à leur ligne, elle ne prétend pas
// être un onze de départ.

export interface SheetGroup {
  /** Ligne de jeu : Gardiens, Défense, Milieu, Attaque. */
  label: string
  /** Noms de famille, déjà en majuscules. */
  names: string[]
}

export type SheetVariant = 'list' | 'pitch'

export interface MatchSheetData {
  club: string
  competition: string
  /** « Lun. 1 septembre · 20:30 » */
  dateLabel: string
  /** « 25/26 » */
  season: string
  groups: SheetGroup[]
}

const W = 1080
const H = 1350
const M = 76

const LIME = '#c6ff00'
const INK = '#0e100d'
const TXT = '#f2f4ee'

const TITLE = 'COMPO'

/**
 * next/font génère des noms de familles hachés, exposés via des variables CSS.
 * On lit la valeur calculée pour pouvoir la passer au contexte canvas.
 */
function resolveFont(cssVar: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const probe = document.createElement('span')
  probe.style.cssText = `position:absolute;visibility:hidden;font-family:var(${cssVar})`
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).fontFamily
  probe.remove()
  return resolved || fallback
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Le hachurage de l'app, décliné en fond d'affiche. */
function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)

  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.rotate((122 * Math.PI) / 180)
  ctx.translate(-W, -H)
  const band = 46
  for (let x = 0; x < W * 2.4; x += band * 2) {
    ctx.fillStyle = '#212a18'
    ctx.fillRect(x, 0, band, H * 2.4)
    ctx.fillStyle = 'rgba(255,255,255,.075)'
    ctx.fillRect(x + band, 0, band, H * 2.4)
  }
  ctx.restore()

  // Halo lime en haut à droite, comme le stage de l'app.
  const glow = ctx.createRadialGradient(W * 0.82, -40, 0, W * 0.82, -40, W * 0.9)
  glow.addColorStop(0, 'rgba(198,255,0,.20)')
  glow.addColorStop(1, 'rgba(198,255,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Assombrissement du bas : le texte doit rester lisible sur le hachurage.
  const veil = ctx.createLinearGradient(0, H * 0.32, 0, H)
  veil.addColorStop(0, 'rgba(14,16,13,0)')
  veil.addColorStop(0.45, 'rgba(14,16,13,.86)')
  veil.addColorStop(1, 'rgba(14,16,13,.97)')
  ctx.fillStyle = veil
  ctx.fillRect(0, 0, W, H)
}

/** Marque J'aime le Foot et repères de saison, en haut à droite. */
async function drawMark(
  ctx: CanvasRenderingContext2D,
  season: string,
  chakra: string,
  barlow: string,
  top: number
) {
  const size = 104
  const x = W - M - size

  try {
    const mark = new Image()
    mark.src = '/jlf-mark.png'
    await mark.decode()
    ctx.save()
    roundedRect(ctx, x, top, size, size, 22)
    ctx.clip()
    ctx.drawImage(mark, x, top, size, size)
    ctx.restore()
  } catch {
    // Logo absent : un carré lime marqué JF fait le travail.
    ctx.fillStyle = LIME
    roundedRect(ctx, x, top, size, size, 22)
    ctx.fill()
    ctx.fillStyle = INK
    ctx.font = `italic 700 44px ${chakra}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('JF', x + size / 2, top + size / 2 + 2)
  }

  const [y1, y2] = season.split('/')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `500 22px ${barlow}`
  ;[y1, y2].forEach((year, i) => {
    if (!year) return
    const cx = x - 96 + i * 46
    const cy = top + 42 - i * 22
    ctx.fillStyle = 'rgba(242,244,238,.72)'
    ctx.fillText(year, cx, cy)
    ctx.beginPath()
    ctx.arc(cx, cy + 14, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(242,244,238,.5)'
    ctx.fill()
  })
}

/** Pastille du club et date du coup d'envoi. */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  club: string,
  dateLabel: string,
  chakra: string,
  barlow: string,
  cy: number
) {
  const r = 44
  const cx = M + r
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = 2.5
  ctx.strokeStyle = TXT
  ctx.stroke()
  ctx.fillStyle = TXT
  ctx.font = `italic 700 30px ${chakra}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initialsOf(club), cx, cy + 2)

  ctx.textAlign = 'left'
  ctx.font = `600 22px ${barlow}`
  ctx.fillStyle = 'rgba(242,244,238,.78)'
  ctx.fillText(dateLabel.toUpperCase(), cx + r + 24, cy + 2)
}

/** Compétition à gauche, club à droite. */
function drawFooter(
  ctx: CanvasRenderingContext2D,
  data: MatchSheetData,
  chakra: string,
  barlow: string
) {
  const y = H - 58
  ctx.textBaseline = 'middle'

  ctx.beginPath()
  ctx.arc(M + 11, y, 11, 0, Math.PI * 2)
  ctx.lineWidth = 1.6
  ctx.strokeStyle = 'rgba(242,244,238,.55)'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(M + 11, y, 3.2, 0, Math.PI * 2)
  ctx.fillStyle = LIME
  ctx.fill()

  ctx.textAlign = 'left'
  ctx.font = `700 24px ${barlow}`
  ctx.fillStyle = TXT
  ctx.fillText(data.competition.toUpperCase(), M + 34, y + 1)

  ctx.textAlign = 'right'
  ctx.font = `italic 700 30px ${chakra}`
  ctx.fillText(data.club.toUpperCase(), W - M, y + 1)
}

/** Ajuste la taille de police pour que le texte tienne dans `maxWidth`. */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  style: string,
  maxWidth: number,
  start: number
): number {
  let size = start
  for (let i = 0; i < 60; i++) {
    ctx.font = `${style} ${size}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 4
  }
  return size
}

// ---------------------------------------------------------------------------
// Variante « liste »
// ---------------------------------------------------------------------------

function drawList(
  ctx: CanvasRenderingContext2D,
  data: MatchSheetData,
  chakra: string,
  barlow: string
) {
  // Bloc ancré depuis le bas, comme sur les compos publiées par les clubs :
  // sans cet ancrage, un petit effectif laisse un trou au-dessus du pied de page.
  const groups = data.groups.filter((g) => g.names.length > 0)
  const cols = Math.max(1, groups.length)
  const gap = 16
  const colW = (W - 2 * M - gap * (cols - 1)) / cols
  const rows = Math.max(...groups.map((g) => g.names.length), 1)

  const namesBottom = H - 132
  const labelToFirstName = 34

  let nameSize = 30
  let lineH = 41
  const maxBlock = 470
  while (labelToFirstName + rows * lineH > maxBlock && nameSize > 17) {
    nameSize -= 1
    lineH = Math.round(nameSize * 1.36)
  }

  const namesTop = namesBottom - (labelToFirstName + (rows - 1) * lineH)

  const titleSize = fitFontSize(ctx, TITLE, chakra, 'italic 700', W - 2 * M, 250)
  const titleBaseline = namesTop - 52
  ctx.font = `italic 700 ${titleSize}px ${chakra}`
  ctx.fillStyle = TXT
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(TITLE, M - titleSize * 0.03, titleBaseline)

  drawBadge(
    ctx,
    data.club,
    data.dateLabel,
    chakra,
    barlow,
    titleBaseline - titleSize * 0.78 - 70
  )

  ctx.textBaseline = 'alphabetic'
  groups.forEach((group, gi) => {
    const x = M + gi * (colW + gap)

    ctx.font = `600 13px ${barlow}`
    ctx.fillStyle = LIME
    ctx.textAlign = 'left'
    ctx.fillText(spaced(group.label.toUpperCase()), x, namesTop)

    ctx.font = `700 ${nameSize}px ${barlow}`
    group.names.forEach((name, ni) => {
      ctx.fillStyle = TXT
      ctx.fillText(ellipsize(ctx, name, colW), x, namesTop + labelToFirstName + ni * lineH)
    })
  })
}

// ---------------------------------------------------------------------------
// Variante « terrain »
// ---------------------------------------------------------------------------

/** Terrain vu du dessus : bandes de tonte, tracés réglementaires. */
function drawPitch(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number
) {
  ctx.save()
  roundedRect(ctx, x0, y0, w, h, 20)
  ctx.clip()

  const base = ctx.createLinearGradient(0, y0, 0, y0 + h)
  base.addColorStop(0, '#1b3312')
  base.addColorStop(1, '#122309')
  ctx.fillStyle = base
  ctx.fillRect(x0, y0, w, h)

  // Bandes de tonte horizontales.
  const bands = 9
  const bh = h / bands
  for (let i = 0; i < bands; i += 2) {
    ctx.fillStyle = 'rgba(255,255,255,.032)'
    ctx.fillRect(x0, y0 + i * bh, w, bh)
  }

  const line = 'rgba(255,255,255,.34)'
  ctx.strokeStyle = line
  ctx.lineWidth = 3

  const p = 18 // marge intérieure entre la bordure et les tracés
  const lx = x0 + p
  const ly = y0 + p
  const lw = w - 2 * p
  const lh = h - 2 * p

  ctx.strokeRect(lx, ly, lw, lh)

  // Ligne médiane et rond central
  ctx.beginPath()
  ctx.moveTo(lx, ly + lh / 2)
  ctx.lineTo(lx + lw, ly + lh / 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(lx + lw / 2, ly + lh / 2, 78, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(lx + lw / 2, ly + lh / 2, 5, 0, Math.PI * 2)
  ctx.fillStyle = line
  ctx.fill()

  // Surfaces de réparation et de but, aux deux extrémités
  const boxW = lw * 0.56
  const boxH = lh * 0.15
  const goalW = lw * 0.28
  const goalH = lh * 0.062
  const cx = lx + lw / 2

  for (const top of [true, false]) {
    const by = top ? ly : ly + lh - boxH
    const gy = top ? ly : ly + lh - goalH
    ctx.strokeRect(cx - boxW / 2, by, boxW, boxH)
    ctx.strokeRect(cx - goalW / 2, gy, goalW, goalH)

    // Point de penalty et arc de surface
    const py = top ? ly + boxH * 0.66 : ly + lh - boxH * 0.66
    ctx.beginPath()
    ctx.arc(cx, py, 4, 0, Math.PI * 2)
    ctx.fillStyle = line
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, py, 62, top ? 0.15 * Math.PI : 1.15 * Math.PI, top ? 0.85 * Math.PI : 1.85 * Math.PI)
    ctx.stroke()
  }

  // Arcs de corner — un chemin par coin, sinon le canvas les relie entre eux.
  const cr = 20
  const corners: [number, number, number][] = [
    [lx, ly, 0],
    [lx + lw, ly, 0.5 * Math.PI],
    [lx + lw, ly + lh, Math.PI],
    [lx, ly + lh, 1.5 * Math.PI],
  ]
  for (const [cx2, cy2, from] of corners) {
    ctx.beginPath()
    ctx.arc(cx2, cy2, cr, from, from + 0.5 * Math.PI)
    ctx.stroke()
  }

  ctx.restore()

  ctx.strokeStyle = 'rgba(198,255,0,.22)'
  ctx.lineWidth = 2
  roundedRect(ctx, x0, y0, w, h, 20)
  ctx.stroke()
}

/** Un joueur : pastille lime et nom en dessous. */
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  r: number,
  nameSize: number,
  chakra: string,
  barlow: string
) {
  ctx.beginPath()
  ctx.arc(x, y + 5, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,.35)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = LIME
  ctx.fill()

  ctx.fillStyle = INK
  ctx.font = `italic 700 ${Math.round(r * 0.82)}px ${chakra}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name.slice(0, 2).toUpperCase(), x, y + 1)

  // Ombre portée pour que le nom tienne sur le vert comme sur les bandes claires.
  ctx.font = `700 ${nameSize}px ${barlow}`
  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = 'rgba(0,0,0,.75)'
  ctx.shadowBlur = 8
  ctx.fillStyle = TXT
  ctx.fillText(name, x, y + r + nameSize + 6)
  ctx.shadowBlur = 0
}

function drawPitchVariant(
  ctx: CanvasRenderingContext2D,
  data: MatchSheetData,
  chakra: string,
  barlow: string
) {
  drawBadge(ctx, data.club, data.dateLabel, chakra, barlow, 190)

  const titleSize = 96
  ctx.font = `italic 700 ${titleSize}px ${chakra}`
  ctx.fillStyle = TXT
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(TITLE, M - 3, 330)

  const x0 = M
  const y0 = 372
  const w = W - 2 * M
  const h = H - y0 - 122
  drawPitch(ctx, x0, y0, w, h)

  // Les lignes se lisent du bas vers le haut : gardiens devant leur but.
  const groups = data.groups.filter((g) => g.names.length > 0)
  if (groups.length === 0) return

  // Les attaquants restent devant la surface adverse, pas dedans.
  const padTop = 150
  const padBottom = 104
  const span = h - padTop - padBottom
  const step = groups.length > 1 ? span / (groups.length - 1) : 0

  // Une ligne très fournie se scinde en deux rangs pour ne pas se chevaucher.
  const widest = Math.max(...groups.map((g) => Math.min(g.names.length, 5)))
  const r = widest >= 5 ? 30 : 34
  const nameSize = widest >= 5 ? 19 : 21

  groups.forEach((group, gi) => {
    const bandY = y0 + h - padBottom - gi * step
    const names = group.names
    const rowsCount = names.length > 5 ? 2 : 1
    const perRow = Math.ceil(names.length / rowsCount)

    for (let row = 0; row < rowsCount; row++) {
      const slice = names.slice(row * perRow, (row + 1) * perRow)
      const y = bandY + (rowsCount === 2 ? (row === 0 ? 32 : -46) : 0)
      slice.forEach((name, i) => {
        const x = x0 + ((i + 1) * w) / (slice.length + 1)
        drawPlayer(ctx, name, x, y, r, nameSize, chakra, barlow)
      })
    }
  })
}

// ---------------------------------------------------------------------------

export async function renderMatchSheet(
  data: MatchSheetData,
  variant: SheetVariant = 'list'
): Promise<Blob> {
  const chakra = resolveFont('--font-chakra', 'sans-serif')
  const barlow = resolveFont('--font-barlow', 'sans-serif')

  // Sans cette attente, le canvas dessine avec la police de repli.
  if (document.fonts?.ready) await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')

  drawBackground(ctx)
  await drawMark(ctx, data.season, chakra, barlow, 68)

  if (variant === 'pitch') drawPitchVariant(ctx, data, chakra, barlow)
  else drawList(ctx, data, chakra, barlow)

  drawFooter(ctx, data, chakra, barlow)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Export impossible'))),
      'image/png'
    )
  })
}

/** Déclenche le téléchargement du PNG. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Laisse au navigateur le temps d'ouvrir le flux avant de libérer l'URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}

/** Interlettrage des petites capitales — le canvas n'a pas de letter-spacing. */
function spaced(text: string): string {
  return text.split('').join(' ')
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) {
    cut = cut.slice(0, -1)
  }
  return cut + '…'
}
