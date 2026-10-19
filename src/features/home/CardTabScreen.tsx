import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { useAuth } from '../auth/hooks';
import { useProfile } from '../profiles/hooks';
import { usePlayerCard } from '../cards/hooks';
import { FifaCard } from '../cards/FifaCard';
import { LoadingState, ErrorState } from '../../ui';
import { useHomeContext } from './useHomeContext';

export function CardTabScreen() {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  const { user } = useAuth();
  const { data: profile, isLoading, error, refetch } = useProfile(user?.id);
  const { data: card } = usePlayerCard(user?.id, profile?.preferred_position);
  const { league } = useHomeContext();

  if (isLoading) return <LoadingState message="Chargement de ta carte…" />;
  if (error) return <ErrorState message={String(error)} onRetry={() => refetch()} />;
  if (!profile) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.ink }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 22,
        paddingBottom: 32,
        alignItems: 'center',
      }}
    >
      <View style={{ alignSelf: 'stretch', marginBottom: 22 }}>
        <Text style={[styles.eyebrow, { color: tokens.lime, fontFamily: fonts.body }]}>
          Ta carte
        </Text>
        <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>
          FIFA
        </Text>
        <Text style={[styles.sub, { color: tokens.muted, fontFamily: fonts.body }]}>
          Chaque match fait bouger ta note. Touche la carte pour l’effet 3D.
        </Text>
      </View>

      <FifaCard
        displayName={profile.display_name}
        position={profile.preferred_position}
        avatarUrl={profile.avatar_url}
        clubLabel={league?.name}
        strongFoot={profile.strong_foot}
        card={card ?? null}
        size="big"
      />

      {card ? (
        <View style={[styles.stats, { borderColor: tokens.line }]}>
          {(
            [
              ['PAC', card.pace],
              ['SHO', card.shooting],
              ['PAS', card.passing],
              ['DRI', card.dribbling],
              ['DEF', card.defending],
              ['PHY', card.physical],
            ] as const
          ).map(([k, v]) => (
            <View key={k} style={styles.stat}>
              <Text style={[styles.statK, { color: tokens.muted2, fontFamily: fonts.body }]}>{k}</Text>
              <Text style={[styles.statV, { color: tokens.text, fontFamily: fonts.display }]}>{v}</Text>
            </View>
          ))}
        </View>
      ) : null}
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
    fontSize: 34,
    fontStyle: 'italic',
    fontWeight: '700',
    lineHeight: 36,
    marginTop: 8,
  },
  sub: { marginTop: 8, fontSize: 15, lineHeight: 22, maxWidth: 300 },
  stats: {
    marginTop: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 18,
    width: '100%',
    justifyContent: 'space-between',
  },
  stat: { width: '30%', alignItems: 'center', marginBottom: 14 },
  statK: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  statV: { fontSize: 22, fontStyle: 'italic', fontWeight: '700', marginTop: 4 },
});
