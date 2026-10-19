import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { FAB, Portal, Dialog, Button, Text, SegmentedButtons } from 'react-native-paper';
import type { Match, Team, Player } from '../types/database';
import type { MatchEventType } from '../types/database';

type Step = 'match' | 'event' | 'type';

type Props = {
  seasonId: string;
  matches: Match[];
  teams: Team[];
  players: Player[];
  onAddMatch: (homeTeamId: string, awayTeamId: string, date: string) => Promise<void>;
  onAddEvent: (matchId: string, playerId: string, teamId: string, type: MatchEventType, minute?: number) => Promise<void>;
  onSuccess: () => void;
};

export function QuickAddMatch({
  seasonId,
  matches,
  teams,
  players,
  onAddMatch,
  onAddEvent,
  onSuccess,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>('match');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<MatchEventType>('goal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setStep('match');
    setSelectedMatchId(null);
    setSelectedPlayerId(null);
    setSelectedTeamId(null);
    setError(null);
    setVisible(true);
  };

  const close = () => setVisible(false);

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    setStep('event');
  };

  const handleSelectPlayer = (playerId: string, teamId: string) => {
    setSelectedPlayerId(playerId);
    setSelectedTeamId(teamId);
    setStep('type');
  };

  const handleSubmitEvent = async () => {
    if (!selectedMatchId || !selectedPlayerId || !selectedTeamId) return;
    setLoading(true);
    setError(null);
    try {
      await onAddEvent(selectedMatchId, selectedPlayerId, selectedTeamId, eventType);
      onSuccess();
      close();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewMatch = async () => {
    if (teams.length < 2) {
      setError('Il faut au moins 2 équipes pour créer un match.');
      return;
    }
    setStep('match');
    setError(null);
    const homeId = teams[0].id;
    const awayId = teams[1].id;
    setLoading(true);
    try {
      await onAddMatch(homeId, awayId, new Date().toISOString());
      onSuccess();
      close();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const match = selectedMatchId ? matches.find((m) => m.id === selectedMatchId) : null;
  const playersByTeam = selectedTeamId
    ? players.filter((p) => p.team_id === selectedTeamId)
    : [];
  const seasonMatches = matches.filter((m) => m.season_id === seasonId);

  return (
    <>
      <FAB icon="plus" style={styles.fab} onPress={open} label="Ajout rapide" />
      <Portal>
        <Dialog visible={visible} onDismiss={close}>
          <Dialog.Title>
            {step === 'match' && 'Choisir un match'}
            {step === 'event' && 'Choisir un joueur'}
            {step === 'type' && "Type d'événement"}
          </Dialog.Title>
          <Dialog.Content>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {step === 'match' && (
              <>
                {seasonMatches.length === 0 ? (
                  <Text>Aucun match. Créez-en un en 1 tap.</Text>
                ) : (
                  seasonMatches.slice(0, 5).map((m) => {
                    const home = teams.find((t) => t.id === m.home_team_id);
                    const away = teams.find((t) => t.id === m.away_team_id);
                    return (
                      <Button
                        key={m.id}
                        mode="outlined"
                        onPress={() => handleSelectMatch(m.id)}
                        style={styles.option}
                      >
                        {home?.name ?? '?'} - {away?.name ?? '?'}
                      </Button>
                    );
                  })
                )}
                <Button mode="contained-tonal" onPress={handleAddNewMatch} loading={loading} style={styles.option}>
                  Nouveau match
                </Button>
              </>
            )}
            {step === 'event' && match && (
              <>
                {[match.home_team_id, match.away_team_id].map((tid) => {
                  const t = teams.find((x) => x.id === tid);
                  const list = players.filter((p) => p.team_id === tid);
                  return (
                    <React.Fragment key={tid}>
                      <Text variant="labelLarge">{t?.name}</Text>
                      {list.map((p) => (
                        <Button
                          key={p.id}
                          mode="outlined"
                          onPress={() => handleSelectPlayer(p.id, tid)}
                          style={styles.option}
                        >
                          {p.number ? `${p.number}. ` : ''}{p.name}
                        </Button>
                      ))}
                    </React.Fragment>
                  );
                })}
              </>
            )}
            {step === 'type' && (
              <>
                <SegmentedButtons
                  value={eventType}
                  onValueChange={(v) => setEventType(v as MatchEventType)}
                  buttons={[
                    { value: 'goal', label: 'But' },
                    { value: 'assist', label: 'Passe' },
                    { value: 'yellow_card', label: 'Jaune' },
                    { value: 'red_card', label: 'Rouge' },
                    { value: 'motm', label: 'MOTM' },
                  ]}
                />
                <Button
                  mode="contained"
                  onPress={handleSubmitEvent}
                  loading={loading}
                  disabled={loading}
                  style={styles.submit}
                >
                  Enregistrer
                </Button>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={close}>Fermer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  option: {
    marginVertical: 4,
  },
  submit: {
    marginTop: 16,
  },
  error: {
    color: '#b00020',
    marginBottom: 8,
  },
});
