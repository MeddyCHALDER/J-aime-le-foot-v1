import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { easeOut, useNativeDriver } from '../../../theme/brand';
import { dur } from '../../../lib/motion';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  /** Sens d'arrivée : 'up' monte, 'down' descend, 'rise' sort d'un masque (titres). */
  from?: 'up' | 'down' | 'rise';
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

/** Apparition d'un bloc à l'ouverture de l'écran (fondu + glissement). */
export function Reveal({ children, delay = 0, from = 'up', distance, style }: RevealProps) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: dur(from === 'rise' ? 600 : 500),
      delay: dur(delay),
      easing: easeOut,
      useNativeDriver,
    }).start();
  }, [v, delay, from]);

  const d = distance ?? (from === 'down' ? -16 : from === 'rise' ? 56 : 18);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [d, 0] });

  if (from === 'rise') {
    return (
      <Animated.View style={[{ overflow: 'hidden' }, style]}>
        <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
