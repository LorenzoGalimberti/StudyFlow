// services/DatabaseService.ts
import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  get, 
  update, 
  remove,
  query,
  orderByChild,
  limitToLast
} from 'firebase/database';
import { Nozione, DatabaseError } from '../types';

export class DatabaseService {
  private db = getDatabase();

  /**
   * Crea una nuova nozione nel database
   */
  async createNozione(nozioneData: Omit<Nozione, 'id'>): Promise<string> {
    try {
      const nozioniRef = ref(this.db, `nozioni/${nozioneData.userId}`);
      const newRef = push(nozioniRef);
      
      const nozioneCompleta: Nozione = {
        ...nozioneData,
        id: newRef.key!,
      };

      await set(newRef, nozioneCompleta);
      return newRef.key!;
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Recupera tutte le nozioni di un utente
   */
  async getNozioniByUser(userId: string): Promise<Nozione[]> {
    try {
      const nozioniRef = ref(this.db, `nozioni/${userId}`);
      const queryRef = query(nozioniRef, orderByChild('dataCreazione'));
      
      const snapshot = await get(queryRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const nozioni: Nozione[] = [];
      snapshot.forEach((child) => {
        nozioni.push(child.val());
      });

      // Ordina per data creazione (più recenti per prime)
      return nozioni.reverse();
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Recupera una specifica nozione
   */
  async getNozione(nozioneId: string, userId: string): Promise<Nozione | null> {
    try {
      const nozioneRef = ref(this.db, `nozioni/${userId}/${nozioneId}`);
      const snapshot = await get(nozioneRef);
      
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Aggiorna una nozione esistente
   */
  async updateNozione(
    nozioneId: string, 
    updates: Partial<Nozione>, 
    userId: string
  ): Promise<void> {
    try {
      const nozioneRef = ref(this.db, `nozioni/${userId}/${nozioneId}`);
      await update(nozioneRef, updates);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Elimina una nozione
   */
  async deleteNozione(nozioneId: string, userId: string): Promise<void> {
    try {
      const nozioneRef = ref(this.db, `nozioni/${userId}/${nozioneId}`);
      await remove(nozioneRef);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Recupera le nozioni più recenti con limite
   */
  async getRecentNozioni(userId: string, limit: number = 10): Promise<Nozione[]> {
    try {
      const nozioniRef = ref(this.db, `nozioni/${userId}`);
      const queryRef = query(
        nozioniRef, 
        orderByChild('dataCreazione'), 
        limitToLast(limit)
      );
      
      const snapshot = await get(queryRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const nozioni: Nozione[] = [];
      snapshot.forEach((child) => {
        nozioni.push(child.val());
      });

      return nozioni.reverse();
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Conta il numero di nozioni dell'utente
   */
  async countNozioniByUser(userId: string): Promise<number> {
    try {
      const nozioniRef = ref(this.db, `nozioni/${userId}`);
      const snapshot = await get(nozioniRef);
      
      return snapshot.exists() ? snapshot.size : 0;
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Verifica la connessione al database
   */
  async testConnection(): Promise<boolean> {
    try {
      const testRef = ref(this.db, '.info/connected');
      const snapshot = await get(testRef);
      return snapshot.val() === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Salva statistiche utente (per analytics future)
   */
  async saveUserStats(
    userId: string, 
    stats: {
      totalNozioni: number;
      ripassiCompletati: number;
      ultimoAccesso: string;
    }
  ): Promise<void> {
    try {
      const statsRef = ref(this.db, `stats/${userId}`);
      await set(statsRef, {
        ...stats,
        aggiornato: new Date().toISOString(),
      });
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Gestisce gli errori del database Firebase
   */
  private handleDatabaseError(error: any): DatabaseError {
    let message: string;
    
    // Firebase Database non ha un tipo DatabaseError specifico
    // Gestiamo gli errori basandoci su code o message
    const errorCode = error?.code || 'UNKNOWN_ERROR';

    switch (errorCode) {
      case 'PERMISSION_DENIED':
        message = 'Accesso negato. Verifica i permessi.';
        break;
      case 'NETWORK_ERROR':
        message = 'Errore di connessione. Verifica la tua connessione internet.';
        break;
      case 'DISCONNECTED':
        message = 'Connessione al database interrotta.';
        break;
      case 'EXPIRED_TOKEN':
        message = 'Sessione scaduta. Effettua nuovamente il login.';
        break;
      case 'INVALID_TOKEN':
        message = 'Token di autenticazione non valido.';
        break;
      case 'MAX_RETRIES':
        message = 'Numero massimo di tentativi raggiunto.';
        break;
      default:
        message = error?.message ? `Errore database: ${error.message}` : 'Errore database sconosciuto';
    }

    return {
      code: errorCode,
      message,
      details: error
    };
  }

  /**
   * Abilita persistence offline (da chiamare una volta all'avvio)
   */
  async enableOfflineSupport(): Promise<void> {
    try {
      // Firebase Realtime Database ha già supporto offline automatico
      // Questo metodo può essere usato per configurazioni aggiuntive
      console.log('Offline support enabled');
    } catch (error) {
      console.warn('Could not enable offline support:', error);
    }
  }
}
