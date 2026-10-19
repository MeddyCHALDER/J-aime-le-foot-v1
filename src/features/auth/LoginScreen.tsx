import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authErrorMessage } from './authErrors';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onGoToRegister: () => void;
  onGoToForgotPassword: () => void;
}

export function LoginScreen({ onLogin, onGoToRegister, onGoToForgotPassword }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (e: unknown) {
      setError(authErrorMessage(e, 'Connexion impossible'));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: tokens.ink, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={[styles.brand, { color: tokens.lime, fontFamily: fonts.body }]}>
          J&apos;aime le foot
        </Text>
        <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>
          Content de{'\n'}te revoir
        </Text>
        <Text style={[styles.intro, { color: tokens.muted, fontFamily: fonts.body }]}>
          Ta carte, tes stats et le classement du club t&apos;attendent.
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: tokens.muted, fontFamily: fonts.body }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!loading}
            style={[
              styles.input,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.line,
                color: tokens.text,
                fontFamily: fonts.body,
              },
            ]}
            placeholderTextColor={tokens.placeholder}
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: tokens.muted, fontFamily: fonts.body }]}>
            Mot de passe
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            editable={!loading}
            onSubmitEditing={handleSubmit}
            style={[
              styles.input,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.line,
                color: tokens.text,
                fontFamily: fonts.body,
              },
            ]}
            placeholderTextColor={tokens.placeholder}
          />
        </View>

        <Pressable onPress={onGoToForgotPassword} disabled={loading} style={styles.forgot}>
          <Text style={[styles.forgotText, { color: tokens.muted, fontFamily: fonts.body }]}>
            Mot de passe oublié ?
          </Text>
        </Pressable>

        {error ? (
          <Text style={[styles.error, { fontFamily: fonts.body }]}>{error}</Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.btn, { backgroundColor: tokens.lime, opacity: loading ? 0.7 : 1 }]}
        >
          <Text style={[styles.btnText, { color: tokens.onLime, fontFamily: fonts.body }]}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Text>
        </Pressable>

        <Pressable onPress={onGoToRegister} disabled={loading} style={styles.footer}>
          <Text style={[styles.footerText, { color: tokens.muted, fontFamily: fonts.body }]}>
            Pas encore de carte ?{' '}
            <Text style={{ color: tokens.lime, fontWeight: '700' }}>Crée ta fiche</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingBottom: 26,
  },
  brand: {
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
    marginTop: 12,
    letterSpacing: -0.2,
  },
  intro: { marginTop: 10, marginBottom: 26, fontSize: 15, lineHeight: 22, maxWidth: 280 },
  field: { marginBottom: 12, gap: 7 },
  label: { fontSize: 12, fontWeight: '600' },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  forgot: { alignSelf: 'flex-end', marginBottom: 8 },
  forgotText: { fontSize: 13 },
  error: { color: '#FF6259', fontSize: 12.5, marginBottom: 8 },
  btn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnText: { fontSize: 17, fontWeight: '700' },
  footer: { marginTop: 24, alignItems: 'center' },
  footerText: { fontSize: 13, textAlign: 'center' },
});
