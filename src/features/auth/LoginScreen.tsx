import React, { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { authErrorMessage } from './authErrors';
import { AuthLayout, authLinkStyles } from './components/AuthLayout';
import { AuthField } from './components/AuthField';
import { AuthButton } from './components/AuthButton';
import { AuthSuccessOverlay } from './components/AuthSuccessOverlay';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onGoToRegister: () => void;
}

export function LoginScreen({ onLogin, onGoToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const fail = (message: string) => {
    setError(message);
    setErrorKey((k) => k + 1);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      fail('Email et mot de passe requis.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
      setSuccess(true);
    } catch (e: unknown) {
      fail(authErrorMessage(e, 'Connexion impossible'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuthLayout
        line1="Bon retour"
        line2="sur le terrain"
        accent="terrain"
        intro="Connecte-toi pour retrouver tes ligues, matchs et potes."
        error={error}
        errorKey={errorKey}
      >
        <AuthField
          label="Email"
          nativeID="login-email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!loading && !success}
        />
        <AuthField
          ref={passwordRef}
          label="Mot de passe"
          nativeID="login-password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          editable={!loading && !success}
        />
        <AuthButton
          label="Se connecter"
          onPress={handleSubmit}
          loading={loading}
          loadingLabel="Connexion…"
        />
        <View style={authLinkStyles.wrap}>
          <Pressable
            onPress={onGoToRegister}
            disabled={loading || success}
            accessibilityRole="link"
            style={authLinkStyles.link}
          >
            <Text style={authLinkStyles.text}>
              Pas de compte ? <Text style={authLinkStyles.strong}>S'inscrire</Text>
            </Text>
          </Pressable>
        </View>
      </AuthLayout>
      {success ? <AuthSuccessOverlay onDone={() => undefined} /> : null}
    </View>
  );
}
