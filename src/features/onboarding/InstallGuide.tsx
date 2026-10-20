import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { fonts } from '../../theme/brand';
import { useAppTheme } from '../../theme/ThemeContext';
import {
  canPromptInstall,
  devicePlatform,
  isIosNonSafari,
  onInstallPromptChange,
  promptInstall,
} from '../../lib/install';

interface InstallGuideProps {
  onClose: () => void;
}

type Tab = 'ios' | 'android';

const stroke = { fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Bouton Partager de Safari */
function ShareIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M12 3v12M8 7l4-4 4 4" stroke={color} {...stroke} />
      <Path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" stroke={color} {...stroke} />
    </Svg>
  );
}

/** « Sur l'écran d'accueil » (carré +) */
function AddIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={3.5} y={3.5} width={17} height={17} rx={4} stroke={color} {...stroke} />
      <Path d="M12 8v8M8 12h8" stroke={color} {...stroke} />
    </Svg>
  );
}

/** Confirmation (coche) */
function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={color} {...stroke} />
      <Path d="M8 12.5l2.8 2.8L16 10" stroke={color} {...stroke} />
    </Svg>
  );
}

/** Menu ⋮ de Chrome */
function KebabIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={5} r={1.6} fill={color} />
      <Circle cx={12} cy={12} r={1.6} fill={color} />
      <Circle cx={12} cy={19} r={1.6} fill={color} />
    </Svg>
  );
}

/** Icône de l'app sur l'écran d'accueil */
function PhoneIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={6} y={2.5} width={12} height={19} rx={2.5} stroke={color} {...stroke} />
      <Path d="M10.5 18.5h3" stroke={color} {...stroke} />
    </Svg>
  );
}

interface Step {
  icon: (color: string) => React.ReactNode;
  title: string;
  detail?: string;
}

const IOS_STEPS: Step[] = [
  {
    icon: (c) => <ShareIcon color={c} />,
    title: 'Touche le bouton Partager',
    detail: 'En bas de Safari (en haut sur iPad). Sur iOS 26, touche d’abord ••• puis Partager.',
  },
  {
    icon: (c) => <AddIcon color={c} />,
    title: 'Choisis « Sur l’écran d’accueil »',
    detail: 'Fais défiler la liste des actions si tu ne le vois pas tout de suite.',
  },
  {
    icon: (c) => <CheckIcon color={c} />,
    title: 'Touche « Ajouter »',
    detail: 'En haut à droite. L’icône J’aime le foot apparaît sur ton écran d’accueil.',
  },
  {
    icon: (c) => <PhoneIcon color={c} />,
    title: 'Ouvre l’app depuis l’icône',
    detail: 'Plein écran, et tu peux activer les notifications des matchs dans Profil.',
  },
];

const ANDROID_STEPS: Step[] = [
  {
    icon: (c) => <KebabIcon color={c} />,
    title: 'Touche le menu ⋮ de Chrome',
    detail: 'En haut à droite de l’écran.',
  },
  {
    icon: (c) => <AddIcon color={c} />,
    title: 'Choisis « Installer »',
    detail: '« Installer l’application » ou « Ajouter à l’écran d’accueil » selon ton téléphone.',
  },
  {
    icon: (c) => <CheckIcon color={c} />,
    title: 'Confirme avec « Installer »',
    detail: 'L’icône J’aime le foot apparaît avec tes autres applis.',
  },
  {
    icon: (c) => <PhoneIcon color={c} />,
    title: 'Ouvre l’app depuis l’icône',
    detail: 'Plein écran, et tu reçois les notifications des matchs.',
  },
];

