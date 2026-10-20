import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { Screen } from '../../../ui';
import { useCreateMatch } from '../hooks';
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
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    // datetime-local en heure locale (toISOString serait en UTC, puis relu en local)
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  const [kickoffAt, setKickoffAt] = useState(defaultKickoff);
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
      setError('Date invalide. Format : 2026-10-20T18:00');
      return;
    }
    setError(null);
    try {
      const match = await createMatch.mutateAsync({
        seasonId,
        kickoffAt: date.toISOString(),
        location: location.trim() || undefined,
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
      <TextInput
        label="Date et heure *"
        value={kickoffAt}
        onChangeText={setKickoffAt}
        mode="outlined"
        placeholder="2026-10-20T18:00"
        style={styles.input}
      />
      <Text variant="bodySmall" style={styles.hint}>
        Format : AAAA-MM-JJTHH:mm (ex. 2026-10-20T18:00)
      </Text>
      <TextInput
        label="Lieu (optionnel)"
        value={location}
        onChangeText={setLocation}
        mode="outlined"
        placeholder="Terrain municipal…"
        style={styles.input}
      />
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

const styles = StyleSheet.create({
  input: { marginBottom: 12 },
  button: { marginTop: 8 },
  hint: { opacity: 0.7, marginBottom: 12 },
  error: { color: brand.errorText, backgroundColor: brand.errorBg, padding: 12, borderRadius: 4, marginBottom: 12 },
});
