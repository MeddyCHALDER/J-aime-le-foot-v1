import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { fonts } from '../../../theme/brand';
import { useAppTheme } from '../../../theme/ThemeContext';
import { toErrorMessage } from '../../../lib/errors';
import { shareOrDownloadPng } from '../../attendance/matchSheet';
import { renderAwardResultsPng, resultsFilename, type AwardResultsImage } from '../resultsImage';

/**
 * Image des vainqueurs à envoyer sur le groupe WhatsApp : menu de partage sur téléphone,
 * téléchargement sur ordinateur. Le canvas n'existe que sur le web (PWA).
 */
export function ShareResultsButton({ build }: { build: () => AwardResultsImage }) {
  const { tokens } = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (Platform.OS !== 'web') return null;

  const share = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = build();
      const png = await renderAwardResultsPng(data);
      await shareOrDownloadPng(png, resultsFilename(data.title), `Résultats · ${data.title}`);
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={share}
        disabled={busy}
        accessibilityRole="button"
        style={[styles.btn, { backgroundColor: tokens.lime }, busy && { opacity: 0.6 }]}
      >
        <Text style={[styles.text, { color: tokens.onLime, fontFamily: fonts.body }]}>
          {busy ? 'Préparation…' : 'Partager l’image des vainqueurs'}
        </Text>
      </Pressable>
      {error ? (
        <Text style={[styles.error, { color: tokens.errorText, fontFamily: fonts.body }]}>{error}</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  btn: { marginTop: 16, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, fontWeight: '700' },
  error: { fontSize: 13, marginTop: 8 },
});
