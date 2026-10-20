import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, useNativeDriver } from '../theme/brand';
import { dur } from '../lib/motion';
import { useAppTheme } from '../theme/ThemeContext';
import { IconMatch, IconProfile, IconVote } from './TabIcons';

export type PlayerTab = 'matches' | 'votes' | 'profile';

type TabDef = {
  id: PlayerTab;
  label: string;
  Icon: typeof IconMatch;
};

const TABS: TabDef[] = [
  { id: 'matches', label: 'Matchs', Icon: IconMatch },
  { id: 'votes', label: 'Votes', Icon: IconVote },
  { id: 'profile', label: 'Profil', Icon: IconProfile },
];

/** Hauteur zone onglets (icône + label), comme le Next. */
export const TAB_ITEM_HEIGHT = 58;
/** Padding minimal sous les labels ; la zone de la barre d'accueil iOS le remplace quand elle est plus grande. */
export const TAB_PAD_EXTRA = 18;

/** Hauteur totale réservée au dock (pour padding du contenu). */
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'web') {
    // Sur le web on s’appuie sur env(safe-area) en CSS — estimation pour le layout.
    const cssInset =
      typeof window !== 'undefined' && typeof getComputedStyle !== 'undefined'
        ? parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--sat-bottom') || '0'
          ) || 0
        : 0;
    // Fallback raisonnable iPhone home indicator si la var CSS n’est pas encore là
    const safe = cssInset > 0 ? cssInset : 0;
    return TAB_ITEM_HEIGHT + Math.max(TAB_PAD_EXTRA, safe);
  }
  return TAB_ITEM_HEIGHT + Math.max(TAB_PAD_EXTRA, insets.bottom);
}

/** Icône d'onglet : petit « pop » quand l'onglet devient actif. */
function TabIcon({ active, children }: { active: boolean; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!active || dur(1) === 0) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.18, duration: 120, useNativeDriver }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver }),
    ]).start();
  }, [active, scale]);
  return (
    // translateY -1 (onglet actif) et le « pop » dans un seul transform, l'un n'écrase pas l'autre
    <Animated.View style={[styles.iconWrap, { transform: [{ translateY: active ? -1 : 0 }, { scale }] }]}>
      {children}
    </Animated.View>
  );
}

interface TabBarProps {
  active: PlayerTab;
  onChange: (tab: PlayerTab) => void;
}

/**
 * Barre V1 = Next : zone 58px + paddingBottom (18 + safe-area).
 * Pas de height fixe + padding (sur RN Web ça double le vide sous les labels).
 */
export function TabBar({ active, onChange }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();

  const bottomPadStyle =
    Platform.OS === 'web'
      ? ({
          paddingBottom: `max(${TAB_PAD_EXTRA}px, env(safe-area-inset-bottom, 0px))`,
        } as object)
      : { paddingBottom: Math.max(TAB_PAD_EXTRA, insets.bottom) };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: tokens.tabbar,
          borderTopColor: tokens.line,
        },
        bottomPadStyle,
        Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
            } as object)
          : null,
      ]}
      accessibilityRole="tablist"
      accessibilityLabel="Navigation principale"
    >
      {TABS.map(({ id, label, Icon }) => {
        const on = active === id;
        const iconColor = on ? tokens.lime : tokens.muted;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
          >
            <TabIcon active={on}>
              <Icon color={iconColor} />
            </TabIcon>
            <Text
              style={[
                styles.label,
                {
                  color: on ? tokens.text : tokens.muted,
                  fontWeight: on ? '700' : '500',
                  fontFamily: fonts.body,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexShrink: 0,
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    height: TAB_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  iconWrap: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.1,
  },
});
