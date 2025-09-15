// utils/errorHandling.ts
import { AppError, LoadingState } from '../types';

export class ErrorHandler {
  
  /**
   * Crea un oggetto errore standardizzato
   */
  static createError(code: string, message: string, details?: any): AppError {
    return {
      code,
      message,
      details,
    };
  }

  /**
   * Gestisce errori Firebase generici
   */
  static handleFirebaseError(error: any): AppError {
    if (error?.code) {
      // Errori Firebase con codice
      return this.createError(
        error.code,
        this.getFirebaseErrorMessage(error.code),
        error
      );
    }

    if (error?.message) {
      // Errori con messaggio generico
      return this.createError(
        'UNKNOWN_ERROR',
        error.message,
        error
      );
    }

    // Errore sconosciuto
    return this.createError(
      'UNKNOWN_ERROR',
      'Si è verificato un errore imprevisto',
      error
    );
  }

  /**
   * Converte codici errore Firebase in messaggi user-friendly
   */
  private static getFirebaseErrorMessage(code: string): string {
    const messages: { [key: string]: string } = {
      // Auth errors
      'auth/user-not-found': 'Utente non trovato',
      'auth/wrong-password': 'Password errata',
      'auth/email-already-in-use': 'Email già registrata',
      'auth/weak-password': 'Password troppo debole',
      'auth/invalid-email': 'Email non valida',
      'auth/too-many-requests': 'Troppi tentativi, riprova più tardi',
      'auth/network-request-failed': 'Problemi di connessione',
      'auth/user-disabled': 'Account disabilitato',
      'auth/expired-action-code': 'Codice scaduto',
      'auth/invalid-action-code': 'Codice non valido',

      // Database errors
      'PERMISSION_DENIED': 'Accesso negato',
      'NETWORK_ERROR': 'Errore di rete',
      'DISCONNECTED': 'Connessione interrotta',
      'EXPIRED_TOKEN': 'Sessione scaduta',
      'INVALID_TOKEN': 'Token non valido',
      'MAX_RETRIES': 'Numero massimo di tentativi raggiunto',

      // Custom errors
      'VALIDATION_ERROR': 'Dati non validi',
      'NOZIONE_NOT_FOUND': 'Nozione non trovata',
      'USER_NOT_AUTHENTICATED': 'Utente non autenticato',
      'NOTIFICATION_PERMISSION_DENIED': 'Permessi notifiche negati',
    };

    return messages[code] || 'Si è verificato un errore';
  }

  /**
   * Gestisce errori di rete
   */
  static handleNetworkError(error: any): AppError {
    if (!navigator.onLine) {
      return this.createError(
        'NETWORK_OFFLINE',
        'Connessione internet non disponibile',
        error
      );
    }

    return this.createError(
      'NETWORK_ERROR',
      'Problema di connessione. Verifica la tua connessione internet.',
      error
    );
  }

  /**
   * Gestisce errori di validazione
   */
  static handleValidationError(field: string, message: string): AppError {
    return this.createError(
      'VALIDATION_ERROR',
      message,
      { field }
    );
  }

  /**
   * Log degli errori (per debug e analytics future)
   */
  static logError(error: AppError, context?: string): void {
    const logData = {
      timestamp: new Date().toISOString(),
      code: error.code,
      message: error.message,
      context: context || 'unknown',
      details: error.details,
    };

    // In development, stampa in console
    if (__DEV__) {
      console.error('App Error:', logData);
    }

    // In production, qui si potrebbe inviare a un servizio di logging
    // come Sentry, Firebase Crashlytics, etc.
  }

  /**
   * Verifica se un errore è recuperabile (può essere ritentato)
   */
  static isRecoverableError(error: AppError): boolean {
    const recoverableCodes = [
      'NETWORK_ERROR',
      'NETWORK_OFFLINE',
      'DISCONNECTED',
      'MAX_RETRIES',
      'auth/network-request-failed',
    ];

    return recoverableCodes.includes(error.code);
  }

