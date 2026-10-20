import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { TabBar, useTabBarHeight, type PlayerTab } from '../../components/TabBar';
import { useAppTheme } from '../../theme/ThemeContext';
import { MatchesTabScreen } from './MatchesTabScreen';
import { VotesTabScreen } from './VotesTabScreen';
import { ProfileTabScreen } from './ProfileTabScreen';
import { useNotificationOpener } from '../notifications/hooks';
import { useAuth } from '../auth/hooks';
import { InstallGuide } from '../onboarding/InstallGuide';
import { FadeSwap } from '../../ui/Motion';
import { takePendingJoin } from '../leagues/invite';
import { useJoinLeagueByCode } from '../leagues/hooks';
import { toErrorMessage } from '../../lib/errors';
import { fonts } from '../../theme/brand';
import { installGuideSeen, isStandalone, markInstallGuideSeen } from '../../lib/install';

interface MainTabsScreenProps {
  onMatchPress: (matchId: string) => void;
  onCreateLeague: () => void;
  onJoinLeague: () => void;
  onCreateMatch: (leagueId: string, seasonId: string) => void;
  onEditProfile: () => void;
  onAwardPress: (awardId: string, leagueId: string) => void;
  onManagePlayers: (leagueId: string) => void;
}

export function MainTabsScreen({
  onMatchPress,
  onCreateLeague,
  onJoinLeague,
  onCreateMatch,
  onEditProfile,
  onAwardPress,
  onManagePlayers,
}: MainTabsScreenProps) {
  const [tab, setTab] = useState<PlayerTab>('matches');
  const { tokens } = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  // Web mobile : dock fixé au bas de l'écran (pas du conteneur), insensible aux écarts de hauteur iOS.
  // Sur grand écran, il reste dans le cadre téléphone centré de l'AppShell.
  const { width } = useWindowDimensions();
  const fixedDock = Platform.OS === 'web' && width < 640;

  // Tuto d'installation : à la première connexion sur cet appareil, si l'app n'est pas déjà installée.
  const { user } = useAuth();
  const [installGuide, setInstallGuide] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web' && user?.id && !isStandalone() && !installGuideSeen(user.id)) {
      setInstallGuide(true);
    }
  }, [user?.id]);
  // Lien d'invitation ouvert (avant ou après connexion) : on rejoint la ligue une fois connecté
  const join = useJoinLeagueByCode();
  const [joinBanner, setJoinBanner] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    const code = takePendingJoin();
    if (!code) return;
    join.mutate(code, {
      onSuccess: () => {
        setTab('matches');
        setJoinBanner({ ok: true, text: 'Demande envoyée ! L’admin doit accepter ta venue.' });
      },
      onError: (e) => setJoinBanner({ ok: false, text: toErrorMessage(e) }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule tentative par connexion
  }, [user?.id]);
  useEffect(() => {
    if (!joinBanner) return;
    const t = setTimeout(() => setJoinBanner(null), 5000);
    return () => clearTimeout(t);
  }, [joinBanner]);

  const closeInstallGuide = () => {
    if (user?.id) markInstallGuideSeen(user.id);
    setInstallGuide(false);
  };

  useNotificationOpener((target) => {
    if (target.screen === 'match') onMatchPress(target.matchId);
    else if (target.screen === 'award') onAwardPress(target.awardId, target.leagueId);
    else setTab('votes');
  });

  return (
    <View style={[styles.root, { backgroundColor: tokens.ink }]}>
      <View
        style={[
          styles.body,
          Platform.OS === 'web'
            ? ({
                paddingBottom: `calc(58px + max(18px, env(safe-area-inset-bottom, 0px)))`,
              } as object)
            : { paddingBottom: tabBarHeight },
        ]}
      >
        {/* key = onglet : l'animation rejoue à chaque changement d'onglet */}
        <FadeSwap key={tab}>
        {tab === 'matches' ? (
          <MatchesTabScreen
            onMatchPress={onMatchPress}
            onCreateLeague={onCreateLeague}
            onJoinLeague={onJoinLeague}
            onCreateMatch={onCreateMatch}
          />
        ) : null}
        {tab === 'votes' ? <VotesTabScreen onAwardPress={onAwardPress} /> : null}
        {tab === 'profile' ? (
          <ProfileTabScreen
            onEditProfile={onEditProfile}
            onJoinLeague={onJoinLeague}
            onCreateLeague={onCreateLeague}
            onOpenInstallGuide={() => setInstallGuide(true)}
            onManagePlayers={onManagePlayers}
          />
        ) : null}
        </FadeSwap>
      </View>
      <View style={[styles.tabDock, fixedDock && styles.tabDockFixed]} pointerEvents="box-none">
        <TabBar active={tab} onChange={setTab} />
      </View>
      {joinBanner ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: joinBanner.ok ? tokens.lime : tokens.errorBg },
          ]}
          accessibilityLiveRegion="polite"
        >
          <Text
            style={[
              styles.bannerText,
              { color: joinBanner.ok ? tokens.onLime : tokens.errorText, fontFamily: fonts.body },
            ]}
          >
            {joinBanner.text}
          </Text>
        </View>
      ) : null}
      {installGuide ? <InstallGuide onClose={closeInstallGuide} /> : null}
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
  banner: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 40,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  tabDockFixed: {
    position: 'fixed' as 'absolute',
    maxWidth: 440,
    marginHorizontal: 'auto',
  },
});
