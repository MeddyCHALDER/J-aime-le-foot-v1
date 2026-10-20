import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../theme/brand';
import { useAppTheme } from '../../../theme/ThemeContext';
import { canShareInvite, copyInvite, inviteMessage, shareInvite } from '../invite';

interface InviteCardProps {
  leagueName: string;
  code: string;
}

/** Message d'invitation prêt à coller (WhatsApp, Instagram…) + copie et partage en un geste. */
export function InviteCard({ leagueName, code }: InviteCardProps) {
  const { tokens } = useAppTheme();
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const message = inviteMessage(leagueName, code);
  const body = { fontFamily: fonts.body };

  const copy = async () => {
    const ok = await copyInvite(message);
    setCopied(ok);
    setManual(!ok);
    if (ok) setTimeout(() => setCopied(false), 2500);
  };

  const share = async () => {
    const ok = await shareInvite(message);
    if (!ok) await copy();
  };

  return (
    <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.line }]}>
      <Text style={[styles.eyebrow, body, { color: tokens.lime }]}>Inviter tes potes</Text>
      <View style={[styles.codeBox, { borderColor: tokens.lime }]}>
        <Text style={[styles.codeLabel, body, { color: tokens.muted }]}>Code d’invitation</Text>
        <Text selectable style={[styles.code, { color: tokens.text, fontFamily: fonts.display }]}>
          {code.toUpperCase()}
        </Text>
      </View>

      <Text style={[styles.previewLabel, body, { color: tokens.muted2 }]}>Message à envoyer</Text>
      <View style={[styles.preview, { backgroundColor: tokens.ink, borderColor: tokens.line }]}>
        <Text selectable style={[styles.previewText, body, { color: manual ? tokens.text : tokens.muted }]}>
          {message}
        </Text>
      </View>
      {manual ? (
        <Text style={[styles.hint, body, { color: tokens.errorText }]}>
          Copie automatique impossible : sélectionne le message ci-dessus pour le copier.
        </Text>
      ) : null}

      <Pressable
        onPress={copy}
        accessibilityRole="button"
        style={[styles.primary, { backgroundColor: tokens.lime }]}
      >
        <Text style={[styles.primaryText, body, { color: tokens.onLime }]}>
          {copied ? 'Message copié ✓' : 'Copier le message'}
        </Text>
      </Pressable>
      {canShareInvite() ? (
        <Pressable
          onPress={share}
          accessibilityRole="button"
          style={[styles.secondary, { borderColor: tokens.line }]}
        >
          <Text style={[styles.secondaryText, body, { color: tokens.text }]}>
            Partager (WhatsApp, Instagram…)
          </Text>
        </Pressable>
      ) : null}
      <Text style={[styles.hint, body, { color: tokens.muted2 }]}>
        Le lien fait rejoindre la ligue en un clic, même sans compte : il suffit de s’inscrire.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  codeBox: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  codeLabel: { fontSize: 12, fontWeight: '600' },
  code: { fontSize: 30, fontStyle: 'italic', fontWeight: '700', letterSpacing: 4, marginTop: 2 },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 6,
  },
  preview: { borderWidth: 1, borderRadius: 12, padding: 12 },
  previewText: { fontSize: 14, lineHeight: 20 },
  primary: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryText: { fontSize: 15, fontWeight: '700' },
  secondary: { height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 10 },
});
