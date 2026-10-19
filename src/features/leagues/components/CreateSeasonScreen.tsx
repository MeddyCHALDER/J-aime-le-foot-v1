import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { Screen } from '../../../ui';
import { useCreateSeason } from '../hooks';

interface CreateSeasonScreenProps {
  leagueId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateSeasonScreen({ leagueId, onSuccess, onCancel }: CreateSeasonScreenProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const createSeason = useCreateSeason();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      await createSeason.mutateAsync({
        leagueId,
        name: name.trim(),
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
      });
      onSuccess();
    } catch (_e) {
      // Error shown via mutation state
    }
  };

  return (
    <Screen title="Nouvelle saison" subtitle="Ajoutez une saison à la ligue">
      <TextInput
        label="Nom de la saison *"
        value={name}
        onChangeText={setName}
        mode="outlined"
        placeholder="ex. 2024-2025"
        style={styles.input}
      />
      <TextInput
        label="Date de début (optionnel)"
        value={startDate}
        onChangeText={setStartDate}
        mode="outlined"
        placeholder="YYYY-MM-DD"
        style={styles.input}
      />
      <TextInput
        label="Date de fin (optionnel)"
        value={endDate}
        onChangeText={setEndDate}
        mode="outlined"
        placeholder="YYYY-MM-DD"
        style={styles.input}
      />
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={createSeason.isPending}
        disabled={!name.trim() || createSeason.isPending}
        style={styles.button}
      >
        Créer la saison
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
