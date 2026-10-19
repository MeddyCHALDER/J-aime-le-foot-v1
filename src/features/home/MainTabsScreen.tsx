import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { TabBar, useTabBarHeight, type PlayerTab } from '../../components/TabBar';
import { useAppTheme } from '../../theme/ThemeContext';
import { MatchesTabScreen } from './MatchesTabScreen';
import { VotesTabScreen } from './VotesTabScreen';
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
  const tabBarHeight = useTabBarHeight();

  return (
    <View style={[styles.root, { backgroundColor: tokens.ink }]}>
      <View
        style={[
          styles.body,
          Platform.OS === 'web'
            ? ({
                paddingBottom: `calc(76px + env(safe-area-inset-bottom, 0px))`,
              } as object)
            : { paddingBottom: tabBarHeight },
        ]}
      >
        {tab === 'matches' ? (
          <MatchesTabScreen
            onMatchPress={onMatchPress}
            onCreateLeague={onCreateLeague}
            onJoinLeague={onJoinLeague}
            onCreateMatch={onCreateMatch}
          />
        ) : null}
        {tab === 'votes' ? <VotesTabScreen /> : null}
        {tab === 'profile' ? (
          <ProfileTabScreen
            onEditProfile={onEditProfile}
            onJoinLeague={onJoinLeague}
            onCreateLeague={onCreateLeague}
          />
        ) : null}
      </View>
      <View style={styles.tabDock} pointerEvents="box-none">
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
