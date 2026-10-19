import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme/brand';
import { useAppTheme } from '../theme/ThemeContext';
import { IconCard, IconMatch, IconProfile } from './TabIcons';

export type PlayerTab = 'matches' | 'card' | 'profile';

type TabDef = {
  id: PlayerTab;
  label: string;
  Icon: typeof IconMatch;
};

const TABS: TabDef[] = [
  { id: 'matches', label: 'Matchs', Icon: IconMatch },
  { id: 'card', label: 'Carte', Icon: IconCard },
  { id: 'profile', label: 'Profil', Icon: IconProfile },
];

interface TabBarProps {
  active: PlayerTab;
  onChange: (tab: PlayerTab) => void;
}

/**
 * Barre V1 alignée sur frontend TabBar :
 * hauteur 76 + safe-area, zone onglets 58px, pictos trait, blur web.
 */
export function TabBar({ active, onChange }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();
  const bottomPad = 18 + insets.bottom;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: tokens.tabbar,
          borderTopColor: tokens.line,
          height: 58 + bottomPad,
          paddingBottom: bottomPad,
          ...(Platform.OS === 'web'
            ? ({
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
              } as object)
            : null),
        },
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
    height: 58,
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