/** Tuto « Installer l'app » (iPhone / Android), affiché à la première connexion et depuis Profil. */
export function InstallGuide({ onClose }: InstallGuideProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  const detected = devicePlatform();
  const [tab, setTab] = useState<Tab>(detected === 'android' ? 'android' : 'ios');
  const [canInstall, setCanInstall] = useState(canPromptInstall());
  useEffect(() => onInstallPromptChange(() => setCanInstall(canPromptInstall())), []);

  const steps = tab === 'ios' ? IOS_STEPS : ANDROID_STEPS;
  const body = { fontFamily: fonts.body };

  const pill = (value: Tab, label: string) => {
    const on = tab === value;
    return (
      <Pressable
        onPress={() => setTab(value)}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        style={[styles.pill, { borderColor: on ? tokens.lime : tokens.line }, on && { backgroundColor: tokens.lime }]}
      >
        <Text style={[styles.pillText, body, { color: on ? tokens.onLime : tokens.text }]}>
          {label}
          {detected === value ? ' · ton téléphone' : ''}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: tokens.ink }]}
      accessibilityViewIsModal
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 22,
        }}
      >
        <Text style={[styles.eyebrow, body, { color: tokens.lime }]}>Bienvenue</Text>
        <Text style={[styles.title, { color: tokens.text, fontFamily: fonts.display }]}>
          Installe l’app sur ton téléphone
        </Text>
        <Text style={[styles.sub, body, { color: tokens.muted }]}>
          Une icône sur ton écran d’accueil, l’app en plein écran et les notifications des matchs.
          Ça prend 20 secondes, sans passer par un store.
        </Text>

        <View style={styles.pills} accessibilityRole="tablist">
          {pill('ios', 'iPhone')}
          {pill('android', 'Android')}
        </View>

        {tab === 'ios' && isIosNonSafari() ? (
          <View style={[styles.note, { backgroundColor: tokens.surface, borderColor: tokens.line }]}>
            <Text style={[styles.noteText, body, { color: tokens.text }]}>
              Tu n’es pas dans Safari : ouvre jaimelefoot.app dans Safari pour l’installer.
            </Text>
          </View>
        ) : null}

        {tab === 'android' && canInstall ? (
          <Pressable
            onPress={async () => {
              const ok = await promptInstall();
              if (ok) onClose();
            }}
            style={[styles.primary, { backgroundColor: tokens.lime }]}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryText, body, { color: tokens.onLime }]}>Installer l’app</Text>
          </Pressable>
        ) : null}

        <View style={styles.steps}>
          {steps.map((step, i) => (
            <View key={step.title} style={[styles.step, { backgroundColor: tokens.surface, borderColor: tokens.line }]}>
              <View style={[styles.num, { backgroundColor: tokens.lime }]}>
                <Text style={[styles.numText, { color: tokens.onLime, fontFamily: fonts.display }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, body, { color: tokens.text }]}>{step.title}</Text>
                {step.detail ? (
                  <Text style={[styles.stepDetail, body, { color: tokens.muted }]}>{step.detail}</Text>
                ) : null}
              </View>
              <View style={[styles.iconBox, { borderColor: tokens.line }]}>{step.icon(tokens.lime)}</View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={onClose}
          style={[styles.secondary, { borderColor: tokens.line }]}
          accessibilityRole="button"
        >
          <Text style={[styles.secondaryText, body, { color: tokens.text }]}>J’ai compris</Text>
        </Pressable>
        <Text style={[styles.foot, body, { color: tokens.muted2 }]}>
          Tu retrouveras ce guide dans Profil → Installer l’app.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 50 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  title: { fontSize: 32, fontStyle: 'italic', fontWeight: '700', lineHeight: 36, marginTop: 8 },
  sub: { fontSize: 15, lineHeight: 22, marginTop: 10 },
  pills: { flexDirection: 'row', gap: 8, marginTop: 22 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, height: 38, justifyContent: 'center' },
  pillText: { fontSize: 14, fontWeight: '700' },
  note: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 16 },
  noteText: { fontSize: 14, lineHeight: 20 },
  primary: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryText: { fontSize: 16, fontWeight: '700' },
  steps: { marginTop: 16, gap: 10 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 15, fontStyle: 'italic', fontWeight: '700' },
  stepTitle: { fontSize: 15, fontWeight: '700' },
  stepDetail: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  iconBox: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondary: { height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  foot: { fontSize: 12, textAlign: 'center', marginTop: 12 },
});
