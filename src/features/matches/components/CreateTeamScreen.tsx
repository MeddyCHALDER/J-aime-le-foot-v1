import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { Screen } from '../../../ui';
import { useCreateTeam } from '../hooks';

interface CreateTeamScreenProps {
  seasonId: string;
  seasonName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateTeamScreen({ seasonId, seasonName, onSuccess, onCancel }: CreateTeamScreenProps) {
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const createTeam = useCreateTeam();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      await createTeam.mutateAsync({
        seasonId,
        name: name.trim(),
        logoUrl: logoUrl.trim() || undefined,
      });
      onSuccess();
    } catch (_e) {
      // Error shown via mutation state
    }
  };

  return (
    <Screen
      title="Nouvelle équipe"
      subtitle={seasonName ? `Saison ${seasonName}` : 'Ajoutez une équipe à la saison'}
    >
      <TextInput
        label="Nom de l'équipe *"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="URL du logo (optionnel)"
        value={logoUrl}
        onChangeText={setLogoUrl}
        mode="outlined"
        style={styles.input}
      />
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={createTeam.isPending}
        disabled={!name.trim() || createTeam.isPending}
        style={styles.button}
      >
        Créer l'équipe
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
});
