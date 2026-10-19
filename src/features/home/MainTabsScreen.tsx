import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar, type PlayerTab } from '../../components/TabBar';
import { useAppTheme } from '../../theme/ThemeContext';
import { MatchesTabScreen } from './MatchesTabScreen';
import { CardTabScreen } from './CardTabScreen';
import { ProfileTabScreen } from './ProfileTabScreen';

interface MainTabsScreenProps {
  onMatchPress: (matchId: string) => void;
  onCreateLeague: () => void;
  onJoinLeague: () => void;
  onCreateMatch: (leagueId: string, seasonId: string) => void;
  onEditProfile: () => void;
}

export function MainTabsScreen({
  onMatchPress,
  onCreateLeague,
  onJoinLeague,
  onCreateMatch,
  onEditProfile,
}: MainTabsScreenProps) {
  const [tab, setTab] = useState<PlayerTab>('matches');
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  // Même formule que TabBar : 58 (onglets) + 18 + safe-area
  const tabBarHeight = 58 + 18 + insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: tokens.ink }]}>
      <View style={[styles.body, { paddingBottom: tabBarHeight }]}>
        {tab === 'matches' ? (
          <MatchesTabScreen
            onMatchPress={onMatchPress}
            onCreateLeague={onCreateLeague}
            onJoinLeague={onJoinLeague}
            onCreateMatch={onCreateMatch}
          />
        ) : null}
        {tab === 'card' ? <CardTabScreen /> : null}
        {tab === 'profile' ? (
          <ProfileTabScreen
            onEditProfile={onEditProfile}
            onJoinLeague={onJoinLeague}
            onCreateLeague={onCreateLeague}
          />
        ) : null}
      </View>
      <View style={styles.tabDock}>
        <TabBar active={tab} onChange={setTab} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  body: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  tabDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
});
