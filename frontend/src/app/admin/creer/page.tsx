'use client'

// Création d'un match intra-club, d'un championnat ou d'un tournoi.
//
// Les champs affichés sont ceux que le modèle sait retenir. Le prototype
// montrait aussi un intitulé libre, un lieu, un format et un barème : ces
// notions n'existent pas encore côté Prisma, elles sont listées en bas de
// l'écran plutôt que proposées puis perdues à l'enregistrement.

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EmptyState, ErrorNote, Screen, Segmented, Toggle } from '@/components/ui'
import { api } from '@/lib/api'
import { useClub } from '@/lib/club'
import { currentSeason } from '@/lib/format'
import { useSession } from '@/lib/session'

type CreateTab = 'equipe' | 'intra' | 'champ' | 'tournoi'

export default function CreatePage() {
  const router = useRouter()
  const { token, profile } = useSession()
  const { team, championship, reload } = useClub()

  const [tab, setTab] = useState<CreateTab>('equipe')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  // Match intra-club
  const [matchDate, setMatchDate] = useState(defaultDateTime())
  const [round, setRound] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('16')
  const [linkChampionship, setLinkChampionship] = useState(true)

  // Compétition
  const [name, setName] = useState('')
  const [season, setSeason] = useState(currentSeason())

  // Réglages d'inscription
  const [openRegistration, setOpenRegistration] = useState(true)
  const [waitlist, setWaitlist] = useState(true)
  const [notify, setNotify] = useState(false)

  async function submit() {
    if (!token) return
    setSaving(true)
    setError(null)
    setDone(null)

    try {
      if (tab === 'equipe') {
        if (!name.trim()) throw new Error("Le nom de l'équipe est requis")
        const created = await api.teams.create({ name: name.trim() }, token)
        if (profile && !created.members?.some((m) => m.playerProfileId === profile.id)) {
          await api.teams.addMember(created.id, profile.id, token).catch(() => null)
        }
        setDone(`Équipe « ${created.name} » créée.`)
        setName('')
        reload()
        router.push('/admin/effectif')
        return
      }

      if (tab === 'intra') {
        if (!team) throw new Error("Crée d'abord une équipe pour y rattacher un match")
        const created = await api.clubMatches.create(
          {
            teamId: team.id,
            matchDate: new Date(matchDate).toISOString(),
            round: round ? Number(round) : undefined,
            tournamentId: linkChampionship && championship ? championship.id : undefined,
            maxPlayers: maxPlayers ? Number(maxPlayers) : undefined,
          },
          token
        )
        // Le backend ouvre toujours les inscriptions ; on ferme si l'admin
        // préfère convoquer à la main.
        if (!openRegistration) {
          await api.clubMatches.update(created.id, { status: 'CLOSED' }, token)
        }
        setDone('Match créé et publié au club.')
        reload()
        router.push(`/club-matches/${created.id}`)
        return
      }

      if (!name.trim()) throw new Error('Le nom est requis')

      if (tab === 'champ') {
        const created = await api.championships.create({ name: name.trim(), season }, token)
        if (team) {
          await api.championships.addTeam(created.id, team.id, token).catch(() => null)
        }
        setDone('Championnat créé.')
      } else {
        const created = await api.tournaments.create({ name: name.trim(), type: 'CUP', season }, token)
        if (team) {
          await api.tournaments.addTeam(created.id, team.id, token).catch(() => null)
        }
        setDone('Tournoi créé.')
      }
      setName('')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <div className="px-5 pt-[18px]">
        <h1 className="t-title">Créer</h1>
      </div>

      <Segmented
        className="mx-4 mt-[14px]"
        value={tab}
        onChange={(t) => {
          setTab(t)
          setError(null)
          setDone(null)
        }}
        options={[
          { id: 'equipe', label: 'Équipe' },
          { id: 'intra', label: 'Match' },
          { id: 'champ', label: 'Champ.' },
          { id: 'tournoi', label: 'Tournoi' },
        ]}
      />

      {tab === 'intra' && !team ? (
        <EmptyState
          title="Aucune équipe"
          hint="Crée d'abord le club — ensuite tu pourras ouvrir un match et lancer les inscriptions."
          action={
            <button
              type="button"
              onClick={() => setTab('equipe')}
              className="btn-lime inline-flex items-center rounded-xl px-5 text-[15px]"
              style={{ height: 46 }}
            >
              Créer une équipe
            </button>
          }
        />
      ) : null}

      <div className="mx-4 mt-[18px] flex flex-col gap-[14px]">
        {tab === 'equipe' ? (
          <>
            <Field label="Nom de l'équipe">
              <input
                className="field-box"
                value={name}
                placeholder="FC MONDAY"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <p className="text-[12.5px] leading-[1.45] text-txt2">
              C&apos;est le club que les joueurs rejoignent. Matchs, effectif et classement
              s&apos;y rattachent.
            </p>
          </>
        ) : tab === 'intra' ? (
          team ? (
          <>
            <Field label="Date et heure">
              <input
                className="field-box"
                type="datetime-local"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
              />
            </Field>
            <Field label="Journée">
              <input
                className="field-box"
                inputMode="numeric"
                placeholder="7"
                value={round}
                onChange={(e) => setRound(e.target.value.replace(/\D/g, '').slice(0, 2))}
              />
            </Field>
            <Field label="Places">
              <input
                className="field-box"
                inputMode="numeric"
                placeholder="16"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            </Field>
            <Field label="Club">
              <div className="field-box">{team?.name}</div>
            </Field>
            <Field label="Championnat rattaché">
              {championship ? (
                <button
                  type="button"
                  onClick={() => setLinkChampionship((v) => !v)}
                  className="field-box justify-between"
                >
                  <span>{linkChampionship ? championship.name : 'Match amical'}</span>
                  <span className="text-[12px] font-semibold text-lime">changer</span>
                </button>
              ) : (
                <div className="field-box text-txt2">Aucun championnat en cours</div>
              )}
            </Field>
          </>
          ) : null
        ) : (
          <>
            <Field label={tab === 'champ' ? 'Nom du championnat' : 'Nom du tournoi'}>
              <input
                className="field-box"
                value={name}
                placeholder={
                  tab === 'champ' ? `Championnat interne ${currentSeason()}` : "Tournoi d'automne"
                }
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Saison">
              <input
                className="field-box"
                value={season}
                placeholder={currentSeason()}
                onChange={(e) => setSeason(e.target.value)}
              />
            </Field>
            <Field label="Type">
              <div className="field-box">
                {tab === 'champ' ? 'Championnat · matchs aller-retour' : 'Coupe · phase finale'}
              </div>
            </Field>
          </>
        )}
      </div>

      {tab === 'intra' && team && (
        <div className="card-lg mx-4 mt-[18px] p-4">
          <div className="t-section">Inscriptions</div>
          <div className="mt-[14px] flex flex-col gap-[13px]">
            <ToggleRow
              on={openRegistration}
              onChange={setOpenRegistration}
              label="Inscriptions ouvertes à tout le club"
              sub="Sinon, l'admin convoque manuellement"
            />
            <ToggleRow
              on={waitlist}
              onChange={setWaitlist}
              label="Liste d'attente"
              sub="Réglage local — le backend ne gère pas encore la file d'attente"
            />
            <ToggleRow
              on={notify}
              onChange={setNotify}
              label="Notification push immédiate"
              sub="Réglage local — l'envoi push n'est pas encore branché"
            />
          </div>
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}
      {done && (
        <p className="mx-4 mt-3 rounded-[12px] border border-[rgba(198,255,0,.3)] bg-[rgba(198,255,0,.08)] px-4 py-3 text-[12.5px] text-lime">
          {done}
        </p>
      )}

      <div className="mx-4 mb-6 mt-4 flex gap-[9px]">
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="btn-ghost rounded-[13px] px-5 text-[14px]"
          style={{ height: 52 }}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || (tab === 'intra' && !team)}
          className="btn-lime flex-1 rounded-[13px] text-[16px]"
          style={{ height: 52 }}
        >
          {saving ? 'Création…' : tab === 'equipe' ? "Créer l'équipe" : 'Publier au club'}
        </button>
      </div>

      <p className="mx-4 mb-6 text-[11.5px] leading-[1.4] text-txt3">
        Pas encore modélisés côté serveur : intitulé libre, lieu, format de jeu et barème de
        points. Ils demandent une migration Prisma avant d&apos;apparaître ici.
      </p>
    </Screen>
  )
}

/** Prochain créneau plausible : demain 20:30, au format attendu par datetime-local. */
function defaultDateTime(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(20, 30, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="t-field">{label}</span>
      {children}
    </label>
  )
}

function ToggleRow({
  on,
  onChange,
  label,
  sub,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
  sub: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold leading-[1.2] text-txt">{label}</div>
        <div className="mt-1 text-[11.5px] font-medium leading-[1.3] text-txt3">{sub}</div>
      </div>
      <Toggle on={on} onChange={onChange} label={label} />
    </div>
  )
}
