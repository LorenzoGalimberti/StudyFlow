// navigation/RootNavigator.tsx
import React, { useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/app/HomeScreen';
import { ProfileScreen } from '../screens/app/ProfileScreen';
import { AddNotionScreen } from '../screens/app/AddNotionScreen';
import { ReviewScreen } from '../screens/app/ReviewScreen';
import { NotificationLinking } from '../services/NotificationLinking';

// Tipi per le schermate
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  AddNotion: undefined;
  Review: { nozioneId: string; giorno: number };
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const AppTab = createBottomTabNavigator<AppTabParamList>();
const AppStack = createStackNavigator<AppStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

/**
 * Stack Navigator per l'autenticazione
 */
const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F9FAFB' },
      }}
    >
      <AuthStack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          animationTypeForReplace: 'pop',
        }}
      />
      <AuthStack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{
          presentation: 'modal',
        }}
      />
    </AuthStack.Navigator>
  );
};

/**
 * Componente per le icone dei tab
 */
const TabIcon: React.FC<{ icon: string; color: string; size: number }> = ({ 
  icon, 
  color, 
  size 
}) => (
  <View style={[styles.tabIcon, { width: size, height: size }]}>
    <Text style={{ fontSize: size * 0.8, color, textAlign: 'center' }}>{icon}</Text>
  </View>
);

/**
 * Tab Navigator principale dell'app
 */
const MainTabNavigator: React.FC = () => {
  return (
    <AppTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <AppTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Le mie nozioni',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="📚" color={color} size={size} />
          ),
        }}
      />
      <AppTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="👤" color={color} size={size} />
          ),
        }}
      />
    </AppTab.Navigator>
  );
};

/**
 * Stack Navigator per l'app autenticata
 */
const AppNavigator: React.FC = () => {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F9FAFB' },
      }}
    >
      <AppStack.Screen
        name="MainTabs"
        component={MainTabNavigator}
      />
      <AppStack.Screen
        name="AddNotion"
        component={AddNotionScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Aggiungi Nozione',
          headerStyle: {
            backgroundColor: '#FFFFFF',
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
            color: '#1F2937',
          },
          headerTintColor: '#3B82F6',
        }}
      />
      <AppStack.Screen
        name="Review"
        component={ReviewScreen}
        options={{
          presentation: 'card',
          headerShown: true,
          headerTitle: 'Ripasso',
          headerStyle: {
            backgroundColor: '#FFFFFF',
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
            color: '#1F2937',
          },
          headerTintColor: '#3B82F6',
        }}
      />
    </AppStack.Navigator>
  );
};

/**
 * Loading Screen mostrato durante la verifica dell'autenticazione
 */
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3B82F6" />
  </View>
);

/**
 * Root Navigator con navigation guard
 */
const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen 
          name="App" 
          component={AppNavigator}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      ) : (
        <RootStack.Screen 
          name="Auth" 
          component={AuthNavigator}
          options={{
            animationTypeForReplace: 'pop',
          }}
        />
      )}
    </RootStack.Navigator>
  );
};

/**
 * Navigation Container principale dell'app con deep linking
 */
export const AppNavigationContainer: React.FC = () => {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    // Collega il navigation ref al sistema di deep linking
    const notificationLinking = NotificationLinking.getInstance();
    
    if (navigationRef?.isReady()) {
      notificationLinking.setNavigationRef(navigationRef);
      console.log('✅ Navigation ref connected to NotificationLinking');
    }
  }, [navigationRef]);

  // Effetto per riconnettere quando la navigazione è pronta
  useEffect(() => {
    const notificationLinking = NotificationLinking.getInstance();
    
    const checkAndConnect = () => {
      if (navigationRef?.isReady()) {
        notificationLinking.setNavigationRef(navigationRef);
      }
    };

    // Controlla periodicamente fino a quando la navigazione è pronta
    const interval = setInterval(checkAndConnect, 100);
    
    // Cleanup dopo 5 secondi
    setTimeout(() => clearInterval(interval), 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
