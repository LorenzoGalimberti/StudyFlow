// src/services/firebase.ts - Inizializzazione Firebase
import { initializeApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './firebase-config';

// Inizializza Firebase
export const app = initializeApp(firebaseConfig);

// Inizializza servizi
export const database: Database = getDatabase(app);
export const auth: Auth = getAuth(app);

// Test di connessione
export const testFirebaseConnection = (): boolean => {
  try {
    return app.options.projectId !== undefined;
  } catch (error) {
    console.error('Errore connessione Firebase:', error);
    return false;
  }
};

console.log('🔥 Firebase inizializzato:', app.options.projectId);

// Note: Firebase Auth per React Native persiste automaticamente lo stato
// usando il meccanismo nativo del dispositivo. Il warning è informativo
// ma non impedisce il funzionamento dell'app.