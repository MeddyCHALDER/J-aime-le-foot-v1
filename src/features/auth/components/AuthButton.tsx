import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { brand, fonts, useNativeDriver } from '../../../theme/brand';
import { dur } from '../../../lib/motion';

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  loadingLabel?: string;
}

const BALL = 26;
const PAD = 22;

/** Bouton principal carré. Pendant le chargement, un ballon roule d'un bout à l'autre. */
export function AuthButton({
  label,
  onPress,
  loading = false,
  loadingLabel = 'Chargement en cours',
}: AuthButtonProps) {
  const press = useRef(new Animated.Value(1)).current;
  const roll = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!loading) {
      roll.stopAnimation();
      roll.setValue(0);
      return;
    }
    const cfg = { duration: dur(900), easing: Easing.bezier(0.45, 0.05, 0.4, 1), useNativeDriver };
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(roll, { toValue: 1, ...cfg }),
        Animated.timing(roll, { toValue: 0, ...cfg }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [loading, roll]);

  const travel = Math.max(0, width - PAD * 2 - BALL);

  return (
    <Animated.View style={{ transform: [{ scale: press }] }}>
      <Pressable
        onPress={onPress}
        disabled={loading}
        onPressIn={() =>
          Animated.spring(press, { toValue: 0.97, useNativeDriver, speed: 40 }).start()
        }
        onPressOut={() =>
          Animated.spring(press, { toValue: 1, useNativeDriver, speed: 40 }).start()
        }
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="button"
        accessibilityLabel={loading ? loadingLabel : label}
        accessibilityState={{ busy: loading, disabled: loading }}
        style={(state) => [
          styles.btn,
          (state as { hovered?: boolean }).hovered && !loading ? styles.hover : null,
        ]}
      >
        {loading ? (
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.track} />
            <Animated.View
              style={[
                styles.ball,
                {
                  transform: [
                    {
                      translateX: roll.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, travel],
                      }),
                    },
                    {
                      rotate: roll.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '540deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <MaterialCommunityIcons name="soccer" size={BALL} color={brand.ink} />
            </Animated.View>
          </View>
        ) : (
          <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color={brand.ink} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 58,
    borderRadius: 0,
    backgroundColor: brand.lime,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hover: { opacity: 0.92 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: {
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: 19,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: brand.ink,
  },
  track: {
    position: 'absolute',
    left: PAD,
    right: PAD,
    top: 29 + 12,
    height: 3,
    backgroundColor: 'rgba(11,15,13,0.18)',
  },
  ball: {
    position: 'absolute',
    left: PAD,
    top: 13,
    width: BALL,
    height: BALL,
    borderRadius: BALL / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
