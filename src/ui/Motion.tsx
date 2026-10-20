import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { easeOut, useNativeDriver } from '../theme/brand';
import { dur } from '../lib/motion';

/** Fondu + glissement joués une fois au montage. Durées à 0 si « Réduire les animations ». */
function useEnter(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(dur(duration) === 0 ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: dur(duration),
      delay: dur(delay),
      easing: easeOut,
      useNativeDriver,
    }).start();
  }, [v, duration, delay]);
  return v;
}

/** Arrivée d'une page poussée dans la pile : glisse depuis la droite en apparaissant. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const v = useEnter(280);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  return (
    <Animated.View style={[styles.fill, { opacity: v, transform: [{ translateX }] }]}>
      {children}
    </Animated.View>
  );
}

/** Contenu d'onglet : à chaque changement (clé différente), fondu + légère montée. */
export function FadeSwap({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useEnter(220);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return (
    <Animated.View style={[styles.fill, style, { opacity: v, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * Élément de liste qui arrive en cascade (index → petit décalage).
 * Le décalage est plafonné : une longue liste ne fait pas attendre.
 */
export function Appear({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useEnter(320, Math.min(index, 8) * 45);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
