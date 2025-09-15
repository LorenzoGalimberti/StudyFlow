// Tipi principali dell'applicazione

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

export interface Nozione {
  id: string;
  userId: string;
  domanda: string;
  risposta: string;
  dataCreazione: Date;
  prossimiRipassi: Date[];
  ripassiCompletati: number;
  attiva: boolean;
}

export interface NotificationData {
  notionId: string;
  title: string;
  body: string;
  scheduledFor: Date;
}

// Tipi per React Navigation
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  AddNotion: undefined;
  Review: { notionId: string };
};

// Tipi per i componenti
export interface NotionCardProps {
  notion: Nozione;
  onPress: () => void;
  showReviewStatus?: boolean;
}

export interface AddNotionFormData {
  domanda: string;
  risposta: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Tipi per Form Validation
export interface FormErrors {
  domanda?: string;
  risposta?: string;
  email?: string;
  password?: string;
}

// Tipi per Expo Notifications
export interface ScheduledNotification {
  identifier: string;
  notionId: string;
  triggerDate: Date;
}

// Tipi per Auth Context
export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}