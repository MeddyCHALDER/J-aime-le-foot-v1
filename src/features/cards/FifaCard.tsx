import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import type { PlayerCardStats } from './card-rules';

const GOLD =
  'linear-gradient(150deg,#E8C46A 0%,#F6E7B6 30%,#D9B45A 52%,#C99B3B 78%,#F2DFA8 100%)';
const INK = '#2a2410';

export function positionShort(position?: string | null): string {
  if (!position) return '—';
  const p = position.toLowerCase();
  if (p.includes('gard')) return 'GK';
  if (p.includes('déf') || p.includes('def') || p === 'dc') return 'CB';
  if (p.includes('lat')) return 'FB';
  if (p.includes('moc') || p.includes('meneur')) return 'CAM';
  if (p.includes('ail')) return 'W';
  if (p.includes('att') || p.includes('bu')) return 'ST';
  if (p.includes('mil') || p.includes('mc')) return 'CM';
  return position.slice(0, 3).toUpperCase();
}

function footLabel(foot?: string | null): string {
  if (!foot) return '';
  if (foot === 'left') return 'Gaucher';
  if (foot === 'right') return 'Droitier';
  if (foot === 'both') return 'Ambidextre';
  return foot;
}

interface FifaCardProps {
  displayName: string;
  position?: string | null;
  avatarUrl?: string | null;
  clubLabel?: string | null;
  strongFoot?: string | null;
  card: PlayerCardStats | null;
  size?: 'mini' | 'big';
  style?: ViewStyle;
}

/** Carte collector or — note globale + photo (stats internes non affichées). */
export function FifaCard({
  displayName,
  position,
  avatarUrl,
  clubLabel,
  strongFoot,
  card,
  size = 'big',
  style,
}: FifaCardProps) {
  const [tilted, setTilted] = useState(false);
  const lastName = (displayName.split(' ').pop() ?? displayName).toUpperCase();
  const overall = card?.overallRating ?? '—';
  const isMini = size === 'mini';

  return (
    <Pressable
      onPress={() => setTilted((t) => !t)}
      accessibilityLabel="Carte joueur"
      style={[
        styles.card,
        isMini ? styles.mini : styles.big,
        {
          transform: tilted
            ? [{ perspective: 900 }, { rotateY: '-12deg' }, { rotateX: '5deg' }]
            : [{ perspective: 900 }],
        },
        style,
      ]}
    >
      {/* Fond or — web utilise le gradient CSS via backgroundImage */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.goldBg,
          // @ts-expect-error web-only
          { backgroundImage: GOLD },
        ]}
      />
      <View style={styles.shine} pointerEvents="none" />

      <View style={styles.topRow}>
        <View>
          <Text style={[styles.overall, isMini && styles.overallMini]}>{overall}</Text>
          <Text style={[styles.pos, isMini && styles.posMini]}>{positionShort(position)}</Text>
          {!isMini ? (
            <>
              <View style={styles.rule} />
              <Text style={styles.meta}>
                {clubLabel || 'Sans club'}
                {'\n'}
                {strongFoot ? footLabel(strongFoot) : '—'}
              </Text>
            </>
          ) : null}
        </View>
        <View
          style={[
            styles.photoWrap,
            isMini ? { width: 56, height: 66, borderRadius: 7 } : { width: 110, height: 132, borderRadius: 10 },
          ]}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoLabel}>{isMini ? '' : 'PHOTO'}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.name, isMini && styles.nameMini]} numberOfLines={1}>
        {lastName}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#D9B45A',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  mini: { width: 176, height: 240, padding: 14 },
  big: { width: 296, paddingTop: 22, paddingHorizontal: 22, paddingBottom: 24, alignSelf: 'center' },
  goldBg: { backgroundColor: '#E8C46A' },
  shine: {
    position: 'absolute',
    top: '-40%',
    left: 0,
    width: '42%',
    height: '190%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    opacity: 0.35,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  overall: {
    fontSize: 58,
    lineHeight: 52,
    fontWeight: '800',
    fontStyle: 'italic',
    color: INK,
  },
  overallMini: { fontSize: 40, lineHeight: 36 },
  pos: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
    color: INK,
  },
  posMini: { fontSize: 13 },
  rule: { marginTop: 12, width: 34, height: 2, backgroundColor: 'rgba(42,36,16,0.35)' },
  meta: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    color: 'rgba(42,36,16,0.72)',
  },
  photoWrap: { overflow: 'hidden', backgroundColor: 'rgba(42,36,16,0.1)' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  photoLabel: { fontSize: 10, letterSpacing: 1, color: 'rgba(42,36,16,0.55)', fontWeight: '600' },
  name: {
    marginTop: 16,
    fontSize: 26,
    fontWeight: '800',
    fontStyle: 'italic',
    color: INK,
    letterSpacing: -0.3,
  },
  nameMini: { marginTop: 10, fontSize: 18 },
});
