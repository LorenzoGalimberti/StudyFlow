// screens/app/ReviewScreen.tsx - Con supporto visualizzazione immagini
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { NozioneModel } from '../../models/Nozione';
import { Nozione } from '../../types';
import { ErrorHandler } from '../../utils/errorHandling';
import { NotificationService } from '../../services/NotificationService';
import { ImageService } from '../../services/ImageService';
import type { AppStackParamList } from '../../navigation/RootNavigator';

type ReviewScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Review'>;
type ReviewScreenRouteProp = RouteProp<AppStackParamList, 'Review'>;

interface ReviewScreenProps {}

export const ReviewScreen: React.FC<ReviewScreenProps> = () => {
  const navigation = useNavigation<ReviewScreenNavigationProp>();
  const route = useRoute<ReviewScreenRouteProp>();
  const { nozioneId, giorno } = route.params;
  const { user } = useAuth();
  
  const [nozione, setNozione] = useState<Nozione | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const [allowExit, setAllowExit] = useState(false);

  const nozioneModel = new NozioneModel();
  const notificationService = NotificationService.getInstance();
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    loadNozione();
  }, []);

  useEffect(() => {
    if (showAnswer) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showAnswer]);

  /**
   * Gestisce il comportamento del back button
   */
  const handleGoBack = () => {
    Alert.alert(
      'Annullare Ripasso?',
      'Il ripasso non verrà segnato come completato.',
      [
        { text: 'Continua Ripasso', style: 'cancel' },
        { 
          text: 'Annulla', 
          style: 'destructive',
          onPress: () => {
            setAllowExit(true);
            setTimeout(() => navigation.goBack(), 50);
          }
        },
      ]
    );
  };

  /**
   * Configura l'header title dinamico
   */
  useEffect(() => {
    if (nozione) {
      navigation.setOptions({
        headerTitle: `Ripasso Giorno ${giorno}`,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#1F2937',
        },
      });
    }
  }, [navigation, giorno, nozione]);

  /**
   * Gestisce l'evento di back navigation
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (reviewCompleted || allowExit) {
        return;
      }

      e.preventDefault();
      handleGoBack();
    });

    return unsubscribe;
  }, [navigation, reviewCompleted, allowExit]);

  /**
   * Carica la nozione da ripassare
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

      const targetRipasso = loadedNozione.ripassi.find(r => r.giorno === giorno);
      if (!targetRipasso || targetRipasso.completato) {
        setError('Questo ripasso è già stato completato');
        setIsLoading(false);
        return;
      }

      setNozione(loadedNozione);
      setError(null);
    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      setError(appError.message);
      ErrorHandler.logError(appError, 'ReviewScreen.loadNozione');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Mostra la risposta
   */
  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  /**
   * Marca il ripasso come completato
   */
  const handleCompleteReview = async () => {
    if (!nozione || !user?.uid) return;

    setIsReviewing(true);

    try {
      await nozioneModel.completeRipasso(nozione.id, giorno, user.uid);
      await notificationService.updateNotificationsAfterRipasso(nozione.id, giorno);

      setReviewCompleted(true);

      const ripassiCompletati = nozione.ripassi.filter(r => r.completato).length + 1;
      const ripassiTotali = nozione.ripassi.length;
      
      Alert.alert(
        'Ripasso Completato!',
        `Ottimo lavoro! Hai completato ${ripassiCompletati}/${ripassiTotali} ripassi per questa nozione.`,
        [
          {
            text: 'Continua',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      Alert.alert('Errore', appError.message);
      ErrorHandler.logError(appError, 'ReviewScreen.handleCompleteReview');
    } finally {
      setIsReviewing(false);
    }
  };

  /**
   * Calcola il progresso dei ripassi
   */
  const getProgress = (): { current: number; total: number; percentage: number } => {
    if (!nozione) return { current: 0, total: 0, percentage: 0 };
    
    const completati = nozione.ripassi.filter(r => r.completato).length;
    const totali = nozione.ripassi.length;
    const percentage = (completati / totali) * 100;
    
    return { current: completati, total: totali, percentage };
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Caricamento nozione...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !nozione) {
    return (
      <View style={styles.container}>
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
      </View>
    );
  }

  const progress = getProgress();

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          {progress.current}/{progress.total} ripassi completati
        </Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progress.percentage}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Question Card */}
        <View style={styles.questionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Domanda</Text>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>Giorno {giorno}</Text>
            </View>
          </View>
          <Text style={styles.questionText}>{nozione.domanda}</Text>
        </View>

        {/* ⬇️ IMMAGINE (se presente) */}
        {nozione.imageBase64 && nozione.imageType && (
          <View style={styles.imageCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Immagine</Text>
            </View>
            <Image
              source={{ 
                uri: ImageService.getDataUri(nozione.imageBase64, nozione.imageType) 
              }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Show Answer Button */}
        {!showAnswer && (
          <TouchableOpacity 
            style={styles.showAnswerButton}
            onPress={handleShowAnswer}
          >
            <Text style={styles.showAnswerButtonText}>Mostra Risposta</Text>
          </TouchableOpacity>
        )}

        {/* Answer Card */}
        {showAnswer && (
          <Animated.View style={[styles.answerCard, { opacity: fadeAnim }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Risposta</Text>
            </View>
            <Text style={styles.answerText}>{nozione.risposta}</Text>
          </Animated.View>
        )}

        {/* Info Cards */}
        {showAnswer && (
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Creata il</Text>
              <Text style={styles.infoValue}>
                {new Date(nozione.dataCreazione).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Prossimi Ripassi</Text>
              <View style={styles.nextReviews}>
                {nozione.ripassi
                  .filter(r => !r.completato && r.giorno > giorno)
                  .slice(0, 2)
                  .map((ripasso) => (
                    <Text key={ripasso.giorno} style={styles.nextReviewText}>
                      Giorno {ripasso.giorno}: {new Date(ripasso.dataRipasso).toLocaleDateString()}
                    </Text>
                  ))
                }
                {nozione.ripassi.filter(r => !r.completato && r.giorno > giorno).length === 0 && (
                  <Text style={styles.completedAllText}>
                    Ultimo ripasso! 🎉
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Actions */}
      {showAnswer && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.completeButton, isReviewing && styles.completeButtonDisabled]}
            onPress={handleCompleteReview}
            disabled={isReviewing}
          >
            {isReviewing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.completeButtonText}>✓ Ho Ripassato</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  progressSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressContainer: {
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // ⬇️ NUOVO STILE PER CARD IMMAGINE
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  answerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  dayBadge: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
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
  showAnswerButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  showAnswerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoSection: {
    marginTop: 24,
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
  },
  nextReviews: {
    gap: 4,
  },
  nextReviewText: {
    fontSize: 14,
    color: '#4B5563',
  },
  completedAllText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
  bottomActions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  completeButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
});
