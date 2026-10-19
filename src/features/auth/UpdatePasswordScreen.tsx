import React, { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { authErrorMessage } from './authErrors';
import { updatePassword } from './api';
import { AuthLayout } from './components/AuthLayout';
import { AuthField } from './components/AuthField';
import { AuthButton } from './components/AuthButton';
import { AuthSuccessOverlay } from './components/AuthSuccessOverlay';

interface UpdatePasswordScreenProps {
  onDone: () => void;
}

export function UpdatePasswordScreen({ onDone }: UpdatePasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const confirmRef = useRef<TextInput>(null);

  const fail = (message: string) => {
    setError(message);
    setErrorKey((k) => k + 1);
  };

  const handleSubmit = async () => {
    if (password.length < 6) {
      fail('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      fail('Les mots de passe ne correspondent pas.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (e: unknown) {
      fail(authErrorMessage(e, 'Mise à jour impossible'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuthLayout
        line1="Nouveau"
        line2="mot de passe"
        accent="passe"
        intro="Choisis un mot de passe solide pour sécuriser ton compte."
        error={error}
        errorKey={errorKey}
      >
        <AuthField
          label="Nouveau mot de passe"
          nativeID="update-password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password-new"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          editable={!loading && !success}
        />
        <AuthField
          ref={confirmRef}
          label="Confirmer"
          nativeID="update-password-confirm"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="password-new"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          editable={!loading && !success}
        />
        <AuthButton
          label="Enregistrer"
          onPress={handleSubmit}
          loading={loading}
          loadingLabel="Enregistrement…"
        />
      </AuthLayout>
      {success ? (
        <AuthSuccessOverlay
          title="C’est bon"
          subtitle="Mot de passe mis à jour"
          onDone={onDone}
        />
      ) : null}
    </View>
  );
}
