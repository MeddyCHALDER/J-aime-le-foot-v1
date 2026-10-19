// V1 : le produit se limite à l'inscription et aux matchs du club.
// Le feed reste construit et consultable sur /feed, mais il ne figure pas
// dans la barre d'onglets — il reviendra en V2.
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/club-matches')
}
