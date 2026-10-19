import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: Props) {
  return (
    <View style={styles.container}>
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
    padding: 24,
  },
  message: {
    textAlign: 'center',
    color: '#b00020',
  },
  button: {
    marginTop: 16,
  },
});
