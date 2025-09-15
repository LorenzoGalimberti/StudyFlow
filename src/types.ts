// types.ts - Definizioni delle interfacce base per l'app

export interface Nozione {
  id: string;
  domanda: string;
  risposta: string;
  dataCreazione: string;
  ripassi: RipassoSchedule[];
  completato: boolean;
  userId: string;
}

export interface RipassoSchedule {
  giorno: number; // 1, 3, 7, 21
  dataRipasso: string;
  completato: boolean;
  dataCompletamento?: string;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface DatabaseResponse<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export interface NotificationPayload {
  nozioneId: string;
  giorno: number;
  title: string;
  body: string;
}

// Tipi per la validazione
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// Costanti per i giorni di ripasso
export const RIPASSO_GIORNI = [1, 3, 7, 21] as const;

// Tipi per gli stati dell'app
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Tipo personalizzato per errori database Firebase
export interface DatabaseError {
  code: string;
  message: string;
  details?: any;
}