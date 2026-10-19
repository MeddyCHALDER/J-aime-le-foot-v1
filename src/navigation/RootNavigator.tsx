import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import type { AppStackParamList, AuthStackParamList } from './types';
import { useAuth } from '../features/auth/hooks';
import { signIn, signUp, signOut } from '../features/auth/api';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../features/auth/ForgotPasswordScreen';
import { UpdatePasswordScreen } from '../features/auth/UpdatePasswordScreen';
import { BrandSplash } from '../features/auth/components/BrandSplash';
import { LeagueListScreen } from '../features/leagues/components/LeagueListScreen';
import { CreateLeagueScreen } from '../features/leagues/components/CreateLeagueScreen';
import { JoinLeagueScreen } from '../features/leagues/components/JoinLeagueScreen';
import { LeagueDetailScreen } from '../features/leagues/components/LeagueDetailScreen';
import { CreateSeasonScreen } from '../features/leagues/components/CreateSeasonScreen';
import { CreateMatchScreen } from '../features/matches/components/CreateMatchScreen';
import { MatchDetailScreen } from '../features/matches/components/MatchDetailScreen';
import { PlayerProfileScreen } from '../features/profiles/components/PlayerProfileScreen';
import { brand } from '../theme/brand';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
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
      screenOptions={{
        headerShown: true,
        headerTintColor: '#000',
      }}
    >
      <AppStack.Screen
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
            onMyProfile={() => props.navigation.navigate('PlayerProfile', { playerId: userId })}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="CreateLeague" options={{ title: 'Créer une ligue' }}>
        {(props) => (
          <CreateLeagueScreen
            onSuccess={(leagueId) => {
              props.navigation.replace('LeagueDetail', { leagueId });
            }}
            onCancel={() => props.navigation.goBack()}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="JoinLeague" options={{ title: 'Rejoindre' }}>
        {(props) => (
          <JoinLeagueScreen
            onSuccess={(leagueId) => {
              props.navigation.replace('LeagueDetail', { leagueId });
            }}
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

  if (passwordRecovery) {
    return (
      <UpdatePasswordScreen
        onDone={() => {
          clearPasswordRecovery();
        }}
      />
    );
  }

  // Navigateurs séparés : dès qu’il y a une session, on quitte complètement l’auth
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
