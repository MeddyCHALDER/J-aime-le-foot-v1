import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  noScroll?: boolean;
  /** Contenu à droite du title (ex: bouton) */
  headerRight?: React.ReactNode;
}

export function Screen({ title, subtitle, children, noScroll, headerRight }: ScreenProps) {
  const theme = useTheme();

  const header = (
    <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerTop}>
        <Text variant="headlineMedium" style={styles.title}>
          {title}
        </Text>
        {headerRight}
      </View>
      {subtitle ? (
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  const content = (
    <View style={[styles.content, { backgroundColor: theme.colors.background }]}>{children}</View>
  );

  if (noScroll) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {header}
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {header}
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.85,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
