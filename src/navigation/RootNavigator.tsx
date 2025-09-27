// navigation/RootNavigator.tsx - FIXED NAVIGATION REF SETUP
import React, { useEffect, useState } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, Text, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotionDetailScreen } from '../screens/app/NotionDetailScreen';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/app/HomeScreen';
import { ProfileScreen } from '../screens/app/ProfileScreen';
import { AddNotionScreen } from '../screens/app/AddNotionScreen';
import { ReviewScreen } from '../screens/app/ReviewScreen';
import { EditNotionScreen } from '../screens/app/EditNotionScreen';
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
  NotionDetail: { nozioneId: string };
  EditNotion: { 
    nozioneId: string;
    handleSave?: () => void;
    handleCancel?: () => void;
    hasChanges?: () => boolean;
    isValid?: boolean;
  };
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
 * Header Save Button Component per EditNotionScreen
 */
const HeaderSaveButton: React.FC<{ 
  route: any; 
  navigation: any; 
}> = ({ route }) => {
  const [isLoading, setIsLoading] = useState(false);
  const params = route.params || {};
  
  const handleSave = async () => {
    if (!params.handleSave || !params.isValid) return;
    
    setIsLoading(true);
    try {
      await params.handleSave();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleSave}
      disabled={isLoading || !params.isValid}
      style={[
        styles.headerButton,
        (!params.isValid || isLoading) && styles.headerButtonDisabled
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#3B82F6" />
      ) : (
        <Text style={[
          styles.headerButtonText,
          (!params.isValid || isLoading) && styles.headerButtonTextDisabled
        ]}>
          Salva
        </Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Header Back Button Component per EditNotionScreen
 */
const HeaderBackButton: React.FC<{ 
  route: any; 
  navigation: any; 
}> = ({ route, navigation }) => {
  const params = route.params || {};
  
  const handleBack = () => {
    if (params.handleCancel) {
      params.handleCancel();
    } else {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity
      onPress={handleBack}
      style={styles.headerButton}
    >
      <Text style={styles.backButtonText}>‹</Text>
    </TouchableOpacity>
  );
};

/**
 * Stack Navigator per l'autenticazione
 */
const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F3F4F6' },
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
 * Tab Navigator principale dell'app con safe area
 */
const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <AppTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8), // Dynamic bottom padding
          height: 60 + Math.max(insets.bottom, 8), // Dynamic height
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <AppTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Nozioni',
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
        cardStyle: { backgroundColor: '#F3F4F6' },
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
      <AppStack.Screen
        name="NotionDetail"
        component={NotionDetailScreen}
        options={{
          presentation: 'card',
          headerShown: true,
          headerTitle: 'Dettagli Nozione',
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
        name="EditNotion"
        component={EditNotionScreen}
        options={({ navigation, route }) => ({
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Modifica Nozione',
          headerStyle: {
            backgroundColor: '#FFFFFF',
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
            color: '#1F2937',
          },
          headerLeft: () => (
            <HeaderBackButton route={route} navigation={navigation} />
          ),
          headerRight: () => (
            <HeaderSaveButton route={route} navigation={navigation} />
          ),
          // Rimuove il default back button
          headerBackTitleVisible: false,
          headerLeftContainerStyle: {
            paddingLeft: 16,
          },
          headerRightContainerStyle: {
            paddingRight: 16,
          },
        })}
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
 * Navigation Container principale dell'app con deep linking - FIXED
 */
export const AppNavigationContainer: React.FC = () => {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    // FIXED: Setup del navigation ref quando il container è pronto
    const setupNotificationLinking = () => {
      const notificationLinking = NotificationLinking.getInstance();
      notificationLinking.setNavigationRef(navigationRef);
      console.log('✅ Navigation ref connected to NotificationLinking');
    };

    // Se il navigation è già pronto, configura subito
    if (navigationRef.isReady()) {
      setupNotificationLinking();
      return; // ✅ FIX: Aggiunto return esplicito
    } else {
      // Altrimenti aspetta che sia pronto
      const unsubscribe = navigationRef.addListener('state', () => {
        if (navigationRef.isReady()) {
          setupNotificationLinking();
          unsubscribe(); // Rimuove il listener dopo la prima configurazione
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [navigationRef]);

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
    backgroundColor: '#F3F4F6',
  },
  // Header Button Styles
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  headerButtonTextDisabled: {
    color: '#9CA3AF',
  },
  backButtonText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#3B82F6',
    marginLeft: -4,
  },
});
