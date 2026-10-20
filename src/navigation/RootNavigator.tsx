import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { AppStackParamList, AuthStackParamList } from './types';
import { useAuth } from '../features/auth/hooks';
import { signIn, signUp, userMustChangePassword } from '../features/auth/api';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../features/auth/ForgotPasswordScreen';
import { UpdatePasswordScreen } from '../features/auth/UpdatePasswordScreen';
import { BrandSplash } from '../features/auth/components/BrandSplash';
import { MainTabsScreen } from '../features/home/MainTabsScreen';
import { CreateLeagueScreen } from '../features/leagues/components/CreateLeagueScreen';
import { JoinLeagueScreen } from '../features/leagues/components/JoinLeagueScreen';
import { CreateSeasonScreen } from '../features/leagues/components/CreateSeasonScreen';
import { CreateMatchScreen } from '../features/matches/components/CreateMatchScreen';
import { MatchDetailScreen } from '../features/matches/components/MatchDetailScreen';
import { AwardVoteScreen } from '../features/awards/components/AwardVoteScreen';
import { LeagueMembersScreen } from '../features/members/LeagueMembersScreen';
import { PlayerProfileScreen } from '../features/profiles/components/PlayerProfileScreen';
import { LeagueDetailScreen } from '../features/leagues/components/LeagueDetailScreen';
import { brand } from '../theme/brand';
import { PageTransition } from '../ui/Motion';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { flex: 1, backgroundColor: brand.ink } }}
    >
      <AuthStack.Screen name="Login">
        {(props) => (
          <LoginScreen
            onLogin={async (email, password) => {
              await signIn(email, password);
            }}
            onGoToRegister={() => props.navigation.navigate('Register')}
            onGoToForgotPassword={() => props.navigation.navigate('ForgotPassword')}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register">
        {(props) => (
          <RegisterScreen
            onRegister={async (email, password, displayName) => {
              await signUp(email, password, displayName);
            }}
            onGoToLogin={() => props.navigation.navigate('Login')}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="ForgotPassword">
        {(props) => (
          <ForgotPasswordScreen
            initialEmail={props.route.params?.email}
            onGoToLogin={() => props.navigation.navigate('Login')}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="UpdatePassword">
        {() => <UpdatePasswordScreen onDone={() => undefined} />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function AppNavigator({ userId }: { userId: string }) {
  return (
    <AppStack.Navigator
      // Chaque page poussée arrive en glissant (native-stack n'anime pas les pages sur le web)
      screenLayout={({ children }) => <PageTransition>{children}</PageTransition>}
      screenOptions={{
        headerShown: true,
        headerTintColor: brand.lime,
        headerStyle: { backgroundColor: brand.ink },
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { flex: 1, backgroundColor: brand.ink },
      }}
    >
      <AppStack.Screen name="Main" options={{ headerShown: false }}>
        {(props) => (
          <MainTabsScreen
            onMatchPress={(matchId) => props.navigation.navigate('MatchDetail', { matchId })}
            onCreateLeague={() => props.navigation.navigate('CreateLeague')}
            onJoinLeague={() => props.navigation.navigate('JoinLeague')}
            onCreateMatch={(leagueId, seasonId) =>
              props.navigation.navigate('CreateMatch', { leagueId, seasonId })
            }
            onEditProfile={() => props.navigation.navigate('PlayerProfile', { playerId: userId })}
            onAwardPress={(awardId, leagueId) =>
              props.navigation.navigate('AwardVote', { awardId, leagueId })
            }
            onManagePlayers={(leagueId) => props.navigation.navigate('LeagueMembers', { leagueId })}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="CreateLeague" options={{ title: 'Créer une ligue' }}>
        {(props) => (
          <CreateLeagueScreen
            onSuccess={() => props.navigation.goBack()}
            onCancel={() => props.navigation.goBack()}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="JoinLeague" options={{ title: 'Rejoindre' }}>
        {(props) => (
          <JoinLeagueScreen
            onSuccess={() => props.navigation.goBack()}
            onCancel={() => props.navigation.goBack()}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="LeagueDetail" options={{ title: 'Ligue' }}>
        {(props) => (
          <LeagueDetailScreen
            leagueId={props.route.params.leagueId}
            onMatchPress={(matchId) => props.navigation.navigate('MatchDetail', { matchId })}
            onCreateSeason={() =>
              props.navigation.navigate('CreateSeason', { leagueId: props.route.params.leagueId })
            }
            onCreateMatch={(seasonId) =>
              props.navigation.navigate('CreateMatch', {
                leagueId: props.route.params.leagueId,
                seasonId,
              })
            }
            onPlayerPress={(playerId) => props.navigation.navigate('PlayerProfile', { playerId })}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="CreateSeason" options={{ title: 'Nouvelle saison' }}>
        {(props) => (
          <CreateSeasonScreen
            leagueId={props.route.params.leagueId}
            onSuccess={() => props.navigation.goBack()}
            onCancel={() => props.navigation.goBack()}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="CreateMatch" options={{ title: 'Nouveau match' }}>
        {(props) => (
          <CreateMatchScreen
            leagueId={props.route.params.leagueId}
            seasonId={props.route.params.seasonId}
            onSuccess={(matchId) => {
              props.navigation.replace('MatchDetail', { matchId });
            }}
            onCancel={() => props.navigation.goBack()}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="MatchDetail" options={{ title: 'Match' }}>
        {(props) => <MatchDetailScreen matchId={props.route.params.matchId} />}
      </AppStack.Screen>
      <AppStack.Screen name="LeagueMembers" options={{ title: 'Joueurs' }}>
        {(props) => <LeagueMembersScreen leagueId={props.route.params.leagueId} />}
      </AppStack.Screen>
      <AppStack.Screen name="AwardVote" options={{ title: 'Vote' }}>
        {(props) => (
          <AwardVoteScreen
            awardId={props.route.params.awardId}
            leagueId={props.route.params.leagueId}
            onDeleted={() => props.navigation.goBack()}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="PlayerProfile" options={{ title: 'Profil' }}>
        {(props) => (
          <PlayerProfileScreen
            playerId={props.route.params.playerId}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </AppStack.Screen>
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading, passwordRecovery, clearPasswordRecovery } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <BrandSplash onDone={() => setSplashDone(true)} />;
  }

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={brand.lime} size="large" />
      </View>
    );
  }

  const mustChangePassword = userMustChangePassword(user);

  if (passwordRecovery || mustChangePassword) {
    return (
      <UpdatePasswordScreen
        firstLogin={mustChangePassword && !passwordRecovery}
        onDone={() => {
          clearPasswordRecovery();
        }}
      />
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  return <AppNavigator userId={user.id} />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.ink,
  },
});
