// screens/app/NotionDetailScreen.tsx - CON DEBUG NOTIFICHE CORRETTI
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../contexts/AuthContext';
import { NozioneModel } from '../../models/Nozione';
import { Nozione, RipassoSchedule } from '../../types';
import { ErrorHandler } from '../../utils/errorHandling';

interface NotionDetailScreenProps {
  navigation: any;
  route: {
    params: {
      nozioneId: string;
    };
  };
}

export const NotionDetailScreen: React.FC<NotionDetailScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { nozioneId } = route.params;
  const { user } = useAuth();
  
  const [nozione, setNozione] = useState<Nozione | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nozioneModel = new NozioneModel();

  useEffect(() => {
    loadNozione();
  }, []);

  /**
   * Carica la nozione dal database
   */
  const loadNozione = async () => {
    if (!user?.uid) {
      setError('Utente non autenticato');
      setIsLoading(false);
      return;
    }

    try {
      const loadedNozione = await nozioneModel.getById(nozioneId, user.uid);
      
      if (!loadedNozione) {
        setError('Nozione non trovata');
        setIsLoading(false);
        return;
      }

      setNozione(loadedNozione);
      setError(null);
    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      setError(appError.message);
      ErrorHandler.logError(appError, 'NotionDetailScreen.loadNozione');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * DEBUG: Mostra quando sono programmate le notifiche per questa nozione
   */
  const debugNotifications = async () => {
    if (!nozione) return;
    
    console.log('\n🔍 === DEBUG NOTIFICHE PER NOZIONE ===');
    console.log(`📋 Nozione: ${nozione.id.slice(0, 8)}...`);
    console.log(`❓ Domanda: ${nozione.domanda.slice(0, 50)}...`);
    
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📊 Total notifiche nel sistema: ${allScheduled.length}`);
      
      const notificationForThisNotion = allScheduled.filter(notif => 
        notif.content.data?.nozioneId === nozione.id
      );
      
      console.log(`🎯 Notifiche per questa nozione: ${notificationForThisNotion.length}`);
      
      if (notificationForThisNotion.length === 0) {
        console.log('❌ Nessuna notifica trovata per questa nozione!');
        Alert.alert(
          '⚠️ Nessuna Notifica', 
          'Non ci sono notifiche programmate per questa nozione.\n\nPossibili cause:\n• Tutti i ripassi sono completati\n• Errore durante la programmazione\n• Notifiche cancellate'
        );
        return;
      }
      
      console.log('\n📅 DETTAGLI NOTIFICHE:');
      notificationForThisNotion.forEach((notif, notifIndex) => {
        // FIX: Gestione sicura del trigger
        if (!notif.trigger || typeof notif.trigger !== 'object') {
          console.log(`❌ Trigger non valido per notifica ${notifIndex + 1}`);
          return;
        }

        const trigger = notif.trigger as any;
        let scheduledDate: Date;

        try {
          if (trigger.date) {
            scheduledDate = new Date(trigger.date);
          } else if (trigger.value) {
            scheduledDate = new Date(trigger.value);
          } else {
            console.log(`❌ Data non trovata per notifica ${notifIndex + 1}`);
            return;
          }

          const now = new Date();
          const diffMs = scheduledDate.getTime() - now.getTime();
          const diffHours = Math.round(diffMs / (1000 * 60 * 60));
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          
          console.log(`\n📋 Notifica ${notifIndex + 1}:`);
          console.log(`  🆔 ID: ${notif.identifier.slice(0, 10)}...`);
          console.log(`  📅 Data: ${scheduledDate.toLocaleString('it-IT')}`);
          console.log(`  🎯 Giorno: ${notif.content.data?.giorno || 'N/A'}`);
          console.log(`  ⏰ Tra: ${diffDays}d ${diffHours}h`);
          console.log(`  📝 Titolo: ${notif.content.title}`);
          console.log(`  🧪 Test: ${notif.content.data?.isTest ? 'SÌ' : 'NO'}`);
        } catch (error) {
          console.log(`❌ Errore elaborazione notifica ${notifIndex + 1}:`, error);
        }
      });
      
      // FIX: Alert message senza index non utilizzato
      const alertMessage = notificationForThisNotion
        .map((notif) => {
          if (!notif.trigger || typeof notif.trigger !== 'object') {
            return '❌ Notifica non valida';
          }

          const trigger = notif.trigger as any;
          let scheduledDate: Date;

          try {
            if (trigger.date) {
              scheduledDate = new Date(trigger.date);
            } else if (trigger.value) {
              scheduledDate = new Date(trigger.value);
            } else {
              return '❌ Data non disponibile';
            }

            const giorno = notif.content.data?.giorno;
            const isTest = notif.content.data?.isTest;
            
            if (isTest) {
              return `🧪 Test: ${scheduledDate.toLocaleString('it-IT')}`;
            } else {
              return `📅 Giorno ${giorno}: ${scheduledDate.toLocaleDateString('it-IT')} alle ${scheduledDate.toLocaleTimeString('it-IT')}`;
            }
          } catch (error) {
            return '❌ Errore elaborazione data';
          }
        })
        .filter(msg => msg !== '❌ Notifica non valida' && msg !== '❌ Data non disponibile' && msg !== '❌ Errore elaborazione data')
        .join('\n\n');
      
      Alert.alert(
        `🔔 Notifiche Programmate (${notificationForThisNotion.length})`,
        alertMessage || 'Nessuna notifica valida trovata',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.log('❌ Errore debug notifiche:', error);
      Alert.alert('Errore', 'Impossibile recuperare le notifiche programmate');
    }
    
    console.log('===============================\n');
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
   * Calcola la percentuale di progresso
   */
  const getProgressPercentage = (nozione: Nozione): number => {
    const completedCount = nozione.ripassi.filter(r => r.completato).length;
    const totalCount = nozione.ripassi.length;
    return totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  };

  /**
   * Naviga alla schermata di modifica
   */
  const handleEditNotion = () => {
    if (!nozione) return;
    
    navigation.navigate('EditNotion', { nozioneId: nozione.id });
  };

  /**
   * Naviga alla schermata di ripasso
   */
  const handleStartReview = () => {
    if (!nozione) return;
    
    const nextRipasso = nozioneModel.getNextRipasso(nozione);
    if (!nextRipasso) return;

    const oggi = new Date();
    const dataRipasso = new Date(nextRipasso.dataRipasso);
    
    if (dataRipasso <= oggi) {
      // Ripasso dovuto - vai alla ReviewScreen
      navigation.navigate('Review', {
        nozioneId: nozione.id,
        giorno: nextRipasso.giorno,
      });
    } else {
      // Ripasso anticipato - mostra conferma
      Alert.alert(
        'Ripasso Anticipato',
        `Questo ripasso è previsto per il ${dataRipasso.toLocaleDateString('it-IT')}. Vuoi farlo comunque ora?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Sì, ripassa ora',
            onPress: () => navigation.navigate('Review', {
              nozioneId: nozione.id,
              giorno: nextRipasso.giorno,
            }),
          },
        ]
      );
    }
  };

  /**
   * Elimina la nozione con conferma
   */
  const handleDelete = () => {
    if (!nozione) return;

    Alert.alert(
      'Elimina Nozione',
      `Sei sicuro di voler eliminare "${nozione.domanda}"?\n\nQuesta azione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  /**
   * Conferma l'eliminazione
   */
  const confirmDelete = async () => {
    if (!nozione || !user?.uid) return;

    try {
      await nozioneModel.delete(nozione.id, user.uid);
      navigation.goBack();
    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      Alert.alert('Errore', appError.message);
      ErrorHandler.logError(appError, 'NotionDetailScreen.delete');
    }
  };

  /**
   * Ottieni il colore del badge per lo stato
   */
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'due':
        return { backgroundColor: '#FEF3C7', color: '#F59E0B' };
      case 'completed':
        return { backgroundColor: '#D1FAE5', color: '#10B981' };
      case 'pending':
      default:
        return { backgroundColor: '#DBEAFE', color: '#3B82F6' };
    }
  };

  /**
   * Ottieni il testo per lo stato
   */
  const getStatusText = (status: string) => {
    switch (status) {
      case 'due':
        return 'Da ripassare';
      case 'completed':
        return 'Completata';
      case 'pending':
      default:
        return 'In attesa';
    }
  };

  /**
   * Renderizza un singolo ripasso
   */
  const renderRipasso = (ripasso: RipassoSchedule) => {
    const isCompleted = ripasso.completato;
    const isPending = !isCompleted && new Date(ripasso.dataRipasso) <= new Date();
    
    return (
      <View key={ripasso.giorno} style={styles.ripassoItem}>
        <View style={styles.ripassoLeft}>
          <View style={[
            styles.ripassoNumber,
            isCompleted && styles.ripassoNumberCompleted,
            isPending && styles.ripassoNumberPending,
          ]}>
            <Text style={[
              styles.ripassoNumberText,
              isCompleted && styles.ripassoNumberTextCompleted,
              isPending && styles.ripassoNumberTextPending,
            ]}>
              {ripasso.giorno}
            </Text>
          </View>
          <View style={styles.ripassoInfo}>
            <Text style={styles.ripassoDay}>Giorno {ripasso.giorno}</Text>
            <Text style={styles.ripassoDate}>
              {new Date(ripasso.dataRipasso).toLocaleDateString('it-IT')}
            </Text>
          </View>
        </View>
        
        <View style={styles.ripassoStatus}>
          {isCompleted ? (
            <>
              <Text style={styles.statusCompleted}>✅</Text>
              {ripasso.dataCompletamento && (
                <Text style={styles.completedDate}>
                  {new Date(ripasso.dataCompletamento).toLocaleDateString('it-IT')}
                </Text>
              )}
            </>
          ) : isPending ? (
            <Text style={styles.statusPending}>🔔</Text>
          ) : (
            <Text style={styles.statusWaiting}>📅</Text>
          )}
        </View>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !nozione) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Errore</Text>
          <Text style={styles.errorText}>{error || 'Nozione non trovata'}</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Torna Indietro</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = getNozioneStatus(nozione);
  const statusStyle = getStatusBadgeStyle(status);
  const nextRipasso = nozioneModel.getNextRipasso(nozione);
  const completedCount = nozione.ripassi.filter(r => r.completato).length;
  const totalCount = nozione.ripassi.length;
  const progressPercentage = getProgressPercentage(nozione);

  return (
    <SafeAreaView style={styles.container}>
      {/* PULSANTE DEBUG NOTIFICHE - TEMPORANEO */}
      <TouchableOpacity 
        style={styles.debugButton}
        onPress={debugNotifications}
      >
        <Text style={styles.debugButtonText}>
          🔍 NOTIF
        </Text>
      </TouchableOpacity>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Status Header */}
        <View style={styles.statusHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
              {getStatusText(status)}
            </Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progresso Ripassi</Text>
            <Text style={styles.progressText}>
              {completedCount}/{totalCount} completati
            </Text>
          </View>
          
          {/* Progress Bar Verde */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>
              {Math.round(progressPercentage)}%
            </Text>
          </View>
        </View>

        {/* Question Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Domanda</Text>
          <Text style={styles.questionText}>{nozione.domanda}</Text>
        </View>

        {/* Answer Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Risposta</Text>
          <Text style={styles.answerText}>{nozione.risposta}</Text>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informazioni</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Creata il:</Text>
            <Text style={styles.infoValue}>
              {new Date(nozione.dataCreazione).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
          
          {nextRipasso && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prossimo ripasso:</Text>
              <Text style={styles.infoValue}>
                Giorno {nextRipasso.giorno} - {new Date(nextRipasso.dataRipasso).toLocaleDateString('it-IT')}
              </Text>
            </View>
          )}
        </View>

        {/* Reviews History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cronologia Ripassi</Text>
          <View style={styles.ripassiList}>
            {nozione.ripassi.map(renderRipasso)}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {/* Review Button - solo per nozioni "due" */}
        {!nozione.completato && nextRipasso && status === 'due' && (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={handleStartReview}
          >
            <Text style={styles.reviewButtonText}>
              🔔 Ripassa Ora
            </Text>
          </TouchableOpacity>
        )}

        {/* Edit Button - sempre visibile per nozioni non completate */}
        {!nozione.completato && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditNotion}
          >
            <Text style={styles.editButtonText}>
              ✏️ Modifica Nozione
            </Text>
          </TouchableOpacity>
        )}

        {/* Completed Status */}
        {nozione.completato && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>
              🎉 Tutti i ripassi completati!
            </Text>
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>🗑️ Elimina Nozione</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  // STILE PULSANTE DEBUG
  debugButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#9333EA',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 1000,
  },
  debugButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
  backButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Status Header
  statusHeader: {
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Progress Section
  progressSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
    minWidth: 2,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    minWidth: 35,
    textAlign: 'right',
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 18,
    color: '#1F2937',
    lineHeight: 26,
  },
  answerText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },

  // Info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },

  // Ripassi List
  ripassiList: {
    gap: 12,
  },
  ripassoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  ripassoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ripassoNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ripassoNumberCompleted: {
    backgroundColor: '#D1FAE5',
  },
  ripassoNumberPending: {
    backgroundColor: '#FEF3C7',
  },
  ripassoNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  ripassoNumberTextCompleted: {
    color: '#10B981',
  },
  ripassoNumberTextPending: {
    color: '#F59E0B',
  },
  ripassoInfo: {
    flex: 1,
  },
  ripassoDay: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  ripassoDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  ripassoStatus: {
    alignItems: 'center',
  },
  statusCompleted: {
    fontSize: 18,
  },
  statusPending: {
    fontSize: 18,
  },
  statusWaiting: {
    fontSize: 18,
    opacity: 0.5,
  },
  completedDate: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
  },

  // Action Buttons
  actionButtons: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  reviewButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedBanner: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
});
