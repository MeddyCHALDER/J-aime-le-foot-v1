import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { brand, easeIn, easeInOut, easeOut, useNativeDriver } from '../../../theme/brand';
import { dur } from '../../../lib/motion';

const MARK = 112;
const WORD_W = 236;
const WORD_H = 35;

interface BrandSplashProps {
  onDone: () => void;
}

/**
 * Animation d'entrée (environ 3 s) : le terrain se trace, le carré « jf » monte,
 * le nom glisse en penché, un trait lime passe dessous, puis le logo s'envole.
 */
export function BrandSplash({ onDone }: BrandSplashProps) {
  const lines = useRef(new Animated.Value(0)).current;
  const circle = useRef(new Animated.Value(0)).current;
  const mark = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = (v: Animated.Value, delay: number, duration: number, easing = easeOut, toValue = 1) =>
      Animated.timing(v, {
        toValue,
        delay: dur(delay),
        duration: dur(duration),
        easing,
        useNativeDriver,
      });

    const anim = Animated.parallel([
      t(lines, 0, 1100, easeInOut),
      t(circle, 150, 1100, easeInOut),
      t(mark, 550, 700),
      t(word, 1050, 600),
      t(flash, 1150, 600, easeOut),
      t(sweep, 1450, 800, easeInOut),
      t(out, 2450, 550, easeIn),
    ]);
    anim.start(({ finished }) => finished && onDone());
    return () => anim.stop();
  }, [lines, circle, mark, word, flash, sweep, out, onDone]);

  const fadePitch = out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View
      style={[
        styles.root,
        { opacity: out.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }) },
      ]}
      accessibilityRole="image"
      accessibilityLabel="J'aime le foot"
    >
      <StatusBar style="light" />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: fadePitch,
            transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
          },
        ]}
      >
        <Animated.View style={[styles.halfway, { transform: [{ scaleX: lines }] }]} />
        <Animated.View
          style={[
            styles.circle,
            {
              opacity: circle,
              transform: [
                { scale: circle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
            },
          ]}
        />
        <Animated.View style={[styles.boxTop, { opacity: lines }]} />
        <Animated.View style={[styles.boxBottom, { opacity: lines }]} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.flash,
          {
            opacity: flash.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.3, 0] }),
            transform: [
              { scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.group,
          {
            opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [
              { translateY: out.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) },
              { scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0.56] }) },
            ],
          },
        ]}
      >
        <View style={styles.markClip}>
          <Animated.Image
            source={require('../../../../assets/brand/mark.png')}
            style={[
              styles.mark,
              {
                transform: [
                  {
                    translateY: mark.interpolate({
                      inputRange: [0, 0.6, 1],
                      outputRange: [MARK, -4, 0],
                    }),
                  },
                  {
                    skewY: mark.interpolate({
                      inputRange: [0, 0.6, 1],
                      outputRange: ['-8deg', '0deg', '0deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
        <View style={styles.wordCol}>
          <View style={styles.wordClip}>
            <Animated.View
              style={{
                opacity: word,
                transform: [
                  {
                    translateX: word.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-WORD_W * 1.08, 0],
                    }),
                  },
                  {
                    skewX: word.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-14deg', '0deg'],
                    }),
                  },
                ],
              }}
            >
              <Image
                source={require('../../../../assets/brand/wordmark-light.png')}
                style={styles.word}
              />
            </Animated.View>
          </View>
          <View style={styles.sweepClip}>
            <Animated.View
              style={[
                styles.sweep,
                {
                  transform: [
                    {
                      translateX: sweep.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [-WORD_W, 0, WORD_W],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 20,
  },
  halfway: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    backgroundColor: brand.pitchLine,
  },
  circle: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -132,
    width: 264,
    height: 264,
    borderRadius: 132,
    borderWidth: 2,
    borderColor: brand.pitchLine,
  },
  boxTop: {
    position: 'absolute',
    alignSelf: 'center',
    top: -2,
    width: 200,
    height: 110,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  boxBottom: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -2,
    width: 200,
    height: 110,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  flash: {
    position: 'absolute',
    width: 200,
    height: 200,
    marginTop: -100,
    borderWidth: 3,
    borderColor: brand.lime,
  },
  group: { alignItems: 'center', gap: 22 },
  markClip: { width: MARK, height: MARK, overflow: 'hidden' },
  mark: { width: MARK, height: MARK },
  wordCol: { gap: 10 },
  wordClip: { overflow: 'hidden', paddingVertical: 4, paddingHorizontal: 6 },
  word: { width: WORD_W, height: WORD_H },
  sweepClip: { height: 4, overflow: 'hidden', marginHorizontal: 6 },
  sweep: { height: 4, width: WORD_W, backgroundColor: brand.lime },
});
