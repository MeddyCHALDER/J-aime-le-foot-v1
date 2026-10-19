import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import type { RootStackParamList } from './types';
import { useAuth } from '../features/auth/hooks';
import { signIn, signUp, signOut } from '../features/auth/api';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { BrandSplash } from '../features/auth/components/BrandSplash';
import { LeagueListScreen } from '../features/leagues/components/LeagueListScreen';
import { CreateLeagueScreen } from '../features/leagues/components/CreateLeagueScreen';
import { JoinLeagueScreen } from '../features/leagues/components/JoinLeagueScreen';
import { LeagueDetailScreen } from '../features/leagues/components/LeagueDetailScreen';
import { CreateSeasonScreen } from '../features/leagues/components/CreateSeasonScreen';
import { CreateMatchScreen } from '../features/matches/components/CreateMatchScreen';
import { MatchDetailScreen } from '../features/matches/components/MatchDetailScreen';
import { PlayerProfileScreen } from '../features/profiles/components/PlayerProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <BrandSplash onDone={() => setSplashDone(true)} />;
  }

  if (loading) return null;

  return (
    <Stack.Navigator
      key={user ? 'app' : 'auth'}
      initialRouteName={user ? 'Main' : 'Login'}
      screenOptions={{ headerShown: true }}
    >
      <Stack.Screen name="Login" options={{ headerShown: false }}>
        {(props) => (
          <LoginScreen
            onLogin={async (email, password) => {
              await signIn(email, password);
            }}
            onGoToRegister={() => props.navigation.navigate('Register')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Register" options={{ headerShown: false }}>
        {(props) => (
          <RegisterScreen
            onRegister={async (email, password, displayName) => {
              await signUp(email, password, displayName);
            }}
            onGoToLogin={() => props.navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Main"
        options={{
          title: "J'aime le foot",
          headerLeft: () => (
            <TouchableOpacity onPress={() => signOut()} style={styles.headerButton}>
              <Text variant="labelMedium" style={styles.headerButtonText}>
                Déconnexion
              </Text>
            </TouchableOpacity>
          ),
        }}
      >
        {(props) => (
          <LeagueListScreen
            onLeaguePress={(leagueId) => props.navigation.navigate('LeagueDetail', { leagueId })}
            onCreateLeague={() => props.navigation.navigate('CreateLeague')}
            onJoinLeague={() => props.navigation.navigate('JoinLeague')}
            onMyProfile={() =>
              user?.id && props.navigation.navigate('PlayerProfile', { playerId: user.id })
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="CreateLeague" options={{ title: 'Créer une ligue' }}>
        {(props) => (
          <CreateLeagueScreen
            onSuccess={(leagueId) => {
              props.navigation.replace('LeagueDetail', { leagueId });
            }}
            onCancel={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="JoinLeague" options={{ title: 'Rejoindre' }}>
        {(props) => (
          <JoinLeagueScreen
            onSuccess={(leagueId) => {
              props.navigation.replace('LeagueDetail', { leagueId });
            }}
            onCancel={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="LeagueDetail" options={{ title: 'Ligue' }}>
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
            onPlayerPress={(playerId) =>
              props.navigation.navigate('PlayerProfile', { playerId })
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="CreateSeason" options={{ title: 'Nouvelle saison' }}>
        {(props) => (
          <CreateSeasonScreen
            leagueId={props.route.params.leagueId}
            onSuccess={() => props.navigation.goBack()}
            onCancel={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="CreateMatch" options={{ title: 'Nouveau match' }}>
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
      </Stack.Screen>
      <Stack.Screen name="MatchDetail" options={{ title: 'Match' }}>
        {(props) => <MatchDetailScreen matchId={props.route.params.matchId} />}
      </Stack.Screen>
      <Stack.Screen name="PlayerProfile" options={{ title: 'Profil' }}>
        {(props) => (
          <PlayerProfileScreen
            playerId={props.route.params.playerId}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    color: '#000000',
    fontWeight: '600',
  },
});
