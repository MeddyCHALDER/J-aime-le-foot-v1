import type { Metadata, Viewport } from 'next'
import { Barlow, Chakra_Petch } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'
import PwaRegister from '@/components/PwaRegister'
import { ClubProvider } from '@/lib/club'
import { PrefsProvider } from '@/lib/prefs'
import { SessionProvider } from '@/lib/session'
import { ThemeProvider } from '@/lib/theme'

// Chakra Petch italique porte les chiffres et les titres, Barlow tout le reste.
const chakra = Chakra_Petch({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-chakra',
  display: 'swap',
})

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-barlow',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "J'aime le Foot",
  description: 'Le réseau social des footballeurs amateurs — ta carte, tes stats, ton club.',
  applicationName: "J'aime le Foot",
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: "J'aime le Foot",
    statusBarStyle: 'black-translucent',
  },
  // Sinon iOS transforme les numéros de maillot et les scores en liens d'appel.
  formatDetection: { telephone: false },
  other: {
    // Next n'émet plus que `mobile-web-app-capable` ; les iOS avant 15.4 ne
    // passent en plein écran qu'avec la balise préfixée Apple.
    'apple-mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#0E100D',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" data-theme="dark" className={`${chakra.variable} ${barlow.variable}`}>
      <body className="antialiased">
        <PwaRegister />
        <ThemeProvider>
          <PrefsProvider>
            <SessionProvider>
              <ClubProvider>
                <AppShell>{children}</AppShell>
              </ClubProvider>
            </SessionProvider>
          </PrefsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
