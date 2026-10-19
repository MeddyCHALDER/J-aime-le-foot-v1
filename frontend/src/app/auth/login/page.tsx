'use client'

// Connexion. La création de compte passe par l'onboarding, qui enchaîne
// directement sur la fiche joueur et la carte.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSession } from '@/lib/session'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useSession()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { role } = await login(email.trim(), password)
      router.push(role === 'ADMIN' ? '/admin' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
      setBusy(false)
    }
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col justify-center bg-bg px-[22px] pb-[26px]"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="text-[11px] font-semibold uppercase leading-none tracking-[.18em] text-lime">
        J&apos;aime le foot
      </div>
      <h1 className="t-num mb-2 mt-3 text-[34px] leading-[1.02] tracking-[-.01em] text-txt">
        Content de
        <br />
        te revoir
      </h1>
      <p className="mb-[26px] max-w-[30ch] text-[15px] leading-[1.5] text-txt2">
        Ta carte, tes stats et le classement du club t&apos;attendent.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-[7px]">
          <span className="t-field">Email</span>
          <input
            className="field-box"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-[7px]">
          <span className="t-field">Mot de passe</span>
          <input
            className="field-box"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="text-[12.5px] leading-[1.4] text-[#FF6259]">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-lime mt-2 rounded-[14px] text-[17px]"
          style={{ height: 54 }}
        >
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-txt2">
        Pas encore de carte ?{' '}
        <Link href="/onboarding" className="font-semibold text-lime">
          Crée ta fiche
        </Link>
      </p>
      <p className="mt-4 text-center text-[12px] leading-[1.45] text-txt3">
        Compte admin de démo : sofianebakkali@fcmonday.fr
        <br />
        mot de passe password123
      </p>
    </div>
  )
}
