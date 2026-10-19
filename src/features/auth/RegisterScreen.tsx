import React, { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { authErrorMessage } from './authErrors';
import { AuthLayout, authLinkStyles } from './components/AuthLayout';
import { AuthField } from './components/AuthField';
import { AuthButton } from './components/AuthButton';
import { AuthSuccessOverlay } from './components/AuthSuccessOverlay';

interface RegisterScreenProps {
  onRegister: (email: string, password: string, displayName?: string) => Promise<void>;
  onGoToLogin: () => void;
}

export function RegisterScreen({ onRegister, onGoToLogin }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const fail = (message: string) => {
    setInfo(null);
    setError(message);
    setErrorKey((k) => k + 1);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      fail('Email et mot de passe requis.');
      return;
    }
    if (password.length < 6) {
      fail('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await onRegister(email.trim(), password, displayName.trim() || undefined);
      setSuccess(true);
      setInfo('Compte créé. Tu peux te connecter.');
    } catch (e: unknown) {
      fail(authErrorMessage(e, 'Inscription impossible'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuthLayout
        line1="Crée ton"
        line2="compte joueur"
        accent="joueur"
        intro="Pseudo, email, et tu es dans le game avec tes potes."
        error={error}
        errorKey={errorKey}
        info={info}
      >
        <AuthField
          label="Pseudo"
          nativeID="register-name"
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          editable={!loading && !success}
        />
        <AuthField
          ref={emailRef}
          label="Email"
          nativeID="register-email"
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
          nativeID="register-password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password-new"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          editable={!loading && !success}
        />
        <AuthButton
          label="S'inscrire"
          onPress={handleSubmit}
          loading={loading}
          loadingLabel="Création…"
        />
        <View style={authLinkStyles.wrap}>
          <Pressable
            onPress={onGoToLogin}
            disabled={loading}
            accessibilityRole="link"
            style={authLinkStyles.link}
          >
            <Text style={authLinkStyles.text}>
              Déjà un compte ? <Text style={authLinkStyles.strong}>Se connecter</Text>
            </Text>
          </Pressable>
        </View>
      </AuthLayout>
      {success ? (
        <AuthSuccessOverlay
          title="Compte créé"
          subtitle="Bienvenue dans le game"
          onDone={onGoToLogin}
        />
      ) : null}
    </View>
  );
}
