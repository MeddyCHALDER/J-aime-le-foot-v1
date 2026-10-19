import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme/brand';
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
/** Padding design sous les labels, hors safe-area. */
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
    return TAB_ITEM_HEIGHT + TAB_PAD_EXTRA + safe;
  }
  return TAB_ITEM_HEIGHT + TAB_PAD_EXTRA + insets.bottom;
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
          paddingBottom: `calc(${TAB_PAD_EXTRA}px + env(safe-area-inset-bottom, 0px))`,
        } as object)
      : { paddingBottom: TAB_PAD_EXTRA + insets.bottom };

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
            <View style={[styles.iconWrap, on && styles.iconActive]}>
              <Icon color={iconColor} />
            </View>
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
  iconActive: {
    transform: [{ translateY: -1 }],
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.1,
  },
});
