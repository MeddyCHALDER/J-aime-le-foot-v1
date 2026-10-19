'use client'

// Le mode admin est réservé au rôle ADMIN. Les écrans joueur sont démontés
// pendant qu'on y est — la barre d'onglets bascule sur les quatre onglets admin.

import Link from 'next/link'
import { EmptyState, Screen, Skeleton } from '@/components/ui'
import { useSession } from '@/lib/session'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading, token, logout } = useSession()

  if (loading) {
    return (
      <Screen>
        <div className="px-4 pt-6">
          <Skeleton height={200} className="rounded-[16px]" />
        </div>
      </Screen>
    )
  }

  if (!token || !isAdmin) {
    return (
      <Screen>
        <EmptyState
          title={token ? 'Mode admin réservé' : "Connecte-toi pour l'admin"}
          hint={
            token
              ? "Ce compte n'a pas le rôle administrateur. Déconnecte-toi puis entre avec un compte admin."
              : "Seuls les administrateurs du club peuvent saisir les feuilles de match, gérer l'effectif et créer les compétitions."
          }
          action={
            <div className="flex flex-col items-center gap-3">
              <Link
                href={token ? '/profile' : '/auth/login'}
                className="btn-lime inline-flex items-center rounded-xl px-5 text-[14px]"
                style={{ height: 46 }}
              >
                {token ? 'Retour au profil' : 'Se connecter'}
              </Link>
              {token && (
                <Link
                  href="/auth/login"
                  onClick={logout}
                  className="text-[13px] font-semibold text-lime"
                >
                  Changer de compte
                </Link>
              )}
            </div>
          }
        />
      </Screen>
    )
  }

  return <>{children}</>
}
