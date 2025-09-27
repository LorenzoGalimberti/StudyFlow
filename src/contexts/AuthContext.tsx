// contexts/AuthContext.tsx - VERSIONE SEMPLIFICATA
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthService } from '../services/AuthService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Stati semplificati
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // INIZIA CON TRUE!
  const [error, setError] = useState<string | null>(null);
  
  const authService = new AuthService();

  // Effetto UNICO per monitorare Firebase Auth
  useEffect(() => {
    console.log('🔧 AuthContext: Setting up auth listener');
    
    const unsubscribe = authService.onAuthStateChange((firebaseUser: User | null) => {
      console.log('🔄 AuthContext: Auth state changed:', firebaseUser?.email || 'null');
      setUser(firebaseUser);
      setIsLoading(false); // SOLO QUI DIVENTA FALSE!
      
      // Pulisci errori quando auth ha successo
      if (firebaseUser) {
        setError(null);
      }
    });

    return unsubscribe;
  }, []); // ARRAY VUOTO = ESEGUE UNA SOLA VOLTA

  /**
   * Login semplificato
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      console.log('🔑 AuthContext: Starting login...');
      
      await authService.login(email, password);
      // Lo stato si aggiorna automaticamente tramite onAuthStateChange
      
      console.log('✅ AuthContext: Login completed');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore di login';
      console.log('❌ AuthContext: Login failed:', message);
      setError(message);
      return false;
    }
  };

  /**
   * Register semplificato
   */
  const register = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      console.log('📝 AuthContext: Starting registration...');
      
      await authService.register(email, password);
      // Lo stato si aggiorna automaticamente tramite onAuthStateChange
      
      console.log('✅ AuthContext: Registration completed');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore di registrazione';
      console.log('❌ AuthContext: Registration failed:', message);
      setError(message);
      return false;
    }
  };

  /**
   * Logout semplificato
   */
  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 AuthContext: Starting logout...');
      await authService.logout();
      setError(null);
      console.log('✅ AuthContext: Logout completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore di logout';
      console.log('❌ AuthContext: Logout failed:', message);
      setError(message);
    }
  };

  /**
   * Pulisce gli errori
   */
  const clearError = (): void => {
    setError(null);
  };

  // Context value semplificato
  const contextValue: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
    error,
    clearError,
  };

  // Debug logging
  console.log('🔍 AuthContext render:', {
    user: user?.email || 'null',
    isAuthenticated: user !== null,
    isLoading
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook per usare il context di autenticazione
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve essere usato all\'interno di AuthProvider');
  }
  
  return context;
};
