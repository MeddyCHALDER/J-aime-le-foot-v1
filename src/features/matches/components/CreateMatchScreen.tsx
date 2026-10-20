import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons } from 'react-native-paper';
import { Screen } from '../../../ui';
import { useCreateMatch } from '../hooks';
import { KickoffPicker } from './KickoffPicker';
import { brand } from '../../../theme/brand';

interface CreateMatchScreenProps {
  leagueId: string;
  seasonId: string;
  onSuccess: (matchId: string) => void;
  onCancel: () => void;
}

export function CreateMatchScreen({
  // Gardé dans l'API de navigation ; la création n'a besoin que de la saison.
  leagueId: _leagueId,
  seasonId,
  onSuccess,
  onCancel,
}: CreateMatchScreenProps) {
  const defaultKickoff = (() => {
    // Ce soir 20:00, ou demain 20:00 s'il est déjà tard
    const d = new Date();
    if (d.getHours() >= 19) d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    return toLocalInput(d);
  })();

  const [kickoffAt, setKickoffAt] = useState(defaultKickoff);
  const [opening, setOpening] = useState<OpeningMode>('now');
  // « Autre » part de la veille à midi (ou de la prochaine heure pile si c'est passé)
  const [customOpening, setCustomOpening] = useState(() => {
    const eve = openingDate('eve', defaultKickoff, '');
    if (eve && eve > new Date()) return toLocalInput(eve);
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return toLocalInput(next);
  });
  const opensAt = openingDate(opening, kickoffAt, customOpening);
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMatch = useCreateMatch();

  const handleCreateMatch = async () => {
    if (!kickoffAt.trim()) {
      setError('Indique la date et l’heure.');
      return;
    }
    const date = new Date(kickoffAt);
    if (isNaN(date.getTime())) {
      setError('Choisis une date et une heure.');
      return;
    }
    if (opensAt && opensAt >= date) {
      setError('L’ouverture des inscriptions doit être avant le coup d’envoi.');
      return;
    }
    setError(null);
    try {
      const match = await createMatch.mutateAsync({
        seasonId,
        kickoffAt: date.toISOString(),
        location: location.trim() || undefined,
        // Une heure déjà passée revient à ouvrir tout de suite
        registrationOpensAt: opensAt && opensAt > new Date() ? opensAt.toISOString() : null,
      });
      // Les équipes se composent ensuite parmi les inscrits, depuis la fiche du match.
      onSuccess(match.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Création impossible');
    }
  };

  return (
    <Screen title="Nouveau match" subtitle="Quand et où. Les joueurs s’inscrivent ensuite depuis la fiche du match.">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <KickoffPicker value={kickoffAt} onChange={setKickoffAt} />
      <TextInput
        label="Lieu (optionnel)"
        value={location}
        onChangeText={setLocation}
        mode="outlined"
        placeholder="Terrain municipal…"
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.sectionLabel}>
        Ouverture des inscriptions
      </Text>
      <SegmentedButtons
        value={opening}
        onValueChange={(v) => setOpening(v as OpeningMode)}
        buttons={[
          { value: 'now', label: 'Direct' },
          { value: 'eve', label: 'Veille midi' },
          { value: 'custom', label: 'Autre' },
        ]}
        style={styles.segments}
      />
      {opening === 'custom' ? (
        <KickoffPicker
          value={customOpening}
          onChange={setCustomOpening}
          labels={['Ouverture le', 'À']}
        />
      ) : null}
      <Text variant="bodySmall" style={styles.hint}>
        {opensAt && opensAt > new Date()
          ? `Les joueurs pourront s’inscrire à partir du ${formatOpening(opensAt)}. Ils seront prévenus par notification à ce moment-là.`
          : 'Les joueurs peuvent s’inscrire dès la création du match, et sont prévenus tout de suite.'}
      </Text>

      <Button
        mode="contained"
        onPress={handleCreateMatch}
        loading={createMatch.isPending}
        disabled={createMatch.isPending}
        style={styles.button}
      >
        Créer le match
      </Button>
      <Button mode="outlined" onPress={onCancel} style={styles.button}>
        Annuler
      </Button>
    </Screen>
  );
}

type OpeningMode = 'now' | 'eve' | 'custom';

/** datetime-local en heure locale (toISOString serait en UTC, puis relu en local) */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Heure d'ouverture choisie, ou null pour « tout de suite ». */
function openingDate(mode: OpeningMode, kickoffInput: string, customInput: string): Date | null {
  if (mode === 'now') return null;
  if (mode === 'custom') {
    const d = new Date(customInput);
    return isNaN(d.getTime()) ? null : d;
  }
  // La veille du match à 12:00 (ex. match lundi 20h → dimanche midi)
  const k = new Date(kickoffInput);
  if (isNaN(k.getTime())) return null;
  const d = new Date(k);
  d.setDate(d.getDate() - 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

function formatOpening(d: Date) {
  const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} à ${time}`;
}

const styles = StyleSheet.create({
  input: { marginBottom: 12 },
  sectionLabel: { marginTop: 4, marginBottom: 8 },
  segments: { marginBottom: 12 },
  hint: { opacity: 0.75, marginBottom: 12, lineHeight: 18 },
  button: { marginTop: 8 },
  error: { color: brand.errorText, backgroundColor: brand.errorBg, padding: 12, borderRadius: 4, marginBottom: 12 },
});
