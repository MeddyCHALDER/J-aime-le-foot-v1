'use client'

// Coquille de l'app. Le prototype est dessiné dans un téléphone de 414 px :
// sur mobile on prend tout l'écran, sur desktop on centre une colonne de la
// même largeur pour que les proportions du design restent justes.

import { usePathname } from 'next/navigation'
import InstallPrompt from './InstallPrompt'
import TabBar from './TabBar'

/** Écrans qui occupent tout l'espace, sans barre d'onglets. */
const FULLSCREEN = ['/onboarding', '/auth', '/invite']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const bare = FULLSCREEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0b09]">
      {/* La hauteur passe par les classes, pas par un style inline : un
          `minHeight` inline gagnerait sur `sm:h-[880px]` et le cadre desktop
          déborderait de l'écran, coin arrondi du bas coupé. */}
      <div
        className="relative flex max-h-[100dvh] min-h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden bg-bg text-txt sm:my-6 sm:h-[880px] sm:max-h-[calc(100dvh-48px)] sm:min-h-0 sm:rounded-[44px] sm:shadow-[0_40px_90px_rgba(0,0,0,.6),0_0_0_1px_rgba(198,255,0,.10)]"
      >
        <main className="no-bar relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
        {!bare && <InstallPrompt />}
        {!bare && <TabBar />}
      </div>
    </div>
  )
}
