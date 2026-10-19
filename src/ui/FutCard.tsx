import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { brand } from '../theme/brand';

interface FutCardProps {
  playerName: string;
  rating: number; // 1-99
  position?: string | null;
  avatarUrl?: string | null;
  stats?: { goals?: number; assists?: number; mvp?: number };
  onPress?: () => void;
}

export function FutCard({
  playerName,
  rating,
  position,
  avatarUrl,
  stats,
  onPress,
}: FutCardProps) {
  const theme = useTheme();
  const accent = brand.lime;

  return (
    <Card
      mode="elevated"
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: accent }]}
      contentStyle={styles.content}
    >
      <View style={[styles.ratingBadge, { backgroundColor: accent }]}>
        <Text variant="titleLarge" style={styles.ratingText}>
          {Math.min(99, Math.max(1, Math.round(rating)))}
        </Text>
      </View>
      <View style={styles.avatarPlaceholder}>
        {avatarUrl ? (
          <Card.Cover source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholderInner, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {playerName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text variant="titleMedium" numberOfLines={1} style={styles.name}>
        {playerName}
      </Text>
      {position ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {position}
        </Text>
      ) : null}
      {stats && (stats.goals !== undefined || stats.assists !== undefined || stats.mvp !== undefined) ? (
        <View style={styles.statsRow}>
          {stats.goals !== undefined ? (
            <Text variant="labelSmall" style={styles.stat}>⚽ {stats.goals}</Text>
          ) : null}
          {stats.assists !== undefined ? (
            <Text variant="labelSmall" style={styles.stat}>🎯 {stats.assists}</Text>
          ) : null}
          {stats.mvp !== undefined ? (
            <Text variant="labelSmall" style={styles.stat}>⭐ {stats.mvp}</Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 4,
    borderWidth: 2,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  ratingText: {
    color: brand.ink,
    fontWeight: '700',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8,
    overflow: 'hidden',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholderInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    textAlign: 'center',
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  stat: {
    opacity: 0.9,
  },
});
