'use client'

// La carte collector : or brossé, brillance qui balaie, et la note globale.
// C'est l'objet central de l'app — tout ce qui est saisi sur le terrain
// finit ici. Les six stats ne sont plus affichées (demande produit) ; elles
// restent calculées et nourrissent la note. Deux tailles : `mini` pour
// l'onboarding, `big` pour l'écran Ma carte.

import { useState } from 'react'
import { positionShort } from '@/lib/format'
import type { PlayerCard as PlayerCardModel, PlayerProfile } from '@/lib/types'

const GOLD =
  'linear-gradient(150deg,#E8C46A 0%,#F6E7B6 30%,#D9B45A 52%,#C99B3B 78%,#F2DFA8 100%)'
const INK = '#2a2410'

function Shine() {
  return (
    <div
      className="pointer-events-none absolute animate-shine"
      style={{
        top: '-40%',
        left: 0,
        width: '42%',
        height: '190%',
        background:
          'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.7),rgba(255,255,255,0))',
      }}
    />
  )
}

interface Props {
  profile: Pick<PlayerProfile, 'firstName' | 'lastName' | 'position' | 'shirtNumber' | 'currentClub' | 'strongFoot' | 'avatarUrl'>
  card: PlayerCardModel | null
}

/** Version compacte affichée à la dernière étape de l'onboarding. */
export function PlayerCardMini({ profile, card }: Props) {
  return (
    <div
      className="flex animate-rise flex-col justify-between overflow-hidden"
      style={{
        width: 176,
        height: 240,
        borderRadius: 16,
        background: GOLD,
        boxShadow: '0 18px 44px rgba(0,0,0,.45)',
        padding: 14,
        boxSizing: 'border-box',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="text-left">
          <div className="t-num" style={{ fontSize: 40, lineHeight: 0.86, color: INK }}>
            {card?.overallRating ?? '—'}
          </div>
          <div
            className="t-num mt-1"
            style={{ fontSize: 13, lineHeight: 1, color: INK, letterSpacing: '.06em' }}
          >
            {positionShort(profile.position)}
          </div>
        </div>
        <Photo src={profile.avatarUrl} width={56} height={66} radius={7} />
      </div>

      <div className="text-left">
        <div className="t-num" style={{ fontSize: 18, lineHeight: 1, color: INK }}>
          {profile.lastName.toUpperCase()}
        </div>
      </div>
    </div>
  )
}

/** Carte pleine taille. Un tap l'incline, comme dans le prototype. */
export default function PlayerCard({ profile, card }: Props) {
  const [tilted, setTilted] = useState(false)

  return (
    <button
      type="button"
      onClick={() => setTilted((t) => !t)}
      aria-label="Incliner la carte"
      className="relative block overflow-hidden text-left"
      style={{
        width: 296,
        borderRadius: 22,
        padding: '22px 22px 24px',
        boxSizing: 'border-box',
        background: GOLD,
        boxShadow: '0 26px 60px rgba(0,0,0,.5)',
        transform: tilted
          ? 'perspective(900px) rotateY(-14deg) rotateX(6deg)'
          : 'perspective(900px)',
        transition: 'transform .5s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <Shine />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="t-num" style={{ fontSize: 58, lineHeight: 0.86, color: INK }}>
            {card?.overallRating ?? '—'}
          </div>
          <div
            className="t-num mt-[6px]"
            style={{ fontSize: 17, lineHeight: 1, color: INK, letterSpacing: '.06em' }}
          >
            {positionShort(profile.position)}
          </div>
          <div className="mt-3 h-[2px] w-[34px]" style={{ background: 'rgba(42,36,16,.35)' }} />
          <div
            className="mt-3 text-[11px] font-semibold leading-[1.5] tracking-[.02em]"
            style={{ color: 'rgba(42,36,16,.72)' }}
          >
            {profile.currentClub || 'Sans club'}
            <br />
            {profile.shirtNumber ? `N° ${profile.shirtNumber}` : 'Sans numéro'}
            {profile.strongFoot ? ` · ${footLabel(profile.strongFoot)}` : ''}
          </div>
        </div>
        <Photo src={profile.avatarUrl} width={118} height={142} radius={10} label="PHOTO JOUEUR" />
      </div>

      <div
        className="t-num relative mt-4"
        style={{ fontSize: 27, lineHeight: 1, color: INK, letterSpacing: '-.01em' }}
      >
        {profile.lastName.toUpperCase()}
      </div>
    </button>
  )
}

function footLabel(foot: string): string {
  const f = foot.toLowerCase()
  if (f.startsWith('gauche')) return 'Gaucher'
  if (f.startsWith('droit')) return 'Droitier'
  return 'Ambidextre'
}

function Photo({
  src,
  width,
  height,
  radius,
  label,
}: {
  src: string | null | undefined
  width: number
  height: number
  radius: number
  label?: string
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- photo servie par /uploads du backend
      <img
        src={src}
        alt=""
        className="flex-none object-cover"
        style={{ width, height, borderRadius: radius }}
      />
    )
  }
  return (
    <div
      className="flex flex-none items-end justify-center overflow-hidden"
      style={{
        width,
        height,
        borderRadius: radius,
        paddingBottom: 8,
        background:
          'repeating-linear-gradient(135deg,rgba(42,36,16,.14) 0 7px,rgba(42,36,16,.06) 7px 14px)',
      }}
    >
      {label && (
        <span className="t-mono" style={{ color: 'rgba(42,36,16,.6)', letterSpacing: '.06em' }}>
          {label}
        </span>
      )}
    </div>
  )
}
