// screens/app/AddNotionScreen.tsx - Fixed beforeRemove conflict
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { NozioneModel } from '../../models/Nozione';
import { ValidationUtils } from '../../utils/validation';
import { ValidationError } from '../../types';
import { ErrorHandler } from '../../utils/errorHandling';
import { NotificationService } from '../../services/NotificationService';
import type { AppStackParamList } from '../../navigation/RootNavigator';

type AddNotionNavigationProp = StackNavigationProp<AppStackParamList, 'AddNotion'>;

interface AddNotionScreenProps {}

/**
 * Componente per il pulsante Salva nell'header
 */
const SaveHeaderButton: React.FC<{
  onPress: () => void;
  disabled: boolean;
  isLoading: boolean;
}> = ({ onPress, disabled, isLoading }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[styles.headerSaveButton, disabled && styles.headerSaveButtonDisabled]}
  >
    {isLoading ? (
      <ActivityIndicator size="small" color="#3B82F6" />
    ) : (
      <Text style={[styles.headerSaveText, disabled && styles.headerSaveTextDisabled]}>
        Salva
      </Text>
    )}
  </TouchableOpacity>
);

export const AddNotionScreen: React.FC<AddNotionScreenProps> = () => {
  const navigation = useNavigation<AddNotionNavigationProp>();
  const { user } = useAuth();
  const [domanda, setDomanda] = useState('');
  const [risposta, setRisposta] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const nozioneModel = new NozioneModel();
  const notificationService = NotificationService.getInstance();

  /**
   * Gestisce il salvataggio della nozione
   */
  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert('Errore', 'Utente non autenticato');
      return;
    }

    // Validazione client-side
    const validation = ValidationUtils.validateNozione(domanda.trim(), risposta.trim());
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    setIsLoading(true);

    try {
      // Crea la nozione
      const nozioneId = await nozioneModel.create(
        domanda.trim(),
        risposta.trim(),
        user.uid
      );

      // Recupera la nozione creata per le notifiche
      const nuovaNozione = await nozioneModel.getById(nozioneId, user.uid);
      
      if (nuovaNozione) {
        // Programma le notifiche
        await notificationService.scheduleNotificationsForNozione(nuovaNozione);
        console.log('Notifiche programmate per nozione:', nozioneId);
      }

      // Resetta i campi PRIMA dell'alert per evitare conflitti con beforeRemove
      setDomanda('');
      setRisposta('');

      // Feedback positivo
      Alert.alert(
        'Nozione Salvata!',
        'La tua nozione è stata salvata e i ripassi sono stati programmati.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      Alert.alert('Errore', appError.message);
      ErrorHandler.logError(appError, 'AddNotionScreen.handleSave');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Controlla se il form è valido
   */
  const isFormValid = () => {
    return domanda.trim().length > 0 && risposta.trim().length > 0;
  };

  /**
   * Configura l'header con il pulsante Salva
   */
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <SaveHeaderButton
          onPress={handleSave}
          disabled={!isFormValid() || isLoading}
          isLoading={isLoading}
        />
      ),
    });
  }, [navigation, isFormValid(), isLoading, handleSave]);

  /**
   * Gestisce l'evento di back navigation
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Se non ci sono modifiche, procedi normalmente
      if (!domanda.trim() && !risposta.trim()) {
        return;
      }

      // Se stiamo salvando, non bloccare la navigazione
      if (isLoading) {
        return;
      }

      // Previeni l'azione di default
      e.preventDefault();

      // Mostra il prompt di conferma
      Alert.alert(
        'Annullare?',
        'Le modifiche non salvate andranno perse.',
        [
          { text: 'Continua a modificare', style: 'cancel' },
          {
            text: 'Annulla',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, domanda, risposta, isLoading]);

  /**
   * Ottiene messaggio di errore per un campo specifico
   */
  const getFieldError = (fieldName: string): string | undefined => {
    const fieldError = validationErrors.find(error => error.field === fieldName);
    return fieldError?.message;
  };

  /**
   * Conta caratteri rimanenti
   */
  const getRemainingChars = (text: string, maxLength: number): string => {
    const remaining = maxLength - text.length;
    return `${remaining} caratteri rimanenti`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            La tua nozione sarà ripassata automaticamente dopo 1, 3, 7 e 21 giorni per migliorare la memorizzazione.
          </Text>
        </View>

        {/* Domanda */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Domanda</Text>
          <TextInput
            style={[
              styles.textInput,
              styles.questionInput,
              getFieldError('domanda') && styles.inputError
            ]}
            value={domanda}
            onChangeText={setDomanda}
            placeholder="Es. Qual è la formula dell'area del cerchio?"
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            maxLength={500}
            editable={!isLoading}
          />
          {getFieldError('domanda') && (
            <Text style={styles.errorText}>{getFieldError('domanda')}</Text>
          )}
          <Text style={styles.charCount}>
            {getRemainingChars(domanda, 500)}
          </Text>
        </View>

        {/* Risposta */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Risposta</Text>
          <TextInput
            style={[
              styles.textInput,
              styles.answerInput,
              getFieldError('risposta') && styles.inputError
            ]}
            value={risposta}
            onChangeText={setRisposta}
            placeholder="Es. A = π × r² dove r è il raggio del cerchio..."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            maxLength={2000}
            editable={!isLoading}
          />
          {getFieldError('risposta') && (
            <Text style={styles.errorText}>{getFieldError('risposta')}</Text>
          )}
          <Text style={styles.charCount}>
            {getRemainingChars(risposta, 2000)}
          </Text>
        </View>

        {/* Preview */}
        {domanda.trim() && risposta.trim() && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Anteprima Nozione</Text>
            <View style={styles.previewCard}>
              <Text style={styles.previewQuestion}>{domanda.trim()}</Text>
              <View style={styles.previewDivider} />
              <Text style={styles.previewAnswer}>{risposta.trim()}</Text>
            </View>
          </View>
        )}

        {/* Schedule Info */}
        <View style={styles.scheduleContainer}>
          <Text style={styles.scheduleTitle}>Calendario Ripassi</Text>
          <View style={styles.scheduleList}>
            {[1, 3, 7, 21].map((giorno) => (
              <View key={giorno} style={styles.scheduleItem}>
                <View style={styles.scheduleDot} />
                <Text style={styles.scheduleText}>
                  Giorno {giorno}: {getScheduleDate(giorno)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/**
 * Calcola la data del ripasso
 */
const getScheduleDate = (giorni: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + giorni);
  return date.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  // Header button styles
  headerSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  headerSaveButtonDisabled: {
    opacity: 0.5,
  },
  headerSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  headerSaveTextDisabled: {
    color: '#9CA3AF',
  },
  // Content styles
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  questionInput: {
    height: 120,
  },
  answerInput: {
    height: 200,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  previewContainer: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  previewAnswer: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  scheduleContainer: {
    marginBottom: 32,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  scheduleList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginRight: 12,
  },
  scheduleText: {
    fontSize: 14,
    color: '#4B5563',
  },
});
