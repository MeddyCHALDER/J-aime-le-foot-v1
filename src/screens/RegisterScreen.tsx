import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';

type Props = {
  onRegister: (email: string, password: string, displayName?: string) => Promise<void>;
  onGoToLogin: () => void;
};

export function RegisterScreen({ onRegister, onGoToLogin }: Props) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onRegister(email.trim(), password, displayName.trim() || undefined);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Inscription impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text variant="headlineMedium" style={styles.title}>
        Créer un compte
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Nom d'affichage (optionnel)"
        value={displayName}
        onChangeText={setDisplayName}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Mot de passe (min. 6 caractères)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password-new"
        mode="outlined"
        style={styles.input}
      />
      <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading} style={styles.button}>
        S'inscrire
      </Button>
      <Button mode="text" onPress={onGoToLogin} style={styles.link}>
        Déjà un compte ? Se connecter
      </Button>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  link: {
    marginTop: 16,
  },
});
