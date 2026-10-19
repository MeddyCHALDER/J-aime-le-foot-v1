import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { authErrorMessage } from './authErrors';
import { requestPasswordReset } from './api';
import { AuthLayout, authLinkStyles } from './components/AuthLayout';
import { AuthField } from './components/AuthField';
import { AuthButton } from './components/AuthButton';

interface ForgotPasswordScreenProps {
  onGoToLogin: () => void;
  initialEmail?: string;
}

export function ForgotPasswordScreen({ onGoToLogin, initialEmail = '' }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [info, setInfo] = useState<string | null>(null);

  const fail = (message: string) => {
    setInfo(null);
    setError(message);
    setErrorKey((k) => k + 1);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      fail('Indique ton email.');
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setInfo('Si un compte existe, tu vas recevoir un email avec un lien pour choisir un nouveau mot de passe.');
    } catch (e: unknown) {
      fail(authErrorMessage(e, 'Envoi impossible'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      line1="Mot de"
      line2="passe oublié"
      accent="oublié"
      intro="Entre ton email : on t’envoie un lien pour en choisir un nouveau."
      error={error}
      errorKey={errorKey}
      info={info}
    >
      <AuthField
        label="Email"
        nativeID="forgot-email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        editable={!loading}
      />
      <AuthButton
        label="Envoyer le lien"
        onPress={handleSubmit}
        loading={loading}
        loadingLabel="Envoi…"
      />
      <View style={authLinkStyles.wrap}>
        <Pressable
          onPress={onGoToLogin}
          disabled={loading}
          accessibilityRole="link"
          style={authLinkStyles.link}
        >
          <Text style={authLinkStyles.text}>
            Retour à la <Text style={authLinkStyles.strong}>connexion</Text>
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
