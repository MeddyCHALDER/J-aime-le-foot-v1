import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { brand, easeOut, useNativeDriver } from '../../../theme/brand';
import { dur } from '../../../lib/motion';

/** Fond des écrans d'auth : lignes de terrain discrètes et bandes lime en biais. */
export function AuthBackdrop() {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(a, {
        toValue: 1,
        duration: dur(900),
        delay: dur(100),
        easing: easeOut,
        useNativeDriver,
      }),
      Animated.timing(b, {
        toValue: 1,
        duration: dur(900),
        delay: dur(300),
        easing: easeOut,
        useNativeDriver,
      }),
    ]).start();
  }, [a, b]);

  const slide = (v: Animated.Value) => ({
    transform: [
      { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) },
      { skewX: '-24deg' },
    ],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.centerCircle} />
      <View style={styles.halfway} />
      <View style={styles.box} />
      <Animated.View style={[styles.stripe, slide(a)]} />
      <Animated.View style={[styles.stripeThin, slide(b)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  centerCircle: {
    position: 'absolute',
    right: -132,
    top: 118,
    width: 264,
    height: 264,
    borderRadius: 132,
    borderWidth: 2,
    borderColor: brand.pitchLineSoft,
  },
  halfway: {
    position: 'absolute',
    right: -1,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: brand.pitchLineSoft,
  },
  box: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -2,
    width: 200,
    height: 110,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stripe: {
    position: 'absolute',
    right: -56,
    top: -40,
    width: 120,
    height: 200,
    backgroundColor: brand.lime,
    opacity: 0.9,
  },
  stripeThin: {
    position: 'absolute',
    right: -110,
    top: -40,
    width: 28,
    height: 200,
    backgroundColor: brand.lime,
    opacity: 0.35,
  },
});
