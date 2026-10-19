import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button, TextInput, SegmentedButtons } from 'react-native-paper';
import { Screen, LoadingState, ErrorState, FutCard } from '../../../ui';
import { useProfile, useUpdateProfile } from '../hooks';
import { useAuth } from '../../auth/hooks';

interface PlayerProfileScreenProps {
  playerId: string;
  onBack: () => void;
}

export function PlayerProfileScreen({ playerId, onBack }: PlayerProfileScreenProps) {
  const { user } = useAuth();
  const isOwn = user?.id === playerId;
  const { data: profile, isLoading, error, refetch } = useProfile(playerId);
  const updateProfile = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [position, setPosition] = useState('');
  const [foot, setFoot] = useState<'left' | 'right' | 'both'>('right');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setPosition(profile.preferred_position ?? '');
      setFoot((profile.strong_foot as 'left' | 'right' | 'both') || 'right');
      setBio(profile.bio ?? '');
    }
  }, [profile]);

  if (isLoading) return <LoadingState message="Chargement du profil…" />;
  if (error) return <ErrorState message={String(error)} onRetry={() => refetch()} />;
  if (!profile) return null;

  const save = async () => {
    await updateProfile.mutateAsync({
      id: playerId,
      updates: {
        display_name: displayName.trim() || profile.display_name,
        preferred_position: position.trim() || null,
        strong_foot: foot,
        bio: bio.trim() || null,
      },
    });
    setEditing(false);
    refetch();
  };

  return (
    <Screen
      title={isOwn ? 'Mon profil' : profile.display_name}
      subtitle={isOwn ? 'Visible par les potes de tes ligues' : profile.preferred_position ?? undefined}
    >
      <View style={styles.content}>
        <FutCard
          playerName={editing ? displayName || profile.display_name : profile.display_name}
          rating={50}
          position={editing ? position || profile.preferred_position : profile.preferred_position}
          avatarUrl={profile.avatar_url}
        />

        {editing ? (
          <>
            <TextInput
              label="Pseudo"
              value={displayName}
              onChangeText={setDisplayName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Poste (ex. BU, MC, DC)"
              value={position}
              onChangeText={setPosition}
              mode="outlined"
              style={styles.input}
            />
            <Text variant="labelLarge" style={styles.label}>
              Pied fort
            </Text>
            <SegmentedButtons
              value={foot}
              onValueChange={(v) => setFoot(v as 'left' | 'right' | 'both')}
              buttons={[
                { value: 'left', label: 'Gauche' },
                { value: 'right', label: 'Droit' },
                { value: 'both', label: 'Les 2' },
              ]}
              style={styles.input}
            />
            <TextInput
              label="Bio"
              value={bio}
              onChangeText={setBio}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={save}
              loading={updateProfile.isPending}
              style={styles.button}
            >
              Enregistrer
            </Button>
            <Button mode="outlined" onPress={() => setEditing(false)} style={styles.button}>
              Annuler
            </Button>
          </>
        ) : (
          <>
            {profile.bio ? (
              <Text variant="bodyMedium" style={styles.bio}>
                {profile.bio}
              </Text>
            ) : isOwn ? (
              <Text variant="bodySmall" style={styles.meta}>
                Ajoute une bio pour te présenter aux potes.
              </Text>
            ) : null}
            <Text variant="labelMedium" style={styles.meta}>
              Pied fort :{' '}
              {profile.strong_foot === 'left'
                ? 'Gauche'
                : profile.strong_foot === 'right'
                  ? 'Droit'
                  : profile.strong_foot === 'both'
                    ? 'Les deux'
                    : '–'}
            </Text>
            {isOwn ? (
              <Button mode="contained" onPress={() => setEditing(true)} style={styles.button}>
                Modifier mon profil
              </Button>
            ) : null}
            <Button mode="outlined" onPress={onBack} style={styles.button}>
              Retour
            </Button>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8 },
  bio: { marginTop: 12, marginBottom: 8 },
  meta: { opacity: 0.8, marginBottom: 16 },
  button: { marginTop: 8 },
  input: { marginBottom: 12 },
  label: { marginBottom: 8 },
});
