import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { useAuth } from '../auth/hooks';
import { signOut } from '../auth/api';
import { useProfile } from '../profiles/hooks';
import { usePlayerCard } from '../cards/hooks';
import { FifaCard } from '../cards/FifaCard';
import { LoadingState, ErrorState } from '../../ui';
import { toErrorMessage } from '../../lib/errors';
import { useHomeContext } from './useHomeContext';
import { useLeagueRoster, useLeaveLeague } from '../members/hooks';
import { confirmAction } from '../../lib/confirm';
import { isStandalone } from '../../lib/install';
import { PushToggle } from '../notifications/PushToggle';

interface ProfileTabScreenProps {
  onEditProfile: () => void;
  onJoinLeague: () => void;
  onCreateLeague: () => void;
  onOpenInstallGuide: () => void;
  onManagePlayers: (leagueId: string) => void;
}

export function ProfileTabScreen({
  onEditProfile,
  onJoinLeague,
  onCreateLeague,
  onOpenInstallGuide,
  onManagePlayers,
}: ProfileTabScreenProps) {
  const insets = useSafeAreaInsets();
  const { tokens, scheme, toggleScheme } = useAppTheme();
  const { user } = useAuth();
  const { data: profile, isLoading, error, refetch } = useProfile(user?.id);
  const { data: card } = usePlayerCard(user?.id, profile?.preferred_position);
  const { league } = useHomeContext();
  const leave = useLeaveLeague();
  const roster = useLeagueRoster(league?.id);
  const pendingCount = (roster.data ?? []).filter((p) => p.status === 'pending').length;
  // Le gérant ne peut pas quitter sa ligue : elle resterait sans admin.
  const isLeagueAdmin = !!league && !!user?.id && league.created_by === user.id;

  if (isLoading) return <LoadingState message="Chargement du profil…" />;
  if (error) return <ErrorState message={toErrorMessage(error)} onRetry={() => refetch()} />;
  if (!profile) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.ink }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 22,
        paddingBottom: 40,
      }}
    >
      <Text style={[styles.eyebrow, { color: tokens.lime, fontFamily: fonts.body }]}>Profil</Text>
      <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>
        {profile.display_name}
      </Text>

      <View style={styles.hero}>
        <FifaCard
          displayName={profile.display_name}
          position={profile.preferred_position}
          avatarUrl={profile.avatar_url}
          clubLabel={league?.name}
          strongFoot={profile.strong_foot}
          card={card ?? null}
          size="big"
        />
        <Text style={[styles.heroHint, { color: tokens.muted, fontFamily: fonts.body }]}>
          Chaque match fait bouger ta note. Touche la carte pour l’effet 3D.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.line }]}>
        <Text style={[styles.cardLabel, { color: tokens.muted2, fontFamily: fonts.body }]}>
          Réglages
        </Text>
        <Pressable accessibilityRole="button" onPress={toggleScheme} style={styles.rowBtn}>
          <Text style={[styles.rowText, { color: tokens.text, fontFamily: fonts.body }]}>
            Thème {scheme === 'dark' ? 'sombre' : 'clair'}
          </Text>
          <Text style={{ color: tokens.lime, fontFamily: fonts.body, fontWeight: '700' }}>
            Basculer
          </Text>
        </Pressable>
        <PushToggle />
        {!isStandalone() ? (
          <Pressable onPress={onOpenInstallGuide} style={styles.rowBtn} accessibilityRole="button">
            <Text style={[styles.rowText, { color: tokens.text, fontFamily: fonts.body }]}>
              Installer l’app sur ton téléphone
            </Text>
            <Text style={{ color: tokens.lime, fontFamily: fonts.body, fontWeight: '700' }}>Voir</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.line }]}>
        <Pressable accessibilityRole="button" onPress={onEditProfile} style={styles.rowBtn}>
          <Text style={[styles.rowText, { color: tokens.text, fontFamily: fonts.body }]}>
            Modifier mon profil
          </Text>
        </Pressable>
        {!league ? (
          <Pressable accessibilityRole="button" onPress={onJoinLeague} style={styles.rowBtn}>
            <Text style={[styles.rowText, { color: tokens.text, fontFamily: fonts.body }]}>
              Rejoindre une ligue
            </Text>
          </Pressable>
        ) : isLeagueAdmin ? (
          <View style={styles.rowBtn}>
            <Text style={[styles.rowNote, { color: tokens.muted, fontFamily: fonts.body }]}>
              Tu es l’admin de {league.name} : tu ne peux pas la quitter.
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() =>
              confirmAction(
                `Quitter ${league.name} ?`,
                'Tu ne verras plus ses matchs ni ses votes. Tu pourras revenir avec le code d’invitation.',
                () => leave.mutate({ leagueId: league.id, playerId: user!.id }),
                'Quitter'
              )
            }
            disabled={leave.isPending}
            style={styles.rowBtn}
            accessibilityRole="button"
          >
            <Text style={[styles.rowText, { color: tokens.errorText, fontFamily: fonts.body }]}>
              {leave.isPending ? 'Départ…' : `Quitter ${league.name}`}
            </Text>
          </Pressable>
        )}
        {leave.error ? (
          <Text style={[styles.rowNote, { color: tokens.errorText, fontFamily: fonts.body }]}>
            {toErrorMessage(leave.error)}
          </Text>
        ) : null}
        {/* Inviter, accepter, suspendre, retirer : réservé à l'admin de la ligue */}
        {league && isLeagueAdmin ? (
          <Pressable accessibilityRole="button" onPress={() => onManagePlayers(league.id)} style={styles.rowBtn}>
            <Text style={[styles.rowText, { color: tokens.text, fontFamily: fonts.body }]}>
              Gérer les joueurs et inviter
            </Text>
            <Text style={{ color: tokens.lime, fontFamily: fonts.body, fontWeight: '700' }}>
              {pendingCount ? `${pendingCount} demande${pendingCount > 1 ? 's' : ''}` : 'Ouvrir'}
            </Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onCreateLeague} style={styles.rowBtn}>
          <Text style={[styles.rowText, { color: tokens.text, fontFamily: fonts.body }]}>
            Créer une ligue
          </Text>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button"
        onPress={() => signOut()}
        style={[styles.logout, { borderColor: tokens.line }]}
      >
        <Text style={[styles.logoutText, { color: tokens.muted, fontFamily: fonts.body }]}>
          Déconnexion
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 20,
  },
  hero: { alignItems: 'center', marginBottom: 24 },
  heroHint: { marginTop: 14, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 280 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowText: { fontSize: 15, fontWeight: '500' },
  rowNote: { fontSize: 13, lineHeight: 18 },
  logout: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontSize: 14, fontWeight: '600' },
});
