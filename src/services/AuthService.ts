// services/AuthService.ts
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';
import { auth } from './firebase'; // Import dell'istanza configurata
import { User } from '../types';

export class AuthService {
  private auth = auth; // Usa l'istanza con AsyncStorage configurata

  /**
   * Effettua il login con email e password
   */
  async login(email: string, password: string): Promise<User> {
    try {
      console.log('Attempting login for:', email);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('Login successful for:', userCredential.user.email);
      return this.formatUser(userCredential.user);
    } catch (error) {
      console.log('Login failed:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Registra un nuovo utente
   */
  async register(email: string, password: string): Promise<User> {
    try {
      console.log('Attempting registration for:', email);
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('Registration successful for:', userCredential.user.email);
      return this.formatUser(userCredential.user);
    } catch (error) {
      console.log('Registration failed:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Effettua il logout
   */
  async logout(): Promise<void> {
    try {
      console.log('Attempting logout');
      await signOut(this.auth);
      console.log('Logout successful');
    } catch (error) {
      console.log('Logout failed:', error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Ottiene l'utente corrente
   */
  getCurrentUser(): User | null {
    const firebaseUser = this.auth.currentUser;
    console.log('getCurrentUser called:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');
    return firebaseUser ? this.formatUser(firebaseUser) : null;
  }

  /**
   * Ascolta i cambiamenti dello stato di autenticazione
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    console.log('Setting up auth state listener');
    return onAuthStateChanged(this.auth, (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');
      const user = firebaseUser ? this.formatUser(firebaseUser) : null;
      callback(user);
    });
  }

  /**
   * Verifica se l'utente è autenticato
   */
  isAuthenticated(): boolean {
    const isAuth = this.auth.currentUser !== null;
    console.log('isAuthenticated called:', isAuth);
    return isAuth;
  }

  /**
   * Formatta l'utente Firebase nel nostro formato
   */
  private formatUser(firebaseUser: FirebaseUser): User {
    console.log('Formatting user:', firebaseUser.email);
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || undefined,
      createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
    };
  }

  /**
   * Gestisce gli errori di autenticazione Firebase
   */
  private handleAuthError(error: AuthError): Error {
    let message: string;

    switch (error.code) {
      case 'auth/user-not-found':
        message = 'Utente non trovato. Verifica l\'email inserita.';
        break;
      case 'auth/wrong-password':
        message = 'Password errata. Riprova.';
        break;
      case 'auth/email-already-in-use':
        message = 'Email già in uso. Prova con un\'altra email.';
        break;
      case 'auth/weak-password':
        message = 'Password troppo debole. Deve contenere almeno 6 caratteri.';
        break;
      case 'auth/invalid-email':
        message = 'Email non valida. Verifica il formato.';
        break;
      case 'auth/too-many-requests':
        message = 'Troppi tentativi. Riprova più tardi.';
        break;
      case 'auth/network-request-failed':
        message = 'Errore di connessione. Verifica la tua connessione internet.';
        break;
      case 'auth/user-disabled':
        message = 'Account disabilitato. Contatta il supporto.';
        break;
      default:
        message = 'Si è verificato un errore durante l\'autenticazione.';
    }

    console.log('Auth error handled:', error.code, '->', message);
    return new Error(message);
  }

  /**
   * Valida email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida password
   */
  static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (password.length < 6) {
      return { 
        isValid: false, 
        message: 'La password deve contenere almeno 6 caratteri' 
      };
    }
    
    return { isValid: true };
  }
}
