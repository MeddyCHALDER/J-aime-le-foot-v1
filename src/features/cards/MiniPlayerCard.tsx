import React from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { fonts } from '../../theme/brand';
import { positionShort } from './FifaCard';

const GOLD =
  'linear-gradient(150deg,#E8C46A 0%,#F6E7B6 30%,#D9B45A 52%,#C99B3B 78%,#F2DFA8 100%)';
const INK = '#2a2410';

interface MiniPlayerCardProps {
  displayName: string;
  avatarUrl?: string | null;
  overall?: number | null;
  position?: string | null;
  /** xs : ligne de liste ; sm : grille de compo d'équipe */
  size?: 'xs' | 'sm';
  /** Contour lime (sélection, ton vote…) */
  highlighted?: boolean;
  style?: ViewStyle;
}

const SIZES = {
  xs: { w: 40, h: 54, radius: 7, rating: 13, pos: 7, name: 0 },
  sm: { w: 60, h: 82, radius: 9, rating: 16, pos: 8, name: 8 },
} as const;

/** Miniature de la carte or : note, poste, photo (ou initiale) et nom. */
export function MiniPlayerCard({
  displayName,
  avatarUrl,
  overall,
  position,
  size = 'xs',
  highlighted,
  style,
}: MiniPlayerCardProps) {
  const s = SIZES[size];
  const lastName = (displayName.split(' ').pop() ?? displayName).toUpperCase();
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <View
      accessibilityLabel={`Carte de ${displayName}${overall ? `, note ${overall}` : ''}`}
      style={[
        styles.card,
        { width: s.w, height: s.h, borderRadius: s.radius },
        highlighted && styles.highlighted,
        style,
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.gold,
          // @ts-expect-error web uniquement : dégradé CSS
          { backgroundImage: GOLD },
        ]}
      />
      <View style={styles.photoArea}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <Text style={[styles.initial, { fontSize: s.h * 0.34, fontFamily: fonts.display }]}>{initial}</Text>
        )}
      </View>
      <View style={styles.badge}>
        <Text style={[styles.rating, { fontSize: s.rating, fontFamily: fonts.display }]}>
          {overall ?? '—'}
        </Text>
        <Text style={[styles.pos, { fontSize: s.pos, fontFamily: fonts.body }]}>{positionShort(position)}</Text>
      </View>
      {s.name ? (
        <View style={styles.nameBar}>
          <Text style={[styles.name, { fontSize: s.name, fontFamily: fonts.display }]} numberOfLines={1}>
            {lastName}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: '#D9B45A' },
  gold: { backgroundColor: '#D9B45A' },
  highlighted: { borderWidth: 2, borderColor: '#C6FF00' },
  photoArea: {
    ...StyleSheet.absoluteFillObject,
    top: '18%',
    left: '22%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  initial: { color: 'rgba(42,36,16,0.55)', fontStyle: 'italic', fontWeight: '700' },
  // Fond doré translucide : la note reste lisible même par-dessus la photo
  badge: {
    position: 'absolute',
    top: 2,
    left: 2,
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingBottom: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(242,223,168,0.85)',
  },
  rating: { color: INK, fontStyle: 'italic', fontWeight: '700', lineHeight: undefined },
  pos: { color: INK, fontWeight: '700', marginTop: -2, letterSpacing: 0.3 },
  nameBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 2,
    paddingHorizontal: 3,
    backgroundColor: 'rgba(242,223,168,0.92)',
  },
  name: { color: INK, fontStyle: 'italic', fontWeight: '700', textAlign: 'center' },
});
