// screens/app/HomeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { NozioneModel } from '../../models/Nozione';
import { Nozione } from '../../types';
import { ErrorHandler } from '../../utils/errorHandling';
// import { NotificationService } from '../../services/NotificationService';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [nozioni, setNozioni] = useState<Nozione[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nozioneModel = new NozioneModel();
  // const notificationService = NotificationService.getInstance();

  // Carica le nozioni all'avvio
  useEffect(() => {
    loadNozioni();
  }, []);

  // Focus listener per ricaricare quando si torna alla schermata
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadNozioni();
    });

    return unsubscribe;
  }, [navigation]);

  /**
   * Carica tutte le nozioni dell'utente
   */
  const loadNozioni = async () => {
    if (!user?.uid) {
      setError('Utente non autenticato');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const userNozioni = await nozioneModel.getAll(user.uid);
      setNozioni(userNozioni);
    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      setError(appError.message);
      ErrorHandler.logError(appError, 'HomeScreen.loadNozioni');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Gestisce il pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadNozioni();
    setIsRefreshing(false);
  }, []);

  /**
   * Naviga alla schermata per aggiungere una nuova nozione
   */
  const navigateToAddNotion = () => {
    navigation.navigate('AddNotion');
  };

  /**
   * Naviga alla schermata di ripasso
   */
  const navigateToReview = (nozioneId: string, giorno: number) => {
    navigation.navigate('Review', { nozioneId, giorno });
  };

  /**
   * Elimina una nozione con conferma
   */
  const deleteNozione = (nozione: Nozione) => {
    Alert.alert(
      'Elimina Nozione',
      `Sei sicuro di voler eliminare "${nozione.domanda}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => handleDeleteNozione(nozione),
        },
      ]
    );
  };

  /**
   * Gestisce l'eliminazione di una nozione
   */
  const handleDeleteNozione = async (nozione: Nozione) => {
    if (!user?.uid) return;

    try {
      await nozioneModel.delete(nozione.id, user.uid);
      // Ricarica la lista
      await loadNozioni();
    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      Alert.alert('Errore', appError.message);
      ErrorHandler.logError(appError, 'HomeScreen.deleteNozione');
    }
  };

  // /**
  //  * TEST: Invia una notifica di test immediata
  //  */
  // const handleTestNotification = async () => {
  //   try {
  //     // Verifica se le notifiche sono abilitate
  //     const hasPermissions = await notificationService.areNotificationsEnabled();
  //     if (!hasPermissions) {
  //       Alert.alert('Permessi', 'Per testare le notifiche, concedi i permessi nelle impostazioni.');
  //       return;
  //     }

  //     // Invia notifica di test immediata
  //     await notificationService.showTestNotification();

  //     Alert.alert(
  //       'Test Avviato! 🧪', 
  //       'Riceverai una notifica immediata.\n\nSe non la ricevi, controlla:\n• Permessi notifiche\n• Non disturbare disattivato\n• App in background'
  //     );
  //   } catch (error) {
  //     console.error('Errore test notifica:', error);
  //     Alert.alert('Errore', 'Impossibile inviare notifica di test');
  //   }
  // };

  // /**
  //  * TEST: Mostra tutte le notifiche programmate
  //  */
  // const handleShowScheduledNotifications = async () => {
  //   try {
  //     const scheduled = await notificationService.getScheduledNotifications();
      
  //     if (scheduled.length === 0) {
  //       Alert.alert('Notifiche', 'Nessuna notifica programmata al momento.');
  //       return;
  //     }

  //     const notificationList = scheduled.map((notif, index) => {
  //       const triggerDate = notif.trigger && 'date' in notif.trigger 
  //         ? new Date(notif.trigger.date).toLocaleString()
  //         : 'Immediata';
        
  //       return `${index + 1}. ${notif.content.title}\n   ⏰ ${triggerDate}`;
  //     }).join('\n\n');

  //     Alert.alert(
  //       `📋 Notifiche Programmate (${scheduled.length})`,
  //       notificationList,
  //       [{ text: 'OK' }]
  //     );
  //   } catch (error) {
  //     console.error('Errore lettura notifiche:', error);
  //     Alert.alert('Errore', 'Impossibile leggere le notifiche programmate');
  //   }
  // };

  /**
   * Calcola lo stato di una nozione (da ripassare, completata, etc.)
   */
  const getNozioneStatus = (nozione: Nozione): 'pending' | 'completed' | 'due' => {
    if (nozione.completato) return 'completed';

    const oggi = new Date();
    const hasPendingReview = nozione.ripassi.some(ripasso => {
      if (ripasso.completato) return false;
      const dataRipasso = new Date(ripasso.dataRipasso);
      return dataRipasso <= oggi;
    });

    return hasPendingReview ? 'due' : 'pending';
  };

  /**
   * Ottiene il prossimo ripasso per una nozione
   */
  const getNextReview = (nozione: Nozione) => {
    return nozioneModel.getNextRipasso(nozione);
  };

  /**
   * Ordina le nozioni per priorità di ripasso
   */
  const sortNozioniByPriority = (nozioni: Nozione[]): Nozione[] => {
    return [...nozioni].sort((a, b) => {
      const statusA = getNozioneStatus(a);
      const statusB = getNozioneStatus(b);
      
      // Priorità: due (3) > pending (2) > completed (1)
      const priority = { due: 3, pending: 2, completed: 1 };
      
      // Se hanno priorità diversa, ordina per priorità
      if (priority[statusA] !== priority[statusB]) {
        return priority[statusB] - priority[statusA];
      }
      
      // Se stessa priorità, ordina per data creazione (più recenti prime)
      return new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime();
    });
  };

  /**
   * Renderizza una singola nozione
   */
  const renderNozione = ({ item }: { item: Nozione }) => {
    const status = getNozioneStatus(item);
    const nextReview = getNextReview(item);
    const giornoAlProssimoRipasso = nozioneModel.getGiorniAlProssimoRipasso(item);

    return (
      <TouchableOpacity
        style={[styles.notionCard, styles[`${status}Card`]]}
        onPress={() => {
          if (status === 'due' && nextReview) {
            navigateToReview(item.id, nextReview.giorno);
          }
        }}
        onLongPress={() => deleteNozione(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.question} numberOfLines={2}>
            {item.domanda}
          </Text>
          <View style={[styles.statusBadge, styles[`${status}Badge`]]}>
            <Text style={styles.statusText}>
              {status === 'completed' && '✅'}
              {status === 'due' && '🔔'}
              {status === 'pending' && '📅'}
            </Text>
          </View>
        </View>

        <Text style={styles.answer} numberOfLines={3}>
          {item.risposta}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            Creata: {new Date(item.dataCreazione).toLocaleDateString()}
          </Text>
          
          {status === 'due' && nextReview && (
            <Text style={styles.reviewText}>
              Ripasso giorno {nextReview.giorno} - Tocca per ripassare
            </Text>
          )}
          
          {status === 'pending' && giornoAlProssimoRipasso >= 0 && (
            <Text style={styles.nextText}>
              Prossimo ripasso tra {giornoAlProssimoRipasso} giorni
            </Text>
          )}
          
          {status === 'completed' && (
            <Text style={styles.completedText}>
              Tutti i ripassi completati! 🎉
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Loading iniziale
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Caricamento nozioni...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Stato errore
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Errore</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadNozioni}>
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Le mie nozioni</Text>
        <Text style={styles.subtitle}>
          Ciao {user?.email?.split('@')[0]}! ({nozioni.length} nozioni)
        </Text>
      </View>

      {nozioni.length === 0 ? (
        // Empty state
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>Nessuna nozione ancora</Text>
          <Text style={styles.emptySubtitle}>
            Inizia aggiungendo la tua prima nozione da studiare
          </Text>
        </View>
      ) : (
        // Lista nozioni ordinata per priorità
        <FlatList
          data={sortNozioniByPriority(nozioni)}
          renderItem={renderNozione}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB Button principale */}
      <TouchableOpacity
        style={styles.fab}
        onPress={navigateToAddNotion}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Pulsanti di test - rimuovi in produzione */}
      {/* <TouchableOpacity
        style={[styles.fab, { bottom: 90, backgroundColor: '#F59E0B', width: 48, height: 48 }]}
        onPress={handleTestNotification}
      >
        <Text style={[styles.fabIcon, { fontSize: 20 }]}>🧪</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.fab, { bottom: 150, backgroundColor: '#10B981', width: 48, height: 48 }]}
        onPress={handleShowScheduledNotifications}
      >
        <Text style={[styles.fabIcon, { fontSize: 20 }]}>📋</Text>
      </TouchableOpacity> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100, // Spazio per FAB
  },
  notionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  dueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  question: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 12,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadge: {
    backgroundColor: '#DBEAFE',
  },
  dueBadge: {
    backgroundColor: '#FEF3C7',
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 16,
  },
  answer: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
  nextText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  completedText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});
