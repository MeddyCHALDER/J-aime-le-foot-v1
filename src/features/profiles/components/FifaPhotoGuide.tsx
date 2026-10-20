import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../../theme/brand';
import { useAppTheme } from '../../../theme/ThemeContext';
import { CHATGPT_URL, FIFA_FIXES, JERSEY_PRESETS, buildFifaPrompt } from '../fifaPrompt';

interface FifaPhotoGuideProps {
  visible: boolean;
  onClose: () => void;
  /** Ouvre le sélecteur de fichier (upload existant de la photo de profil). */
  onImport: () => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* presse-papiers refusé : on affiche le texte à copier à la main */
  }
  return false;
}

/** Tuto « Créer ma photo FIFA » : prompt prêt à coller dans ChatGPT, puis import de l'image. */
export function FifaPhotoGuide({ visible, onClose, onImport }: FifaPhotoGuideProps) {
  const insets = useSafeAreaInsets();
  const { tokens, scheme } = useAppTheme();
  const [mode, setMode] = useState<'choice' | 'guide'>('choice');
  const [preset, setPreset] = useState(0);
  const [custom, setCustom] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [manualCopy, setManualCopy] = useState<string | null>(null);

  const colors = custom.trim() || JERSEY_PRESETS[preset].colors;
  const prompt = buildFifaPrompt(colors);
  const body = { fontFamily: fonts.body };

  const close = () => {
    setMode('choice');
    setCopied(null);
    setManualCopy(null);
    onClose();
  };

  const copy = async (key: string, text: string) => {
    const ok = await copyText(text);
    setCopied(ok ? key : null);
    setManualCopy(ok ? null : text);
    return ok;
  };

  const copyAndOpen = async () => {
    // Copier d'abord : le presse-papiers exige le geste de l'utilisateur.
    await copy('prompt', prompt);
    if (Platform.OS === 'web') window.open(CHATGPT_URL, '_blank', 'noopener');
    else Linking.openURL(CHATGPT_URL);
  };

  const importNow = () => {
    close();
    onImport();
  };

  const stepTitle = (n: number, title: string) => (
    <View style={styles.stepHead}>
      <View style={[styles.num, { backgroundColor: tokens.lime }]}>
        <Text style={[styles.numText, { color: tokens.onLime, fontFamily: fonts.display }]}>{n}</Text>
      </View>
      <Text style={[styles.stepTitle, body, { color: tokens.text }]}>{title}</Text>
    </View>
  );

  const card = [styles.card, { backgroundColor: tokens.surface, borderColor: tokens.line }];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} transparent={false}>
      <View style={[styles.root, { backgroundColor: tokens.ink }]}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 28,
            paddingHorizontal: 22,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topBar}>
            <Text style={[styles.eyebrow, body, { color: tokens.lime }]}>Photo de profil</Text>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={12}>
              <Text style={[styles.close, body, { color: tokens.muted }]}>Fermer</Text>
            </Pressable>
          </View>

          {mode === 'choice' ? (
            <>
              <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>
                Ta photo de carte
              </Text>
              <Text style={[styles.sub, body, { color: tokens.muted }]}>
                Transforme ton selfie en photo officielle façon FIFA, avec le maillot de ton choix, en 2
                minutes avec ChatGPT (gratuit).
              </Text>
              <Pressable
                onPress={() => setMode('guide')}
                style={[styles.primary, { backgroundColor: tokens.lime }]}
                accessibilityRole="button"
              >
                <Text style={[styles.primaryText, body, { color: tokens.onLime }]}>Créer ma photo FIFA</Text>
              </Pressable>
              <Pressable onPress={importNow} style={[styles.secondary, { borderColor: tokens.line }]} accessibilityRole="button">
                <Text style={[styles.secondaryText, body, { color: tokens.text }]}>
                  J’ai déjà ma photo, l’importer
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>
                Ta photo FIFA en 4 étapes
              </Text>

              <View style={card}>
                {stepTitle(1, 'Choisis ton maillot')}
                <View style={styles.presets}>
                  {JERSEY_PRESETS.map((p, i) => {
                    const on = !custom.trim() && preset === i;
                    return (
                      <Pressable
                        key={p.label}
                        onPress={() => {
                          setPreset(i);
                          setCustom('');
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.preset, { borderColor: on ? tokens.lime : tokens.line }]}
                      >
                        <View style={styles.swatch}>
                          <View style={[styles.swatchHalf, { backgroundColor: p.swatch[0] }]} />
                          <View style={[styles.swatchHalf, { backgroundColor: p.swatch[1] }]} />
                        </View>
                        <Text style={[styles.presetText, body, { color: tokens.text }]}>{p.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  placeholder="Ou décris-le : « jaune avec manches vertes »"
                  placeholderTextColor={tokens.placeholder}
                  accessibilityLabel="Couleurs du maillot"
                  style={[
                    styles.input,
                    { backgroundColor: tokens.ink, borderColor: tokens.line, color: tokens.text },
                    body,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none', colorScheme: scheme } as object) : null,
                  ]}
                />
                <Text style={[styles.hint, body, { color: tokens.muted2 }]}>
                  Pas d’écusson ni de logo de club : ChatGPT les refuse souvent, et ce sont des marques
                  déposées.
                </Text>
              </View>

              <View style={card}>
                {stepTitle(2, 'Copie le texte et ouvre ChatGPT')}
                <Pressable
                  onPress={copyAndOpen}
                  style={[styles.primary, { backgroundColor: tokens.lime, marginTop: 4 }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.primaryText, body, { color: tokens.onLime }]}>
                    {copied === 'prompt' ? 'Texte copié ✓ — ouvrir ChatGPT' : 'Copier le texte et ouvrir ChatGPT'}
                  </Text>
                </Pressable>
                <Text style={[styles.detail, body, { color: tokens.muted }]}>
                  Dans ChatGPT : touche + pour joindre ton selfie, colle le texte, puis envoie.
                </Text>
                <Text style={[styles.tip, body, { color: tokens.muted2 }]}>
                  Selfie réussi : de face, visage bien éclairé (face à une fenêtre), sans casquette ni
                  lunettes de soleil, téléphone à hauteur des yeux.
                </Text>
              </View>

              <View style={card}>
                {stepTitle(3, 'Enregistre l’image')}
                <Text style={[styles.detail, body, { color: tokens.muted }]}>
                  Appuie longuement sur l’image générée puis « Enregistrer dans Photos » (ou le bouton
                  télécharger sur ordinateur).
                </Text>
                <Text style={[styles.fixTitle, body, { color: tokens.text }]}>Pas satisfait ? Renvoie :</Text>
                {FIFA_FIXES.map((f) => (
                  <Pressable
                    key={f.problem}
                    onPress={() => copy(f.problem, f.text)}
                    style={[styles.fix, { borderColor: tokens.line }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Copier la correction : ${f.problem}`}
                  >
                    <Text style={[styles.fixProblem, body, { color: tokens.text }]}>{f.problem}</Text>
                    <Text style={[styles.fixCopy, body, { color: tokens.lime }]}>
                      {copied === f.problem ? 'Copié ✓' : 'Copier'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={card}>
                {stepTitle(4, 'Reviens ici et importe-la')}
                <Pressable onPress={importNow} style={[styles.primary, { backgroundColor: tokens.lime, marginTop: 4 }]} accessibilityRole="button">
                  <Text style={[styles.primaryText, body, { color: tokens.onLime }]}>Importer ma photo FIFA</Text>
                </Pressable>
              </View>

              {manualCopy ? (
                <View style={card}>
                  <Text style={[styles.fixTitle, body, { color: tokens.text }]}>
                    Copie impossible automatiquement : sélectionne et copie ce texte.
                  </Text>
                  <Text selectable style={[styles.manual, body, { color: tokens.muted }]}>
                    {manualCopy}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  close: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 30, fontStyle: 'italic', fontWeight: '700', lineHeight: 34, marginTop: 10 },
  sub: { fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 8 },
  primary: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingHorizontal: 12 },
  primaryText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  secondary: { height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 14 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 15, fontStyle: 'italic', fontWeight: '700' },
  stepTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  swatch: { width: 18, height: 18, borderRadius: 9, overflow: 'hidden', flexDirection: 'row' },
  swatchHalf: { flex: 1 },
  presetText: { fontSize: 13, fontWeight: '600' },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, marginTop: 12 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  detail: { fontSize: 14, lineHeight: 20, marginTop: 10 },
  tip: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  fixTitle: { fontSize: 14, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  fix: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 44, marginTop: 6 },
  fixProblem: { fontSize: 14, fontWeight: '500', flex: 1 },
  fixCopy: { fontSize: 13, fontWeight: '700' },
  manual: { fontSize: 13, lineHeight: 19, marginTop: 6 },
});
