import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand, fonts, useNativeDriver } from '../../../theme/brand';
import { dur } from '../../../lib/motion';
import { AuthBackdrop } from './AuthBackdrop';
import { Reveal } from './Reveal';

interface AuthLayoutProps {
  /** Titre sur deux lignes ; le mot `accent` de la 2e ligne passe en lime. */
  line1: string;
  line2: string;
  accent?: string;
  intro?: string;
  /** Message d'erreur ; un nouveau message relance le tremblement du formulaire. */
  error?: string | null;
  errorKey?: number;
  info?: string | null;
  children: React.ReactNode;
}

export function AuthLayout({
  line1,
  line2,
  accent,
  intro,
  error,
  errorKey = 0,
  info,
  children,
}: AuthLayoutProps) {
  const shake = useRef(new Animated.Value(0)).current;
  // Encoche, barre d'état et barre d'accueil : le contenu reste dans la zone sûre.
  const insets = useSafeAreaInsets();
  const safePadding = {
    paddingTop: Math.max(64, insets.top + 28),
    paddingBottom: Math.max(40, insets.bottom + 24),
    paddingLeft: 28 + insets.left,
    paddingRight: 28 + insets.right,
  };

  useEffect(() => {
    if (!errorKey) return;
    shake.setValue(0);
    Animated.timing(shake, { toValue: 1, duration: dur(420), useNativeDriver }).start();
  }, [errorKey, shake]);

  const translateX = shake.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [0, -9, 8, -5, 3, 0],
  });

  const renderLine2 = () => {
    if (!accent || !line2.includes(accent)) return line2;
    const [before, after] = line2.split(accent);
    return (
      <>
        {before}
        <Text style={{ color: brand.lime }}>{accent}</Text>
        {after}
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <AuthBackdrop />
      <ScrollView
        contentContainerStyle={[styles.scroll, safePadding]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Reveal from="down" style={styles.brandRow}>
          <Image
            source={require('../../../../assets/brand/mark.png')}
            style={styles.mark}
            accessibilityIgnoresInvertColors
          />
          <Image
            source={require('../../../../assets/brand/wordmark-light.png')}
            style={styles.word}
            accessibilityLabel="J'aime le foot"
          />
        </Reveal>

        <View style={styles.titleBlock} accessibilityRole="header">
          <Reveal from="rise" delay={120}>
            <Text style={styles.title}>{line1}</Text>
          </Reveal>
          <Reveal from="rise" delay={220}>
            <Text style={styles.title}>{renderLine2()}</Text>
          </Reveal>
        </View>
        {intro ? (
          <Reveal delay={380}>
            <Text style={styles.intro}>{intro}</Text>
          </Reveal>
        ) : null}

        <View style={styles.spacer} />

        <Animated.View style={[styles.form, { transform: [{ translateX }] }]}>
          {error ? (
            <Text
              style={styles.error}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {error}
            </Text>
          ) : null}
          {info ? (
            <Text style={styles.info} accessibilityLiveRegion="polite">
              {info}
            </Text>
          ) : null}
          {children}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.ink, overflow: 'hidden' },
  scroll: { flexGrow: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: { width: 40, height: 40 },
  word: { width: 148, height: 22 },
  titleBlock: { marginTop: 76 },
  title: {
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: 46,
    lineHeight: 46,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    color: brand.text,
  },
  intro: {
    marginTop: 16,
    maxWidth: 290,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23,
    color: brand.muted,
  },
  spacer: { flexGrow: 1, minHeight: 40 },
  form: { gap: 14 },
  error: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: brand.errorBg,
    color: brand.errorText,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '500',
  },
  info: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: brand.infoBg,
    color: brand.infoText,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '500',
  },
});

export const authLinkStyles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  link: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  text: { fontFamily: fonts.body, fontSize: 15, color: '#C9D0CB' },
  strong: { fontWeight: '600', textDecorationLine: 'underline' },
});
