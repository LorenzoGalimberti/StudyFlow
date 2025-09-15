// screens/app/AddNotionScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { NozioneModel } from '../../models/Nozione';
import { ValidationUtils } from '../../utils/validation';
import { ValidationError } from '../../types';
import { ErrorHandler } from '../../utils/errorHandling';
import { NotificationService } from '../../services/NotificationService';

interface AddNotionScreenProps {
  navigation: any;
}

export const AddNotionScreen: React.FC<AddNotionScreenProps> = ({ navigation }) => {
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
   * Gestisce l'annullamento
   */
  const handleCancel = () => {
    if (domanda.trim() || risposta.trim()) {
      Alert.alert(
        'Annullare?',
        'Le modifiche non salvate andranno perse.',
        [
          { text: 'Continua a modificare', style: 'cancel' },
          { 
            text: 'Annulla', 
            style: 'destructive',
            onPress: () => navigation.goBack() 
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} disabled={isLoading}>
            <Text style={styles.cancelButton}>Annulla</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuova Nozione</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={isLoading || !domanda.trim() || !risposta.trim()}
            style={[
              styles.saveButton,
              (!domanda.trim() || !risposta.trim() || isLoading) && styles.saveButtonDisabled
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Text style={styles.saveButtonText}>Salva</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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

          {/* Spacer per il keyboard */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    backgroundColor: '#F9FAFB',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
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
    marginBottom: 24,
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
  bottomSpacer: {
    height: 50,
  },
});
