'use client'

import { useParams } from 'next/navigation'
import PublicProfile from '@/components/PublicProfile'
import { api } from '@/lib/api'

export default function PlayerByUsernamePage() {
  const { username } = useParams<{ username: string }>()
  return <PublicProfile load={() => api.players.byUsername(username)} />
}
