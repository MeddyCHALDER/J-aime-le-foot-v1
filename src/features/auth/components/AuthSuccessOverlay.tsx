import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { brand, easeOut, fonts, useNativeDriver } from '../../../theme/brand';
import { dur } from '../../../lib/motion';

interface AuthSuccessOverlayProps {
  onDone: () => void;
  title?: string;
  subtitle?: string;
}

/**
 * Transition après connexion : un carré lime part du bouton et couvre l'écran,
 * la coche apparaît, puis l'overlay s'efface sur l'application.
 */
export function AuthSuccessOverlay({
  onDone,
  title = 'Bienvenue',
  subtitle = 'Connexion réussie',
}: AuthSuccessOverlayProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const grow = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!size) return;
    const anim = Animated.sequence([
      Animated.timing(grow, { toValue: 1, duration: dur(750), easing: easeOut, useNativeDriver }),
      Animated.parallel([
        Animated.spring(pop, { toValue: 1, useNativeDriver, friction: 5, tension: 120 }),
        Animated.timing(text, {
          toValue: 1,
          duration: dur(450),
          delay: dur(120),
          easing: easeOut,
          useNativeDriver,
        }),
      ]),
      Animated.delay(dur(700)),
      Animated.timing(fade, { toValue: 0, duration: dur(400), useNativeDriver }),
    ]);
    anim.start(({ finished }) => finished && onDone());
    return () => anim.stop();
  }, [size, grow, pop, text, fade, onDone]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size) setSize({ w: width, h: height });
  };

  const side = size ? Math.ceil(Math.hypot(size.w, size.h) * 2) : 0;

  return (
    <Animated.View
      style={[styles.root, { opacity: fade }]}
      onLayout={onLayout}
      accessibilityLiveRegion="polite"
    >
      {size ? (
        <Animated.View
          style={[
            styles.square,
            {
              width: side,
              height: side,
              left: size.w / 2 - side / 2,
              top: size.h * 0.79 - side / 2,
              transform: [{ scale: grow }],
            },
          ]}
        />
      ) : null}
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.badge,
            {
              opacity: pop,
              transform: [
                { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons name="check-bold" size={46} color={brand.lime} />
        </Animated.View>
        <Animated.View
          style={{
            alignItems: 'center',
            gap: 6,
            opacity: text,
            transform: [
              { translateY: text.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            ],
          }}
        >
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 30, overflow: 'hidden' },
  square: { position: 'absolute', backgroundColor: brand.lime },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    padding: 32,
  },
  badge: {
    width: 96,
    height: 96,
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: 40,
    lineHeight: 42,
    textTransform: 'uppercase',
    color: brand.ink,
  },
  subtitle: { fontFamily: fonts.body, fontSize: 16, fontWeight: '500', color: brand.ink },
});
