import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme/brand';
import { useAppTheme } from '../theme/ThemeContext';

export type PlayerTab = 'matches' | 'card' | 'profile';

type TabDef = {
  id: PlayerTab;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

const TABS: TabDef[] = [
  { id: 'matches', label: 'Matchs', icon: 'calendar-month-outline' },
  { id: 'card', label: 'Carte', icon: 'card-account-details-outline' },
  { id: 'profile', label: 'Profil', icon: 'account-outline' },
];

interface TabBarProps {
  active: PlayerTab;
  onChange: (tab: PlayerTab) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: tokens.tabbar,
          borderTopColor: tokens.line,
          paddingBottom: Math.max(insets.bottom, 18),
          height: 58 + Math.max(insets.bottom, 18),
        },
      ]}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const on = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={22}
              color={on ? tokens.lime : tokens.muted}
              style={on ? { transform: [{ translateY: -1 }] } : undefined}
            />
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
              {tab.label}
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
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 0,
  },
  item: {
    flex: 1,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.1,
  },
});
