'use client'

import { useParams } from 'next/navigation'
import PublicProfile from '@/components/PublicProfile'
import { api } from '@/lib/api'

export default function PlayerByIdPage() {
  const { id } = useParams<{ id: string }>()
  return <PublicProfile load={() => api.players.byId(id)} />
}
