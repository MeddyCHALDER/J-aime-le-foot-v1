// L'inscription se fait dans l'onboarding : compte, fiche joueur et carte de
// départ y sont créés d'un seul geste.

import { redirect } from 'next/navigation'

export default function RegisterPage() {
  redirect('/onboarding')
}
