import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="bodyLarge" style={styles.message}>
        {message}
      </Text>
      {onRetry ? (
        <Button mode="outlined" onPress={onRetry} style={styles.button}>
          Réessayer
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 160,
  },
  message: {
    textAlign: 'center',
    color: '#b00020',
  },
  button: {
    marginTop: 16,
  },
});
