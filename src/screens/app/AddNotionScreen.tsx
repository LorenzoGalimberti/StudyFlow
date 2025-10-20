// screens/app/AddNotionScreen.tsx - Con supporto MULTIPLE immagini
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
  Image,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { NozioneModel } from '../../models/Nozione';
import { ValidationUtils } from '../../utils/validation';
import { ValidationError, NozioneImage, MAX_IMAGES_PER_NOZIONE } from '../../types';
import { ErrorHandler } from '../../utils/errorHandling';
import { NotificationService } from '../../services/NotificationService';
import { ImageService } from '../../services/ImageService';
import type { AppStackParamList } from '../../navigation/RootNavigator';
import { analyticsService } from '../../services/AnalyticsService';

type AddNotionNavigationProp = StackNavigationProp<AppStackParamList, 'AddNotion'>;

interface AddNotionScreenProps {}

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
  
  // 🆕 NUOVI STATI PER MULTIPLE IMMAGINI
  const [images, setImages] = useState<NozioneImage[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const nozioneModel = new NozioneModel();
  const notificationService = NotificationService.getInstance();

  /**
   * 🆕 Gestisce la selezione di MULTIPLE immagini dalla galleria
   */
  const handlePickMultipleFromGallery = async () => {
    setIsProcessingImage(true);
    try {
      const newImages = await ImageService.pickMultipleFromGallery(images.length);
      if (newImages.length > 0) {
        setImages([...images, ...newImages]);
        console.log(`✅ ${newImages.length} immagini aggiunte dalla galleria`);
      }
    } catch (error) {
      console.error('Errore selezione immagini:', error);
    } finally {
      setIsProcessingImage(false);
    }
  };

  /**
   * 🆕 Gestisce lo scatto di una foto
   */
  const handleTakePhoto = async () => {
    setIsProcessingImage(true);
    try {
      const newImage = await ImageService.takePhoto(images.length);
      if (newImage) {
        setImages([...images, newImage]);
        console.log('✅ Foto scattata e aggiunta');
      }
    } catch (error) {
      console.error('Errore scatto foto:', error);
    } finally {
      setIsProcessingImage(false);
    }
  };

  /**
   * 🆕 Mostra il dialog per aggiungere immagini
   */
  const handleAddImages = () => {
    ImageService.showImagePickerOptions(
      images.length,
      handlePickMultipleFromGallery,
      handleTakePhoto
    );
  };

  /**
   * 🆕 Rimuove una singola immagine
   */
  const handleRemoveImage = (imageId: string) => {
    Alert.alert(
      'Rimuovere immagine?',
      'Vuoi rimuovere questa immagine?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: () => {
            const updatedImages = images
              .filter(img => img.id !== imageId)
              .map((img, index) => ({ ...img, order: index }));
            setImages(updatedImages);
            console.log('🗑️ Immagine rimossa');
          },
        },
      ]
    );
  };

  /**
   * 🆕 Renderizza una singola immagine nella lista
   */
  const renderImageItem = ({ item, index }: { item: NozioneImage; index: number }) => (
    <View style={styles.imageItem}>
      <Image
        source={{ uri: ImageService.getDataUri(item.base64, item.type) }}
        style={styles.imageThumbnail}
        resizeMode="cover"
      />
      <View style={styles.imageItemOverlay}>
        <View style={styles.imageNumber}>
          <Text style={styles.imageNumberText}>{index + 1}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeImageIcon}
          onPress={() => handleRemoveImage(item.id)}
          disabled={isLoading}
        >
          <Text style={styles.removeImageIconText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Gestisce il salvataggio della nozione
   */
  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert('Errore', 'Utente non autenticato');
      return;
    }

    const validation = ValidationUtils.validateNozione(domanda.trim(), risposta.trim());
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    setIsLoading(true);

    try {
      // 🆕 Crea la nozione con MULTIPLE immagini
      const nozioneId = await nozioneModel.createWithImages(
        domanda.trim(),
        risposta.trim(),
        user.uid,
        images.length > 0 ? images : undefined
      );

      // 📊 Traccia l'evento Analytics con content_length
      analyticsService.trackNozioneCreated(
        nozioneId,
        domanda.trim(),
        risposta.trim(),
        images.length > 0
      );

      const nuovaNozione = await nozioneModel.getById(nozioneId, user.uid);
      
      if (nuovaNozione) {
        await notificationService.scheduleNotificationsForNozione(nuovaNozione);
        console.log('✅ Notifiche programmate per nozione:', nozioneId);
      }

      // Resetta i campi
      setDomanda('');
      setRisposta('');
      setImages([]);

      Alert.alert(
        'Nozione Salvata!',
        `La tua nozione è stata salvata${images.length > 0 ? ` con ${images.length} ${images.length === 1 ? 'immagine' : 'immagini'}` : ''} e i ripassi sono stati programmati.`,
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

  const isFormValid = () => {
    return domanda.trim().length > 0 && risposta.trim().length > 0;
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <SaveHeaderButton
          onPress={handleSave}
          disabled={!isFormValid() || isLoading || isProcessingImage}
          isLoading={isLoading}
        />
      ),
    });
  }, [navigation, isFormValid(), isLoading, isProcessingImage, handleSave]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!domanda.trim() && !risposta.trim() && images.length === 0) {
        return;
      }

      if (isLoading) {
        return;
      }

      e.preventDefault();

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
  }, [navigation, domanda, risposta, images, isLoading]);

  const getFieldError = (fieldName: string): string | undefined => {
    const fieldError = validationErrors.find(error => error.field === fieldName);
    return fieldError?.message;
  };

  const getRemainingChars = (text: string, maxLength: number): string => {
    const remaining = maxLength - text.length;
    return `${remaining} caratteri rimanenti`;
  };

  const totalImagesSize = images.length > 0 ? ImageService.getTotalImagesSize(images) : 0;

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
            editable={!isLoading && !isProcessingImage}
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
            editable={!isLoading && !isProcessingImage}
          />
          {getFieldError('risposta') && (
            <Text style={styles.errorText}>{getFieldError('risposta')}</Text>
          )}
          <Text style={styles.charCount}>
            {getRemainingChars(risposta, 2000)}
          </Text>
        </View>

        {/* 🆕 SEZIONE MULTIPLE IMMAGINI */}
        <View style={styles.inputContainer}>
          <View style={styles.imageHeader}>
            <Text style={styles.inputLabel}>Immagini (opzionale)</Text>
            <Text style={styles.imageCounter}>
              {images.length}/{MAX_IMAGES_PER_NOZIONE}
            </Text>
          </View>

          {/* Gallery di immagini */}
          {images.length > 0 && (
            <FlatList
              data={images}
              renderItem={renderImageItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagesList}
              contentContainerStyle={styles.imagesListContent}
            />
          )}

          {/* Bottone per aggiungere immagini */}
          {images.length < MAX_IMAGES_PER_NOZIONE && (
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={handleAddImages}
              disabled={isProcessingImage || isLoading}
            >
              {isProcessingImage ? (
                <ActivityIndicator color="#3B82F6" />
              ) : (
                <>
                  <Text style={styles.addImageIcon}>📷</Text>
                  <Text style={styles.addImageText}>
                    {images.length === 0 ? 'Aggiungi immagini' : 'Aggiungi altre immagini'}
                  </Text>
                  <Text style={styles.addImageHint}>
                    Fotocamera o Galleria (max {MAX_IMAGES_PER_NOZIONE - images.length})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Info dimensione totale */}
          {images.length > 0 && (
            <View style={styles.imageInfo}>
              <Text style={styles.imageInfoText}>
                📊 {images.length} {images.length === 1 ? 'immagine' : 'immagini'} • ~{totalImagesSize}KB
              </Text>
            </View>
          )}

          <Text style={styles.imageHint}>
            💡 Puoi aggiungere fino a {MAX_IMAGES_PER_NOZIONE} immagini per aiutarti a ricordare meglio
          </Text>
        </View>

        {/* Preview */}
        {domanda.trim() && risposta.trim() && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Anteprima Nozione</Text>
            <View style={styles.previewCard}>
              <Text style={styles.previewQuestion}>{domanda.trim()}</Text>
              <View style={styles.previewDivider} />
              
              {/* Preview immagini */}
              {images.length > 0 && (
                <>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.previewImagesContainer}
                  >
                    {images.map((img) => (
                      <Image
                        key={img.id}
                        source={{ uri: ImageService.getDataUri(img.base64, img.type) }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                  <View style={styles.previewDivider} />
                </>
              )}
              
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
  // 🆕 NUOVI STILI PER MULTIPLE IMMAGINI
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  imagesList: {
    marginBottom: 12,
  },
  imagesListContent: {
    gap: 12,
  },
  imageItem: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  imageItemOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 8,
  },
  imageNumber: {
    alignSelf: 'flex-start',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  imageNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  removeImageIcon: {
    alignSelf: 'flex-end',
    backgroundColor: '#EF4444',
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addImageButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addImageIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
  },
  addImageHint: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  imageInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  imageInfoText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  imageHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
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
  previewImagesContainer: {
    marginBottom: 12,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
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
