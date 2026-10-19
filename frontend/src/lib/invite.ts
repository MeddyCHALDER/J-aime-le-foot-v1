// Le lien d'invitation est ouvert avant la création du compte : on garde le
// jeton de côté le temps de l'onboarding, puis on le consomme une fois la fiche
// joueur créée (l'API refuse de rattacher un compte sans profil).

const KEY = 'jlf-invite-token'

export function storeInvite(token: string) {
  try {
    sessionStorage.setItem(KEY, token)
  } catch {
    // Navigation privée : le rattachement se fera au prochain passage par le lien.
  }
}

export function readInvite(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function clearInvite() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Sans effet : la clé disparaîtra avec l'onglet.
  }
}
