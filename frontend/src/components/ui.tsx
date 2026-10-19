'use client'

// Primitives partagées par les écrans — les motifs qui reviennent dans le
// prototype : titre d'écran, intertitre, pastille, avatar, contrôle segmenté,
// jauge de stat, placeholder de média, état vide.

import type { CSSProperties, ReactNode } from 'react'
import { initials as toInitials } from '@/lib/format'

export function Screen({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-bg"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      {children}
    </div>
  )
}

/** Ligne de titre d'écran, avec une action ou un badge optionnel à droite. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-[18px]">
      <h1 className="t-title">{title}</h1>
      {right}
    </div>
  )
}

export function SectionLabel({
  children,
  className = '',
  right,
}: {
  children: ReactNode
  className?: string
  right?: ReactNode
}) {
  if (right) {
    return (
      <div className={`flex items-baseline justify-between px-4 ${className}`}>
        <div className="t-section">{children}</div>
        {right}
      </div>
    )
  }
  return <div className={`t-section px-4 ${className}`}>{children}</div>
}

/** Pastille lime discrète (Saison 25/26, tag d'un post…). */
export function Pill({
  children,
  tone = 'lime',
}: {
  children: ReactNode
  tone?: 'lime' | 'ghost'
}) {
  if (tone === 'ghost') {
    return (
      <span className="flex h-8 items-center rounded-[9px] border border-line px-3 text-[12px] font-semibold text-txt2">
        {children}
      </span>
    )
  }
  return (
    <span className="flex h-8 items-center rounded-[9px] bg-[rgba(198,255,0,.14)] px-3 text-[12px] font-semibold text-lime">
      {children}
    </span>
  )
}

export function Avatar({
  name,
  size = 34,
  highlight = false,
  src,
  className = '',
  style,
}: {
  name: string
  size?: number
  /** Fond lime : le joueur connecté, ou un joueur présent. */
  highlight?: boolean
  src?: string | null
  className?: string
  style?: CSSProperties
}) {
  const shared: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.34),
    ...style,
  }

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars servis par le backend, taille libre
      <img
        src={src}
        alt={name}
        className={`flex-none rounded-full object-cover ${className}`}
        style={shared}
      />
    )
  }

  return (
    <span
      className={`t-num flex flex-none items-center justify-center rounded-full ${className}`}
      style={{
        ...shared,
        background: highlight ? 'var(--lime)' : 'var(--surface2)',
        color: highlight ? '#12140f' : 'var(--txt)',
      }}
      aria-hidden
    >
      {toInitials(name)}
    </span>
  )
}

export interface SegmentOption<T extends string> {
  id: T
  label: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div className={`seg ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          data-on={value === o.id}
          className="seg-btn"
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Jauge d'une stat de la carte. Au-dessus de 80 la barre passe en lime plein. */
/** Média absent : le hachurage du prototype, avec son étiquette. */
export function MediaPlaceholder({
  label,
  hue = 0,
  band = 16,
  className = '',
  style,
}: {
  label?: string
  hue?: number
  band?: number
  className?: string
  style?: CSSProperties
}) {
  const hues = ['#1a2114', '#141a21', '#211a14']
  const color = hues[hue % hues.length]
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        background: `repeating-linear-gradient(122deg, ${color} 0 ${band}px, rgba(255,255,255,.05) ${band}px ${band * 2}px)`,
        ...style,
      }}
    >
      {label && <span className="t-mono text-[rgba(255,255,255,.45)]">{label}</span>}
    </div>
  )
}

/** Bascule des réglages d'inscription. */
export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="flex flex-none items-center rounded-[16px] p-[3px] transition-all duration-200"
      style={{
        width: 50,
        height: 30,
        border: `1px solid ${on ? 'transparent' : 'var(--line)'}`,
        background: on ? 'var(--lime)' : 'transparent',
        justifyContent: on ? 'flex-end' : 'flex-start',
      }}
    >
      <span
        className="block rounded-full"
        style={{ width: 22, height: 22, background: on ? '#12140f' : 'var(--txt2)' }}
      />
    </button>
  )
}

/** Rien à afficher : donnée absente côté backend, ou club sans contenu. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="mx-4 my-4 rounded-[16px] border border-dashed border-line px-5 py-8 text-center">
      <div className="t-item-sm">{title}</div>
      {hint && <p className="mx-auto mt-2 max-w-[30ch] text-[12.5px] leading-[1.45] text-txt2">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Squelette de chargement, calé sur la hauteur du bloc qu'il remplace. */
export function Skeleton({ height, className = '' }: { height: number; className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[14px] bg-surface ${className}`}
      style={{ height }}
      aria-hidden
    />
  )
}

/** Bandeau d'erreur réseau, sobre : l'écran reste lisible en dessous. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="mx-4 mt-3 rounded-[12px] border border-[rgba(255,59,48,.3)] bg-[rgba(255,59,48,.08)] px-4 py-3 text-[12.5px] leading-[1.45] text-txt2">
      {children}
    </div>
  )
}
