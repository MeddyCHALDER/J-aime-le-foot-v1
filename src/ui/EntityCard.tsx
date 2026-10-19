import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

interface EntityCardProps {
  title: string;
  subtitle?: string;
  chips?: string[];
  onPress?: () => void;
  left?: React.ReactNode;
}

export function EntityCard({ title, subtitle, chips, onPress, left }: EntityCardProps) {
  const theme = useTheme();

  return (
    <Card
      mode="elevated"
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      contentStyle={styles.content}
    >
      <View style={styles.row}>
        {left ? <View style={styles.left}>{left}</View> : null}
        <View style={styles.body}>
          <Text variant="titleMedium" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          {chips && chips.length > 0 ? (
            <View style={styles.chipRow}>
              {chips.map((c) => (
                <Text key={c} variant="labelSmall" style={styles.chip}>
                  {c}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  chip: {
    opacity: 0.8,
  },
});
