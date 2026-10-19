'use client'

// Barre d'onglets du bas. Six onglets en mode joueur, quatre en mode admin —
// le jeu bascule sur le préfixe de route, comme le `mode` du prototype.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import {
  IconCard,
  IconCreate,
  IconHome,
  IconMatch,
  IconProfile,
  IconSheet,
  IconSquad,
} from './TabIcons'

interface Tab {
  href: string
  label: string
  Icon: ComponentType<{ className?: string }>
}

// V1 : seuls l'inscription et les matchs sont ouverts aux utilisateurs.
// Feed, Direct et Compétition restent construits et fonctionnels — ils ne sont
// simplement pas exposés ici, pour revenir en V2 sans rien réécrire.
const PLAYER_TABS: Tab[] = [
  { href: '/club-matches', label: 'Matchs', Icon: IconMatch },
  { href: '/carte', label: 'Carte', Icon: IconCard },
  { href: '/profile', label: 'Profil', Icon: IconProfile },
]

const ADMIN_TABS: Tab[] = [
  { href: '/admin', label: 'Club', Icon: IconHome },
  { href: '/admin/feuille', label: 'Feuille', Icon: IconSheet },
  { href: '/admin/effectif', label: 'Effectif', Icon: IconSquad },
  { href: '/admin/creer', label: 'Créer', Icon: IconCreate },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function TabBar() {
  const pathname = usePathname()
  const tabs = pathname.startsWith('/admin') ? ADMIN_TABS : PLAYER_TABS

  return (
    <nav
      className="flex flex-none items-start border-t border-line backdrop-blur-[18px]"
      style={{
        // 18px du design, plus la barre gestuelle des téléphones sans bouton.
        height: 'calc(76px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--tabbar)',
      }}
      aria-label="Navigation principale"
    >
      {tabs.map(({ href, label, Icon }) => {
        const on = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? 'page' : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-[5px]"
            style={{ height: 58 }}
          >
            <span
              className="flex h-6 items-center justify-center transition-[color,transform] duration-200"
              style={{
                color: on ? 'var(--lime)' : 'var(--txt2)',
                transform: on ? 'translateY(-1px)' : 'none',
              }}
            >
              <Icon />
            </span>
            <span
              className="text-[10px] leading-none tracking-[.01em]"
              style={{
                color: on ? 'var(--txt)' : 'var(--txt2)',
                fontWeight: on ? 700 : 500,
              }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
