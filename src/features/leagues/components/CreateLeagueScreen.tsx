import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { Screen } from '../../../ui';
import { useCreateLeague } from '../hooks';
import { useAuth } from '../../auth/hooks';
import { brand } from '../../../theme/brand';
import { InviteCard } from './InviteCard';
import type { League } from '../../../types/entities';

interface CreateLeagueScreenProps {
  onSuccess: (leagueId: string) => void;
  onCancel: () => void;
}

export function CreateLeagueScreen({ onSuccess, onCancel }: CreateLeagueScreenProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<League | null>(null);
  const createLeague = useCreateLeague();

  const handleSubmit = async () => {
    if (!name.trim() || !user?.id) return;
    setError(null);
    try {
      const league = await createLeague.mutateAsync({
        name: name.trim(),
        createdBy: user.id,
        city: city.trim() || undefined,
      });
      // Étape suivante : inviter les potes, avant de revenir à l'accueil
      setCreated(league);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Création impossible');
    }
  };

  if (created) {
    return (
      <Screen title="Ligue créée !" subtitle={`${created.name} est prête. Invite tes potes pour remplir les matchs.`}>
        {created.invite_code ? (
          <InviteCard leagueName={created.name} code={created.invite_code} />
        ) : null}
        <Button mode="contained" onPress={() => onSuccess(created.id)} style={styles.button}>
          Terminer
        </Button>
      </Screen>
    );
  }

  return (
    <Screen
      title="Créer ma ligue"
      subtitle="Tu deviens admin : invite, compose les matchs, saisis les scores"
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        label="Nom de la ligue *"
        value={name}
        onChangeText={setName}
        mode="outlined"
        placeholder="Ex. Foot du dimanche"
        style={styles.input}
      />
      <TextInput
        label="Ville (optionnel)"
        value={city}
        onChangeText={setCity}
        mode="outlined"
        style={styles.input}
      />
      <Text variant="bodySmall" style={styles.hint}>
        Une saison et un code d’invitation sont créés automatiquement.
      </Text>
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={createLeague.isPending}
        disabled={!name.trim() || createLeague.isPending}
        style={styles.button}
      >
        Créer et ouvrir la ligue
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
  hint: { opacity: 0.7, marginBottom: 8 },
  error: { color: brand.errorText, backgroundColor: brand.errorBg, padding: 12, borderRadius: 4, marginBottom: 12 },
});
