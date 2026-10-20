import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { Screen } from '../../../ui';
import { useJoinLeagueByCode } from '../hooks';
import { brand } from '../../../theme/brand';

interface JoinLeagueScreenProps {
  onSuccess: (leagueId: string) => void;
  onCancel: () => void;
}

export function JoinLeagueScreen({ onSuccess, onCancel }: JoinLeagueScreenProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const join = useJoinLeagueByCode();

  const handleSubmit = async () => {
    if (code.trim().length < 4) {
      setError('Entre le code à 6 caractères donné par l’admin.');
      return;
    }
    setError(null);
    try {
      const leagueId = await join.mutateAsync(code);
      // L'admin doit accepter : on confirme l'envoi avant de revenir
      setSentTo(leagueId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Impossible de rejoindre cette ligue');
    }
  };

  if (sentTo) {
    return (
      <Screen title="Demande envoyée" subtitle="L’admin de la ligue doit accepter ta demande.">
        <Text style={styles.sent}>
          Tu verras la ligue, ses matchs et ses votes dès que l’admin t’aura accepté.
        </Text>
        <Button mode="contained" onPress={() => onSuccess(sentTo)} style={styles.button}>
          OK
        </Button>
      </Screen>
    );
  }

  return (
    <Screen
      title="Rejoindre une ligue"
      subtitle="Demande le code d’invitation à l’organisateur"
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        label="Code d’invitation"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        mode="outlined"
        placeholder="Ex. K7M2QX"
        maxLength={8}
        style={styles.input}
      />
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={join.isPending}
        disabled={join.isPending}
        style={styles.button}
      >
        Rejoindre
      </Button>
      <Button mode="outlined" onPress={onCancel} style={styles.button}>
        Annuler
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sent: { marginBottom: 12, lineHeight: 20 },
  input: { marginBottom: 12 },
  button: { marginTop: 8 },
  error: { color: brand.errorText, backgroundColor: brand.errorBg, padding: 12, borderRadius: 4, marginBottom: 12 },
});
