// screens/app/EditNotionScreen.tsx
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { NozioneModel } from '../../models/Nozione';
import { Nozione } from '../../types';
import { ValidationUtils } from '../../utils/validation';
import { ValidationError } from '../../types';
import { ErrorHandler } from '../../utils/errorHandling';

interface EditNotionScreenProps {
  navigation: any;
  route: {
    params: {
      nozioneId: string;
    };
  };
}

export const EditNotionScreen: React.FC<EditNotionScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { nozioneId } = route.params;
  const { user } = useAuth();
  
  const [nozione, setNozione] = useState<Nozione | null>(null);
  const [domanda, setDomanda] = useState('');
  const [risposta, setRisposta] = useState('');
  const [originalDomanda, setOriginalDomanda] = useState('');
  const [originalRisposta, setOriginalRisposta] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoadingNotion, setIsLoadingNotion] = useState(true);

  const nozioneModel = new NozioneModel();

  useEffect(() => {
    loadNozione();
  }, []);

  // Esponi le funzioni per l'header
  useEffect(() => {
    // Configura i metodi che l'header può chiamare
    navigation.setParams({
      handleSave,
      handleCancel,
      hasChanges,
      isValid: domanda.trim() && risposta.trim(),
    });
  }, [domanda, risposta, originalDomanda, originalRisposta]);

  /**
   * Carica la nozione da modificare
   */
  const loadNozione = async () => {
    if (!user?.uid) {
      Alert.alert('Errore', 'Utente non autenticato');
      navigation.goBack();
      return;
    }

    try {
      const loadedNozione = await nozioneModel.getById(nozioneId, user.uid);
      
      if (!loadedNozione) {
        Alert.alert('Errore', 'Nozione non trovata');
        navigation.goBack();
        return;
      }

      setNozione(loadedNozione);
      setDomanda(loadedNozione.domanda);
      setRisposta(loadedNozione.risposta);
      setOriginalDomanda(loadedNozione.domanda);
      setOriginalRisposta(loadedNozione.risposta);
    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      Alert.alert('Errore', appError.message);
      navigation.goBack();
    } finally {
      setIsLoadingNotion(false);
    }
  };

  /**
   * Controlla se ci sono modifiche
   */
  const hasChanges = (): boolean => {
    return domanda.trim() !== originalDomanda.trim() || 
           risposta.trim() !== originalRisposta.trim();
  };

  /**
   * Gestisce il salvataggio delle modifiche
   */
  const handleSave = async () => {
    if (!user?.uid || !nozione) {
      Alert.alert('Errore', 'Dati mancanti per il salvataggio');
      return;
    }

    // Validazione client-side
    const validation = ValidationUtils.validateNozione(domanda.trim(), risposta.trim());
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);

    try {
      // Aggiorna solo se ci sono modifiche
      if (hasChanges()) {
        await nozioneModel.update(nozioneId, {
          domanda: domanda.trim(),
          risposta: risposta.trim(),
        }, user.uid);

        // Resetta i campi PRIMA dell'alert per evitare conflitti con beforeRemove
        setDomanda(originalDomanda);
        setRisposta(originalRisposta);

        // Feedback positivo
        Alert.alert(
          'Modifiche Salvate!',
          'La tua nozione è stata aggiornata con successo.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Nessuna modifica da salvare
        navigation.goBack();
      }

    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      Alert.alert('Errore', appError.message);
      ErrorHandler.logError(appError, 'EditNotionScreen.handleSave');
    }
  };

  /**
   * Gestisce l'annullamento
   */
  const handleCancel = () => {
    if (hasChanges()) {
      Alert.alert(
        'Annullare le modifiche?',
        'Le modifiche non salvate andranno perse.',
        [
          { text: 'Continua a modificare', style: 'cancel' },
          { 
            text: 'Annulla modifiche', 
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

  // Loading nozione
  if (isLoadingNotion || !nozione) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Caricamento nozione...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>✏️</Text>
            <Text style={styles.infoText}>
              Puoi modificare domanda e risposta. I ripassi programmati rimarranno invariati.
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
            />
            {getFieldError('risposta') && (
              <Text style={styles.errorText}>{getFieldError('risposta')}</Text>
            )}
            <Text style={styles.charCount}>
              {getRemainingChars(risposta, 2000)}
            </Text>
          </View>

          {/* Preview delle modifiche */}
          {(domanda.trim() !== originalDomanda || risposta.trim() !== originalRisposta) && (
            <View style={styles.changesContainer}>
              <Text style={styles.changesTitle}>Anteprima Modifiche</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewQuestion}>{domanda.trim()}</Text>
                <View style={styles.previewDivider} />
                <Text style={styles.previewAnswer}>{risposta.trim()}</Text>
              </View>
            </View>
          )}

          {/* Ripassi Info */}
          <View style={styles.scheduleContainer}>
            <Text style={styles.scheduleTitle}>Ripassi Programmati</Text>
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleText}>
                I tuoi ripassi rimangono invariati:
              </Text>
              {nozione.ripassi.map((ripasso) => (
                <View key={ripasso.giorno} style={styles.scheduleItem}>
                  <View style={[
                    styles.scheduleDot,
                    ripasso.completato ? styles.completedDot : styles.pendingDot
                  ]} />
                  <Text style={[
                    styles.scheduleItemText,
                    ripasso.completato && styles.completedText
                  ]}>
                    Giorno {ripasso.giorno}: {new Date(ripasso.dataRipasso).toLocaleDateString('it-IT')}
                    {ripasso.completato && ' ✅'}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  keyboardAvoidingView: {
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
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
    color: '#92400E',
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
  changesContainer: {
    marginBottom: 24,
  },
  changesTitle: {
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
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  previewQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#F59E0B',
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
  scheduleInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  scheduleText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  pendingDot: {
    backgroundColor: '#3B82F6',
  },
  completedDot: {
    backgroundColor: '#10B981',
  },
  scheduleItemText: {
    fontSize: 14,
    color: '#4B5563',
  },
  completedText: {
    color: '#10B981',
  },
  bottomSpacer: {
    height: 50,
  },
});
