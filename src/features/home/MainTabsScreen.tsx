import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
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

  return (
    <View style={[styles.root, { backgroundColor: tokens.ink }]}>
      <View style={styles.body}>
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
      <TabBar active={tab} onChange={setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, minHeight: 0 },
});
