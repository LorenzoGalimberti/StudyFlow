// App.tsx
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';

// Firebase initialization
import './src/services/firebase';

// Providers e Navigation
import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigationContainer } from './src/navigation/RootNavigator';

// Services initialization
import { NotificationService } from './src/services/NotificationService';
import { DatabaseService } from './src/services/DatabaseService';
import { NotificationLinking } from './src/services/NotificationLinking';

export default function App() {
  
  useEffect(() => {
    // Initialize services
    initializeApp();
    
    // Ignore specific warnings in development
    if (__DEV__) {
      LogBox.ignoreLogs([
        'Setting a timer',
        'AsyncStorage has been extracted',
        'Remote debugger',
        'expo-notifications',
      ]);
    }
  }, []);

  /**
   * Initialize app services
   */
  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing StudyFlow...');

      // Initialize notification service
      const notificationService = NotificationService.getInstance();
      const notificationInitialized = await notificationService.initialize();
      
      if (notificationInitialized) {
        console.log('✅ Notifications initialized');
      } else {
        console.warn('⚠️ Notifications not available');
      }

      // Initialize notification linking
      const notificationLinking = NotificationLinking.getInstance();
      notificationLinking.initialize();
      console.log('✅ Notification linking initialized');

      // Handle app opened from notification (when app was closed)
      await notificationLinking.handleInitialNotification();

      // Enable offline support for database
      const databaseService = new DatabaseService();
      await databaseService.enableOfflineSupport();
      console.log('✅ Database offline support enabled');

      // Test database connection
      const isConnected = await databaseService.testConnection();
      if (isConnected) {
        console.log('✅ Firebase Database connected');
      } else {
        console.warn('⚠️ Firebase Database connection issues');
      }

      console.log('🎉 StudyFlow services initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing StudyFlow services:', error);
    }
  };

  return (
    <>
      <StatusBar style="auto" />
      <AuthProvider>
        <AppNavigationContainer />
      </AuthProvider>
    </>
  );
}
