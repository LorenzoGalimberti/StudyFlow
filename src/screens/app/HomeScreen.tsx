// screens/app/HomeScreen.tsx - Fixed TypeScript Errors
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { NozioneModel } from '../../models/Nozione';
import { Nozione } from '../../types';
import { ErrorHandler } from '../../utils/errorHandling';
import { analyticsService } from '../../services/AnalyticsService';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [nozioni, setNozioni] = useState<Nozione[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'due' | 'completed'>('all');

  const nozioneModel = new NozioneModel();

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
      // 📊 Traccia eliminazione PRIMA di eliminare
      await analyticsService.trackNozioneDeleted(nozione.id);
      
      await nozioneModel.delete(nozione.id, user.uid);
      await loadNozioni();
    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      Alert.alert('Errore', appError.message);
      ErrorHandler.logError(appError, 'HomeScreen.deleteNozione');
    }
  };

  /**
   * Calcola lo stato di una nozione
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
      
      const priority = { due: 3, pending: 2, completed: 1 };
      
      if (priority[statusA] !== priority[statusB]) {
        return priority[statusB] - priority[statusA];
      }
      
      return new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime();
    });
  };

  /**
   * Calcola statistiche per l'header
   */
  const getStats = () => {
    const dueCount = nozioni.filter(n => getNozioneStatus(n) === 'due').length;
    const completedCount = nozioni.filter(n => getNozioneStatus(n) === 'completed').length;
    
    return {
      total: nozioni.length,
      due: dueCount,
      completed: completedCount,
    };
  };

  /**
   * Gestisce il cambio di filtro quando si clicca sui contatori
   */
  const handleFilterChange = (filter: 'all' | 'due' | 'completed') => {
    setActiveFilter(filter);
  };

  /**
   * Filtra le nozioni in base al filtro attivo
   */
  const getFilteredNozioni = () => {
    const sortedNozioni = sortNozioniByPriority(nozioni);
    
    switch (activeFilter) {
      case 'due':
        return sortedNozioni.filter(n => getNozioneStatus(n) === 'due');
      case 'completed':
        return sortedNozioni.filter(n => getNozioneStatus(n) === 'completed');
      case 'all':
      default:
        return sortedNozioni;
    }
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
          } else {
            // Per tutte le altre nozioni, vai ai dettagli
            navigation.navigate('NotionDetail', { nozioneId: item.id });
          }
        }}
        onLongPress={() => deleteNozione(item)}
        activeOpacity={0.7}
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
            {new Date(item.dataCreazione).toLocaleDateString('it-IT')}
          </Text>
          
          {status === 'due' && nextReview && (
            <Text style={styles.reviewText}>
              Ripasso giorno {nextReview.giorno} - Tocca per ripassare
            </Text>
          )}
          
          {status === 'pending' && giornoAlProssimoRipasso >= 0 && (
            <Text style={styles.nextText}>
              Prossimo ripasso tra {giornoAlProssimoRipasso} {giornoAlProssimoRipasso === 1 ? 'giorno' : 'giorni'}
            </Text>
          )}
          
          {status === 'completed' && (
            <Text style={styles.completedText}>
              Ripassi completati!
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const stats = getStats();

  // Loading iniziale
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Errore</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={loadNozioni}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Nozioni</Text>
          </View>
        </View>

        {/* Interactive Stats Row */}
        {nozioni.length > 0 && (
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={[
                styles.statItem, 
                activeFilter === 'all' && styles.statItemActive
              ]}
              onPress={() => handleFilterChange('all')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.statNumber, 
                activeFilter === 'all' && styles.statNumberActive
              ]}>
                {stats.total}
              </Text>
              <Text style={[
                styles.statLabel,
                activeFilter === 'all' && styles.statLabelActive
              ]}>
                Totali
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.statItem, 
                activeFilter === 'due' && styles.statItemActive
              ]}
              onPress={() => handleFilterChange('due')}
              activeOpacity={0.7}
              disabled={stats.due === 0}
            >
              <Text style={[
                { color: '#F59E0B', fontSize: 24, fontWeight: '700', marginBottom: 4 },
                activeFilter === 'due' && styles.statNumberActive,
                stats.due === 0 && styles.statNumberDisabled
              ]}>
                {stats.due}
              </Text>
              <Text style={[
                styles.statLabel,
                activeFilter === 'due' && styles.statLabelActive,
                stats.due === 0 && styles.statLabelDisabled
              ]}>
                Da ripassare
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.statItem, 
                activeFilter === 'completed' && styles.statItemActive
              ]}
              onPress={() => handleFilterChange('completed')}
              activeOpacity={0.7}
              disabled={stats.completed === 0}
            >
              <Text style={[
                { color: '#10B981', fontSize: 24, fontWeight: '700', marginBottom: 4 },
                activeFilter === 'completed' && styles.statNumberActive,
                stats.completed === 0 && styles.statNumberDisabled
              ]}>
                {stats.completed}
              </Text>
              <Text style={[
                styles.statLabel,
                activeFilter === 'completed' && styles.statLabelActive,
                stats.completed === 0 && styles.statLabelDisabled
              ]}>
                Completate
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {nozioni.length === 0 ? (
          // Empty state
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>Nessuna nozione ancora</Text>
            <Text style={styles.emptySubtitle}>
              Inizia aggiungendo la tua prima nozione da studiare
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={navigateToAddNotion}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>Aggiungi la prima nozione</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>            
            {/* Lista nozioni filtrate */}
            {getFilteredNozioni().length === 0 ? (
              <View style={styles.emptyFilterState}>
                <Text style={styles.emptyFilterIcon}>
                  {activeFilter === 'due' && '🔔'}
                  {activeFilter === 'completed' && '✅'}
                </Text>
                <Text style={styles.emptyFilterTitle}>
                  {activeFilter === 'due' && 'Nessuna nozione da ripassare'}
                  {activeFilter === 'completed' && 'Nessuna nozione completata'}
                </Text>
                <Text style={styles.emptyFilterSubtitle}>
                  {activeFilter === 'due' && 'Ottimo lavoro! Hai fatto tutti i ripassi previsti'}
                  {activeFilter === 'completed' && 'Continua a studiare per completare le prime nozioni'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={getFilteredNozioni()}
                renderItem={renderNozione}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    colors={['#3B82F6']}
                    tintColor="#3B82F6"
                  />
                }
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>

      {/* FAB Button */}
      {nozioni.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={navigateToAddNotion}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginTop: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 4,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  statItemActive: {
    backgroundColor: '#F3F4F6',
    transform: [{ scale: 0.98 }],
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statNumberActive: {
    color: '#1F2937',
  },
  statNumberDisabled: {
    opacity: 0.4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  statLabelActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  statLabelDisabled: {
    opacity: 0.4,
  },
  emptyFilterState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyFilterIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyFilterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyFilterSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 100,
  },
  notionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    bottom: 34,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});
