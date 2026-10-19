'use client'

// Onboarding en 3 étapes — « Ta fiche commence ici ».
// Étape 1 identité (et création du compte si personne n'est connecté),
// étape 2 poste et gabarit, étape 3 révélation de la carte.
// La validation finale crée compte + profil + carte de départ.

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { PlayerCardMini } from '@/components/PlayerCard'
import { api } from '@/lib/api'
import { startingCard } from '@/lib/card-rules'
import { useClub } from '@/lib/club'
import { clearInvite, readInvite } from '@/lib/invite'
import { FEET, POSITIONS } from '@/lib/format'
import { useSession } from '@/lib/session'

export default function OnboardingPage() {
  const router = useRouter()
  const { token, profile, register, refresh } = useSession()
  const { team } = useClub()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Un compte déjà connecté n'a plus qu'à compléter sa fiche.
  const needsAccount = !token

  const [form, setForm] = useState({
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    email: '',
    password: '',
    currentClub: profile?.currentClub ?? team?.name ?? '',
    shirtNumber: profile?.shirtNumber ? String(profile.shirtNumber) : '',
    position: profile?.position ?? 'MOC',
    strongFoot: profile?.strongFoot ?? 'Droit',
    heightCm: profile?.heightCm ? String(profile.heightCm) : '178',
    weightKg: profile?.weightKg ? String(profile.weightKg) : '71',
  })

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const previewCard = useMemo(() => {
    const base = startingCard(form.position)
    return {
      id: 'preview',
      playerProfileId: 'preview',
      imageUrl: null,
      createdAt: new Date().toISOString(),
      ...base,
    }
  }, [form.position])

  const step1Valid =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    (!needsAccount || (form.email.includes('@') && form.password.length >= 6))

  async function finish() {
    setSaving(true)
    setError(null)
    try {
      let activeToken = token

      if (needsAccount) {
        activeToken = await register(form.email.trim(), form.password)
      }
      if (!activeToken) throw new Error('Session introuvable')

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        position: form.position,
        strongFoot: form.strongFoot,
        currentClub: form.currentClub.trim() || null,
        shirtNumber: form.shirtNumber ? Number(form.shirtNumber) : null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
      }

      if (profile) {
        await api.players.update(payload, activeToken)
      } else {
        await api.players.create(payload, activeToken)
      }

      // La carte de départ, calculée sur le poste.
      const existing = await api.players.myCard(activeToken)
      const base = startingCard(form.position)
      if (existing) {
        await api.players.updateCard(base, activeToken)
      } else {
        await api.players.createCard({ ...base, imageUrl: null }, activeToken)
      }

      // Invitation ouverte avant l'inscription : c'est ici qu'elle rattache au
      // club, une fois la fiche joueur créée.
      const invite = readInvite()
      if (invite) {
        try {
          await api.teams.acceptInvite(invite, activeToken)
          clearInvite()
        } catch {
          // Lien expiré ou révoqué : le compte est créé malgré tout, l'écran
          // Matchs expliquera qu'il faut une invitation valable.
          clearInvite()
        }
      }

      await refresh()
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer ta fiche')
      setSaving(false)
    }
  }

  function next() {
    if (step < 2) {
      setStep(step + 1)
      return
    }
    void finish()
  }

  function back() {
    if (step === 0) router.push('/')
    else setStep(step - 1)
  }

  return (
    <div
      className="no-bar flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg px-[22px] pb-[26px]"
      style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}
    >
      {/* Jauge de progression */}
      <div className="my-[6px] mb-[26px] flex gap-[6px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-[2px] transition-colors duration-300"
            style={{ background: i <= step ? 'var(--lime)' : 'var(--line)' }}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="animate-rise">
          <StepLabel>Étape 1 / 3</StepLabel>
          <StepTitle>
            Ta fiche
            <br />
            commence ici
          </StepTitle>
          <StepIntro>
            Les pros ont une carte. Toi aussi, maintenant. Deux minutes, et
            {team?.name ? ` le ${team.name}` : ' ton club'} sait qui tu es.
          </StepIntro>

          <div className="flex flex-col gap-3">
            <Field label="Prénom & nom">
              <input
                className="field-box"
                value={`${form.firstName}${form.firstName && form.lastName ? ' ' : ''}${form.lastName}`}
                placeholder="Sofiane Bakkali"
                onChange={(e) => {
                  const [first, ...rest] = e.target.value.split(' ')
                  set('firstName', first ?? '')
                  set('lastName', rest.join(' '))
                }}
              />
            </Field>

            {needsAccount && (
              <>
                <Field label="Email">
                  <input
                    className="field-box"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.email}
                    placeholder="sofiane@exemple.fr"
                    onChange={(e) => set('email', e.target.value)}
                  />
                </Field>
                <Field label="Mot de passe">
                  <input
                    className="field-box"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    placeholder="6 caractères minimum"
                    onChange={(e) => set('password', e.target.value)}
                  />
                </Field>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Club">
                <input
                  className="field-box"
                  value={form.currentClub}
                  placeholder="FC MONDAY"
                  onChange={(e) => set('currentClub', e.target.value)}
                />
              </Field>
              <Field label="Numéro">
                <input
                  className="field-box t-num text-[20px] leading-none"
                  style={{ color: 'var(--lime)' }}
                  inputMode="numeric"
                  value={form.shirtNumber}
                  placeholder="10"
                  onChange={(e) => set('shirtNumber', e.target.value.replace(/\D/g, '').slice(0, 2))}
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="animate-rise">
          <StepLabel>Étape 2 / 3</StepLabel>
          <StepTitle>
            Où tu joues,
            <br />
            comment tu joues
          </StepTitle>
          <StepIntro>
            Ton poste fixe la base de tes six stats. Le terrain fera le reste.
          </StepIntro>

          <div className="t-field mb-[10px]">Poste</div>
          <div className="mb-6 flex flex-wrap gap-2">
            {POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                className="chip-pick"
                data-on={form.position === p}
                onClick={() => set('position', p)}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="t-field mb-[10px]">Pied fort</div>
          <div className="mb-6 flex gap-2">
            {FEET.map((f) => (
              <button
                key={f}
                type="button"
                className="chip-pick flex-1"
                style={{ height: 44, borderRadius: 11 }}
                data-on={form.strongFoot === f}
                onClick={() => set('strongFoot', f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MeasureField
              label="Taille"
              unit="cm"
              value={form.heightCm}
              onChange={(v) => set('heightCm', v)}
            />
            <MeasureField
              label="Poids"
              unit="kg"
              value={form.weightKg}
              onChange={(v) => set('weightKg', v)}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex animate-rise flex-col items-center text-center">
          <StepLabel>Étape 3 / 3</StepLabel>
          <h1 className="t-num mb-[18px] mt-3 text-[32px] leading-[1.02] text-txt">
            Voilà ta carte
          </h1>
          <PlayerCardMini
            profile={{
              firstName: form.firstName || 'Nouveau',
              lastName: form.lastName || 'Joueur',
              position: form.position,
              shirtNumber: form.shirtNumber ? Number(form.shirtNumber) : null,
              currentClub: form.currentClub || null,
              strongFoot: form.strongFoot,
              avatarUrl: null,
            }}
            card={previewCard}
          />
          <p className="mt-5 max-w-[30ch] text-[14px] leading-[1.5] text-txt2">
            Note de départ calculée sur ton poste. Chaque match saisi par l&apos;admin la fait
            bouger.
          </p>
        </div>
      )}

      <div className="min-h-[18px] flex-1" />

      {error && (
        <p className="pt-4 text-center text-[12.5px] leading-[1.4] text-[#FF6259]">{error}</p>
      )}

      {needsAccount && step === 0 && (
        <p className="pt-5 text-center text-[13px] text-txt2">
          Déjà un compte ?{' '}
          <button
            type="button"
            onClick={() => router.push('/auth/login')}
            className="font-semibold text-lime"
          >
            Se connecter
          </button>
        </p>
      )}

      <div className="flex items-center gap-[10px] pt-5">
        <button
          type="button"
          onClick={back}
          disabled={saving}
          className="btn-ghost rounded-[14px] px-5 text-[15px]"
          style={{ height: 54 }}
        >
          Retour
        </button>
        <button
          type="button"
          onClick={next}
          disabled={saving || (step === 0 && !step1Valid)}
          className="btn-lime flex-1 rounded-[14px] text-[17px]"
          style={{ height: 54 }}
        >
          {saving ? 'Création…' : step === 2 ? "Entrer dans l'app" : 'Continuer'}
        </button>
      </div>
    </div>
  )
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase leading-none tracking-[.18em] text-lime">
      {children}
    </div>
  )
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="t-num mb-2 mt-3 text-[34px] leading-[1.02] tracking-[-.01em] text-txt">
      {children}
    </h1>
  )
}

function StepIntro({ children }: { children: React.ReactNode }) {
  return <p className="mb-[26px] max-w-[30ch] text-[15px] leading-[1.5] text-txt2">{children}</p>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="t-field">{label}</span>
      {children}
    </label>
  )
}

function MeasureField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="rounded-xl border border-line bg-surface px-4 py-[14px]">
      <span className="t-field">{label}</span>
      <span className="mt-2 flex items-baseline gap-1">
        <input
          className="t-num w-full bg-transparent text-[22px] leading-none text-txt outline-none"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 3))}
        />
        <span className="text-[13px] opacity-50">{unit}</span>
      </span>
    </label>
  )
}
