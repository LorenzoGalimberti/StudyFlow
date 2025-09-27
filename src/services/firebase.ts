// src/services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { 
  initializeAuth, 
  getAuth,
  Auth,

} from 'firebase/auth';
import { Platform } from 'react-native';
import { firebaseConfig } from './firebase-config';

// Inizializza Firebase
export const app = initializeApp(firebaseConfig);

// Inizializza servizi
export const database: Database = getDatabase(app);

// Configurazione Auth con persistenza appropriata per ogni piattaforma
export const auth: Auth = (() => {
  if (Platform.OS === 'web') {
    // Su web usa la persistenza browser standard
    const authInstance = getAuth(app);
    // Opzionale: configurare la persistenza se necessario
    // setPersistence(authInstance, browserLocalPersistence);
    return authInstance;
  } else {
    // Su mobile usa AsyncStorage (importato dinamicamente)
    const { getReactNativePersistence } = require('firebase/auth');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
})();

// Test di connessione
export const testFirebaseConnection = (): boolean => {
  try {
    return app.options.projectId !== undefined;
  } catch (error) {
    console.error('Errore connessione Firebase:', error);
    return false;
  }
};

console.log(`Firebase inizializzato per ${Platform.OS}:`, app.options.projectId);