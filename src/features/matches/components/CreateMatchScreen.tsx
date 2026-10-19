import React, { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { TextInput, Button, Text, Chip } from 'react-native-paper';
import { Screen } from '../../../ui';
import { useCreateMatch, useCreateMatchTeam, useAddMatchTeamPlayer } from '../hooks';
import { useLeagueMembers } from '../../members/hooks';
import { brand } from '../../../theme/brand';

interface CreateMatchScreenProps {
  leagueId: string;
  seasonId: string;
  onSuccess: (matchId: string) => void;
  onCancel: () => void;
}

export function CreateMatchScreen({
  leagueId,
  seasonId,
  onSuccess,
  onCancel,
}: CreateMatchScreenProps) {
  const defaultKickoff = (() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    // datetime-local: YYYY-MM-DDTHH:mm
    return d.toISOString().slice(0, 16);
  })();

  const [kickoffAt, setKickoffAt] = useState(defaultKickoff);
  const [location, setLocation] = useState('');
  const [homeSelected, setHomeSelected] = useState<string[]>([]);
  const [awaySelected, setAwaySelected] = useState<string[]>([]);
  const [step, setStep] = useState<'form' | 'teams'>('form');
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);
  const [homeTeamId, setHomeTeamId] = useState<string | null>(null);
  const [awayTeamId, setAwayTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMatch = useCreateMatch();
  const createMatchTeam = useCreateMatchTeam();
  const addMatchTeamPlayer = useAddMatchTeamPlayer();
  const { data: members = [] } = useLeagueMembers(leagueId);

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
      const homeTeam = await createMatchTeam.mutateAsync({
        matchId: match.id,
        side: 'home',
        name: 'Equipe A',
      });
      const awayTeam = await createMatchTeam.mutateAsync({
        matchId: match.id,
        side: 'away',
        name: 'Equipe B',
      });
      setCreatedMatchId(match.id);
      setHomeTeamId(homeTeam.id);
      setAwayTeamId(awayTeam.id);
      setStep('teams');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Création impossible');
    }
  };

  const handleAddPlayers = async () => {
    if (!createdMatchId || !homeTeamId || !awayTeamId) return;
    if (homeSelected.length === 0 || awaySelected.length === 0) {
      setError('Sélectionne au moins 1 joueur par équipe.');
      return;
    }
    setError(null);
    try {
      for (const playerId of homeSelected) {
        await addMatchTeamPlayer.mutateAsync({ matchTeamId: homeTeamId, playerId });
      }
      for (const playerId of awaySelected) {
        await addMatchTeamPlayer.mutateAsync({ matchTeamId: awayTeamId, playerId });
      }
      onSuccess(createdMatchId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Impossible d’ajouter les joueurs');
    }
  };

  const toggleHome = (playerId: string) => {
    setHomeSelected((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
    setAwaySelected((prev) => prev.filter((id) => id !== playerId));
  };
  const toggleAway = (playerId: string) => {
    setAwaySelected((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
    setHomeSelected((prev) => prev.filter((id) => id !== playerId));
  };

  if (step === 'form') {
    return (
      <Screen title="Nouveau match" subtitle="Étape 1/2 — Quand et où">
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
          Continuer · Composer les équipes
        </Button>
        <Button mode="outlined" onPress={onCancel} style={styles.button}>
          Annuler
        </Button>
      </Screen>
    );
  }

  return (
    <Screen title="Composer les équipes" subtitle="Étape 2/2 — Touche pour sélectionner">
      <ScrollView contentContainerStyle={styles.scroll}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text variant="labelLarge" style={styles.sectionLabel}>
          Equipe A · domicile ({homeSelected.length})
        </Text>
        <View style={styles.chipRow}>
          {members.map((m) => (
            <Chip
              key={`h-${m.player_id}`}
              selected={homeSelected.includes(m.player_id)}
              onPress={() => toggleHome(m.player_id)}
              style={styles.chip}
              showSelectedOverlay
            >
              {m.profile?.display_name ?? m.player_id.slice(0, 6)}
            </Chip>
          ))}
        </View>
        <Text variant="labelLarge" style={styles.sectionLabel}>
          Equipe B · extérieur ({awaySelected.length})
        </Text>
        <View style={styles.chipRow}>
          {members.map((m) => (
            <Chip
              key={`a-${m.player_id}`}
              selected={awaySelected.includes(m.player_id)}
              onPress={() => toggleAway(m.player_id)}
              style={styles.chip}
              showSelectedOverlay
            >
              {m.profile?.display_name ?? m.player_id.slice(0, 6)}
            </Chip>
          ))}
        </View>
        {members.length < 2 ? (
          <Text style={styles.hint}>
            Invite d’abord des joueurs (onglet Joueurs → code) avant de composer un match.
          </Text>
        ) : null}
        <Button
          mode="contained"
          onPress={handleAddPlayers}
          loading={addMatchTeamPlayer.isPending}
          style={styles.button}
        >
          Valider le match
        </Button>
        <Button
          mode="outlined"
          onPress={() => createdMatchId && onSuccess(createdMatchId)}
          style={styles.button}
        >
          Passer (équipes vides)
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { marginBottom: 12 },
  button: { marginTop: 8 },
  scroll: { paddingBottom: 32 },
  sectionLabel: { marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { marginRight: 4, marginBottom: 4 },
  hint: { opacity: 0.7, marginBottom: 12 },
  error: { color: brand.errorText, backgroundColor: brand.errorBg, padding: 12, borderRadius: 4, marginBottom: 12 },
});
