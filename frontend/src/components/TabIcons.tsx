// Pictogrammes au trait de la barre d'onglets, repris tels quels du prototype.
// `currentColor` suit l'état actif (lime) ou inactif (txt2).

interface IconProps {
  className?: string
}

const base = {
  width: 23,
  height: 23,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
}

export function IconFeed(p: IconProps) {
  return (
    <svg {...base} {...p} aria-hidden>
      <rect x="3" y="4" width="18" height="13" rx="2.5" />
      <path d="M10 8.6l4.4 2.4L10 13.4z" fill="currentColor" stroke="none" />
      <path d="M7 20.5h10" />
    </svg>
  )
}

export function IconLive(p: IconProps) {
  return (
    <svg {...base} {...p} aria-hidden>
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="6.4" />
      <path d="M3.6 12a8.4 8.4 0 0 1 1.6-4.9M20.4 12a8.4 8.4 0 0 0-1.6-4.9" />
    </svg>
  )
}

export function IconMatch(p: IconProps) {
  return (
    <svg {...base} {...p} aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8.5 3.5v3M15.5 3.5v3" />
      <circle cx="12" cy="14.6" r="2.2" />
    </svg>
  )
}

export function IconCard(p: IconProps) {
  return (
    <svg {...base} {...p} aria-hidden>
      <rect x="5.5" y="3" width="13" height="18" rx="2.5" />
      <circle cx="12" cy="9.2" r="2.4" />
      <path d="M8.6 16.6h6.8" />
    </svg>
  )
}

export function IconRank(p: IconProps) {
  return (
    <svg {...base} {...p} aria-hidden>
      <path d="M5 20V12M12 20V4.5M19 20v-5.5" />
    </svg>
  )
}

export function IconProfile(p: IconProps) {
  return (
    <svg {...base} {...p} aria-hidden>
      <circle cx="12" cy="8.4" r="3.6" />
      <path d="M4.8 20c0-3.6 3.2-5.6 7.2-5.6s7.2 2 7.2 5.6" />
    </svg>
  )
}

export function IconHome(p: IconProps) {
  return (
    <svg {...base} {...p} aria-hidden>
      <path d="M4 10.5L12 4l8 6.5V20H4z" />
      <path d="M9.6 20v-5.4h4.8V20" />
    </svg>
  )
}

export function IconSheet(p: IconProps) {
  return (
    <svg {...base} {...p} aria-hidden>
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
      <path d="M8.6 8.5h6.8M8.6 12.5h6.8M8.6 16.5h3.4" />
    </svg>
  )
}

export function IconSquad(p: IconProps) {
  return (
    <svg {...base} {...p} aria-hidden>
      <circle cx="9.4" cy="8.6" r="3.2" />
      <path d="M3.4 19.6c0-3.2 2.7-4.9 6-4.9s6 1.7 6 4.9" />
      <path d="M16.2 6.2a3.2 3.2 0 0 1 0 6.2M17.6 15.2c2 .6 3.2 2.1 3.2 4.4" />
    </svg>
  )
}

export function IconCreate(p: IconProps) {
  return (
    <svg {...base} {...p} aria-hidden>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}
