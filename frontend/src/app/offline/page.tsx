import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Hors ligne — J'aime le Foot",
}

// Servie par le service worker quand une navigation échoue faute de réseau.
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-[32rem] px-6 py-16 text-center">
      <h1 className="t-title">Tu es hors ligne</h1>
      <p className="t-body mt-3" style={{ color: 'var(--txt2)' }}>
        Impossible de joindre le serveur. Les pages déjà consultées restent accessibles&nbsp;; le
        reste reviendra dès que la connexion sera rétablie.
      </p>
    </div>
  )
}