  /**
   * Ottiene suggerimenti per risolvere l'errore
   */
  static getErrorSuggestion(error: AppError): string {
    const suggestions: { [key: string]: string } = {
      'NETWORK_ERROR': 'Verifica la connessione internet e riprova',
      'NETWORK_OFFLINE': 'Connettiti a internet e riprova',
      'auth/weak-password': 'Usa una password più sicura (min 6 caratteri)',
      'auth/email-already-in-use': 'Prova con un\'altra email o effettua il login',
      'auth/invalid-email': 'Verifica che l\'email sia scritta correttamente',
      'VALIDATION_ERROR': 'Controlla i dati inseriti',
      'PERMISSION_DENIED': 'Effettua nuovamente il login',
      'EXPIRED_TOKEN': 'Effettua nuovamente il login',
    };

    return suggestions[error.code] || 'Riprova più tardi';
  }
}

/**
 * Hook-like utility per gestire stati di loading
 */
export class LoadingStateManager {
  private states: Map<string, LoadingState> = new Map();
  private errors: Map<string, AppError | null> = new Map();

  /**
   * Imposta stato di loading
   */
  setLoading(key: string): void {
    this.states.set(key, 'loading');
    this.errors.set(key, null);
  }

  /**
   * Imposta stato di successo
   */
  setSuccess(key: string): void {
    this.states.set(key, 'success');
    this.errors.set(key, null);
  }

  /**
   * Imposta stato di errore
   */
  setError(key: string, error: AppError): void {
    this.states.set(key, 'error');
    this.errors.set(key, error);
  }

  /**
   * Reset stato a idle
   */
  setIdle(key: string): void {
    this.states.set(key, 'idle');
    this.errors.set(key, null);
  }

  /**
   * Ottiene lo stato corrente
   */
  getState(key: string): LoadingState {
    return this.states.get(key) || 'idle';
  }

  /**
   * Ottiene l'errore corrente
   */
  getError(key: string): AppError | null {
    return this.errors.get(key) || null;
  }

  /**
   * Verifica se è in stato di loading
   */
  isLoading(key: string): boolean {
    return this.getState(key) === 'loading';
  }

  /**
   * Verifica se è in stato di errore
   */
  isError(key: string): boolean {
    return this.getState(key) === 'error';
  }

  /**
   * Verifica se è in stato di successo
   */
  isSuccess(key: string): boolean {
    return this.getState(key) === 'success';
  }

  /**
   * Pulisce tutti gli stati
   */
  clear(): void {
    this.states.clear();
    this.errors.clear();
  }

  /**
   * Wrapper per eseguire operazioni async con gestione automatica degli stati
   */
  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: AppError) => void
  ): Promise<T | null> {
    try {
      this.setLoading(key);
      
      const result = await operation();
      
      this.setSuccess(key);
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      this.setError(key, appError);
      
      ErrorHandler.logError(appError, key);
      
      if (onError) {
        onError(appError);
      }
      
      return null;
    }
  }
}

/**
 * Utility per retry automatico
 */
export class RetryManager {
  
  /**
   * Esegue un'operazione con retry automatico
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    backoffMultiplier: number = 2
  ): Promise<T> {
    let lastError: any;
    let delay = delayMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const appError = ErrorHandler.handleFirebaseError(error);
        
        // Se l'errore non è recuperabile, non riprovare
        if (!ErrorHandler.isRecoverableError(appError)) {
          throw error;
        }

        // Se è l'ultimo tentativo, lancia l'errore
        if (attempt === maxRetries) {
          throw error;
        }

        // Attende prima del prossimo tentativo
        await this.delay(delay);
        delay *= backoffMultiplier;
      }
    }

    throw lastError;
  }

  /**
   * Utility per delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error Boundary React utility (da usare come hook)
 */
export const createErrorBoundary = (onError: (error: AppError) => void) => {
  return {
    componentDidCatch: (error: Error, errorInfo: any) => {
      const appError = ErrorHandler.createError(
        'COMPONENT_ERROR',
        error.message,
        { error, errorInfo }
      );
      
      ErrorHandler.logError(appError, 'ErrorBoundary');
      onError(appError);
    }
  };
};