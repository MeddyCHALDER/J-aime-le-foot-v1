import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        // Sans cela, une nouvelle version du service worker peut mettre des
        // heures à être prise en compte : le navigateur sert l'ancienne.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
    ]
  },
}

export default nextConfig
