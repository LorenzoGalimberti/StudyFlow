// screens/app/ProfileScreen.tsx - CON RIPROGRAMMAZIONE NOTIFICHE
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { NozioneModel } from '../../models/Nozione';
import { NotificationService } from '../../services/NotificationService';
import { ErrorHandler } from '../../utils/errorHandling';

interface UserStats {
  totalNozioni: number;
  ripassiCompletati: number;
  ripassiTotali: number;
  successRate: number;
  streakGiorni: number;
  nozioniCompletate: number;
}

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const nozioneModel = new NozioneModel();
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    loadUserStats();
    checkNotificationSettings();
  }, []);

  /**
   * Carica le statistiche dell'utente
   */
  const loadUserStats = async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    try {
      // Ottieni tutte le nozioni dell'utente
      const nozioni = await nozioneModel.getAll(user.uid);
      
      const totalNozioni = nozioni.length;
      const nozioniCompletate = nozioni.filter((n: any) => n.completato).length;
      
      let ripassiCompletati = 0;
      let ripassiTotali = 0;
      
      nozioni.forEach((nozione: any) => {
        ripassiTotali += nozione.ripassi.length;
        ripassiCompletati += nozione.ripassi.filter((r: any) => r.completato).length;
      });

      const successRate = ripassiTotali > 0 ? (ripassiCompletati / ripassiTotali) * 100 : 0;
      const streakGiorni = calculateStreak(nozioni);

      setStats({
        totalNozioni,
        ripassiCompletati,
        ripassiTotali,
        successRate,
        streakGiorni,
        nozioniCompletate,
      });

    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      console.error('Errore caricamento statistiche:', appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Calcola la streak di giorni consecutivi
   */
  const calculateStreak = (nozioni: any[]): number => {
    // Ottieni tutte le date di completamento ripassi
    const completionDates: Date[] = [];
    
    nozioni.forEach(nozione => {
      nozione.ripassi.forEach((ripasso: any) => {
        if (ripasso.completato && ripasso.dataCompletamento) {
          completionDates.push(new Date(ripasso.dataCompletamento));
        }
      });
    });

    if (completionDates.length === 0) return 0;

    // Ordina le date
    completionDates.sort((a, b) => b.getTime() - a.getTime());

    // Conta giorni consecutivi partendo da oggi
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(oggi);

    // Controlla se c'è attività oggi
    const hasActivityToday = completionDates.some(date => {
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      return compareDate.getTime() === oggi.getTime();
    });

    if (!hasActivityToday) {
      // Se non c'è attività oggi, parti da ieri
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Conta giorni consecutivi
    while (true) {
      const hasActivity = completionDates.some(date => {
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return compareDate.getTime() === currentDate.getTime();
      });

      if (hasActivity) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  /**
   * Controlla le impostazioni delle notifiche
   */
  const checkNotificationSettings = async () => {
    try {
      // Per ora assumiamo che le notifiche siano abilitate per default
      // In futuro si può implementare un controllo più sofisticato
      setNotificationsEnabled(true);
    } catch (error) {
      console.error('Errore controllo notifiche:', error);
      setNotificationsEnabled(false);
    }
  };

  /**
   * Gestisce il toggle delle notifiche - CON RIPROGRAMMAZIONE
   */
  const handleNotificationToggle = async (enabled: boolean) => {
    setIsToggling(true);
    
    try {
      if (enabled) {
        // Quando riabiliti: riprogramma TUTTE le notifiche
        console.log('🔄 Riprogrammando notifiche per tutte le nozioni...');
        
        if (user?.uid) {
          const nozioni = await nozioneModel.getAll(user.uid);
          let riprogrammate = 0;
          
          for (const nozione of nozioni) {
            if (!nozione.completato) {
              try {
                await notificationService.scheduleNotificationsForNozione(nozione);
                riprogrammate++;
                console.log(`✅ Notifiche riprogrammate per: ${nozione.domanda.slice(0, 30)}...`);
              } catch (error) {
                console.log(`❌ Errore riprogrammazione per: ${nozione.domanda.slice(0, 30)}...`, error);
              }
            }
          }
          
          console.log(`🎉 Riprogrammazione completata: ${riprogrammate} nozioni`);
        }
        
        setNotificationsEnabled(true);
        Alert.alert(
          'Notifiche Riabilitate',
          'Tutte le notifiche sono state riprogrammate correttamente per le tue nozioni attive.'
        );
      } else {
        // Quando disabiliti: cancella tutto
        try {
          await notificationService.cancelAllNotifications();
          console.log('🧹 Tutte le notifiche cancellate');
        } catch (error) {
          console.log('Errore cancellazione notifiche:', error);
        }
        setNotificationsEnabled(false);
        Alert.alert(
          'Notifiche Disabilitate',
          'Non riceverai più promemoria per i ripassi.'
        );
      }
    } catch (error) {
      console.error('Errore toggle notifiche:', error);
      Alert.alert('Errore', 'Impossibile modificare le impostazioni delle notifiche.');
    } finally {
      setIsToggling(false);
    }
  };

  /**
   * Gestisce il logout
   */
  const handleLogout = async () => {
    Alert.alert(
      'Conferma Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile effettuare il logout.');
            }
          },
        },
      ]
    );
  };

  /**
   * Renderizza una carta statistica
   */
  const renderStatCard = (
    title: string,
    value: string | number,
    subtitle?: string,
    color: string = '#3B82F6'
  ) => (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Il Mio Profilo</Text>
          <Text style={styles.subtitle}>
            Ciao, {user?.email?.split('@')[0]}!
          </Text>
        </View>

        {/* Statistiche Principali */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Le Mie Statistiche</Text>
          
          {isLoading ? (
            <View style={styles.loadingStats}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Caricamento statistiche...</Text>
            </View>
          ) : stats ? (
            <View style={styles.statsGrid}>
              {renderStatCard(
                'Nozioni Create',
                stats.totalNozioni,
                undefined,
                '#3B82F6'
              )}
              {renderStatCard(
                'Ripassi Completati',
                stats.ripassiCompletati,
                `su ${stats.ripassiTotali} totali`,
                '#10B981'
              )}
              {renderStatCard(
                'Tasso di Successo',
                `${Math.round(stats.successRate)}%`,
                'ripassi completati',
                '#F59E0B'
              )}
              {renderStatCard(
                'Streak Giorni',
                stats.streakGiorni,
                'giorni consecutivi',
                '#EF4444'
              )}
            </View>
          ) : (
            <View style={styles.errorStats}>
              <Text style={styles.errorText}>Impossibile caricare le statistiche</Text>
            </View>
          )}
        </View>

        {/* Progress Overview */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progresso Generale</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Nozioni Completate</Text>
                <Text style={styles.progressValue}>
                  {stats.nozioniCompletate}/{stats.totalNozioni}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: stats.totalNozioni > 0 
                          ? `${(stats.nozioniCompletate / stats.totalNozioni) * 100}%` 
                          : '0%'
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Impostazioni */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Impostazioni</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>Notifiche Ripassi</Text>
              <Text style={styles.settingDescription}>
                Ricevi promemoria per i ripassi programmati
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              disabled={isToggling}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Info Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.accountCard}>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Email</Text>
              <Text style={styles.accountValue}>{user?.email}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Membro dal</Text>
              <Text style={styles.accountValue}>
                {user?.createdAt 
                  ? new Date(user.createdAt).toLocaleDateString('it-IT')
                  : 'N/A'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Supporto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supporto</Text>
          <TouchableOpacity style={styles.supportButton}>
            <Text style={styles.supportButtonText}>
              📧 Invia Feedback
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Header
  header: {
    paddingVertical: 24,
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

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },

  // Stats
  loadingStats: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorStats: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Progress
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    flex: 1,
    height: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },

  // Settings
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Account
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  accountLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  accountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },

  // Support
  supportButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3B82F6',
  },

  // Logout
  logoutSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
