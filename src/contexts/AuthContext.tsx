// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthService } from '../services/AuthService';
import { User, AuthState } from '../types';
import { ErrorHandler, LoadingStateManager } from '../utils/errorHandling';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuthState: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true, // Inizia con loading true per check iniziale
    isAuthenticated: false,
  });
  
  const [error, setError] = useState<string | null>(null);
  const authService = new AuthService();
  const loadingManager = new LoadingStateManager();

  // Effetto per monitorare cambiamenti stato auth
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user: User | null) => {
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: user !== null,
      });
      
      // Pulisci errori quando lo stato cambia con successo
      if (user) {
        setError(null);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Effettua il login con email e password
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    return await loadingManager.execute(
      'login',
      async () => {
        setError(null);
        
        const user = await authService.login(email, password);
        
        // Lo stato verrà aggiornato automaticamente dall'onAuthStateChange
        return user;
      },
      () => {
        // onSuccess - non serve fare nulla, lo stato si aggiorna automaticamente
      },
      (appError) => {
        // onError
        setError(appError.message);
        ErrorHandler.logError(appError, 'AuthContext.login');
      }
    ).then(result => result !== null);
  };

  /**
   * Registrazione utente
   */
  const register = async (email: string, password: string): Promise<boolean> => {
    return await loadingManager.execute(
      'register',
      async () => {
        setError(null);
        
        const user = await authService.register(email, password);
        
        return user;
      },
      () => {
        // onSuccess - stato si aggiorna automaticamente
      },
      (appError) => {
        // onError
        setError(appError.message);
        ErrorHandler.logError(appError, 'AuthContext.register');
      }
    ).then(result => result !== null);
  };

  /**
   * Effettua il logout
   */
  const logout = async (): Promise<void> => {
    await loadingManager.execute(
      'logout',
      async () => {
        await authService.logout();
        setError(null);
      },
      () => {
        // onSuccess - stato si aggiorna automaticamente
      },
      (appError) => {
        // onError
        setError(appError.message);
        ErrorHandler.logError(appError, 'AuthContext.logout');
      }
    );
  };

  /**
   * Forza refresh dello stato auth (utile dopo errori di rete)
   */
  const refreshAuthState = (): void => {
    const currentUser = authService.getCurrentUser();
    setAuthState({
      user: currentUser,
      isLoading: false,
      isAuthenticated: currentUser !== null,
    });
  };

  /**
   * Pulisce gli errori
   */
  const clearError = (): void => {
    setError(null);
  };

  // Aggiorna lo stato di loading per operazioni auth
  const updatedAuthState: AuthState = {
    ...authState,
    isLoading: authState.isLoading || loadingManager.isLoading('login') || 
               loadingManager.isLoading('register') || loadingManager.isLoading('logout'),
  };

  const contextValue: AuthContextType = {
    ...updatedAuthState,
    login,
    register,
    logout,
    refreshAuthState,
    error,
    clearError,
  };

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

/**
 * HOC per proteggere componenti che richiedono autenticazione
 */
export const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      // Qui potresti renderizzare un loading component
      return null;
    }

    if (!isAuthenticated) {
      // Qui potresti navigare al login o renderizzare un messaggio
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};

/**
 * Hook per verificare se l'utente ha permessi specifici
 */
export const useAuthGuard = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    user,
    canAccess: (requiredAuth: boolean = true) => {
      if (requiredAuth) {
        return isAuthenticated && user !== null;
      }
      return true;
    },
    getUserId: (): string | null => {
      return user?.uid || null;
    },
  };
};
