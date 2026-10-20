import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import { toErrorMessage } from '../../lib/errors';
import { disablePush, enablePush, getPushState, sendTestPush, type PushState } from './api';

const NOTES: Partial<Record<PushState, string>> = {
  unsupported: 'Ce navigateur ne reçoit pas les notifications.',
  'needs-install':
    'Sur iPhone, ajoute d’abord l’app à l’écran d’accueil (Partager → Sur l’écran d’accueil), puis ouvre-la depuis l’icône.',
  denied: 'Notifications bloquées : autorise-les dans les réglages du navigateur pour ce site.',
};

/** Ligne « Notifications » du profil : nouveaux matchs et ouverture des votes. */
export function PushToggle() {
  const { tokens } = useAppTheme();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let alive = true;
    getPushState()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState('unsupported'));
    return () => {
      alive = false;
    };
  }, []);

  const actionable = state === 'on' || state === 'off';
  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      setState(state === 'on' ? await disablePush() : await enablePush());
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const note = state ? NOTES[state] : null;

  const test = async () => {
    setTesting(true);
    setTestMsg(null);
    setError(null);
    try {
      const { sent, devices } = await sendTestPush();
      setTestMsg(
        sent > 0
          ? `Envoyée sur ${sent} appareil${sent > 1 ? 's' : ''}. Elle doit arriver dans quelques secondes.`
          : devices > 0
            ? 'L’envoi a échoué : désactive puis réactive les notifications, et réessaie.'
            : 'Aucun appareil enregistré : désactive puis réactive les notifications.'
      );
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <View>
      <Pressable
        onPress={toggle}
        disabled={!actionable || busy}
        style={styles.row}
        accessibilityRole="switch"
        accessibilityState={{ checked: state === 'on', disabled: !actionable || busy }}
      >
        <View style={styles.label}>
          <Text style={[styles.rowText, { color: tokens.text, fontFamily: fonts.body }]}>
            Notifications
          </Text>
          <Text style={[styles.hint, { color: tokens.muted, fontFamily: fonts.body }]}>
            Nouveaux matchs et ouverture des votes
          </Text>
        </View>
        {actionable ? (
          <Text style={{ color: tokens.lime, fontFamily: fonts.body, fontWeight: '700' }}>
            {busy ? '…' : state === 'on' ? 'Activées' : 'Activer'}
          </Text>
        ) : null}
      </Pressable>
      {note ? (
        <Text style={[styles.note, { color: tokens.muted, fontFamily: fonts.body }]}>{note}</Text>
      ) : null}
      {state === 'on' ? (
        <Pressable onPress={test} disabled={testing} style={styles.row} accessibilityRole="button">
          <Text style={[styles.rowText, { color: tokens.text, fontFamily: fonts.body }]}>
            Envoyer une notification de test
          </Text>
          <Text style={{ color: tokens.lime, fontFamily: fonts.body, fontWeight: '700' }}>
            {testing ? '…' : 'Tester'}
          </Text>
        </Pressable>
      ) : null}
      {testMsg ? (
        <Text style={[styles.note, { color: tokens.muted, fontFamily: fonts.body }]}>{testMsg}</Text>
      ) : null}
      {error ? (
        <Text style={[styles.note, { color: tokens.errorText, fontFamily: fonts.body }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  label: { flex: 1 },
  rowText: { fontSize: 15, fontWeight: '500' },
  hint: { fontSize: 12, marginTop: 2 },
  note: { fontSize: 13, lineHeight: 18, paddingBottom: 12 },
});
