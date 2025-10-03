// screens/app/EditNotionScreen.tsx - Con supporto MULTIPLE immagini
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { NozioneModel } from '../../models/Nozione';
import { Nozione, NozioneImage, MAX_IMAGES_PER_NOZIONE } from '../../types';
import { ValidationUtils } from '../../utils/validation';
import { ValidationError } from '../../types';
import { ErrorHandler } from '../../utils/errorHandling';
import { ImageService } from '../../services/ImageService';

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
  
  // 🆕 NUOVI STATI PER MULTIPLE IMMAGINI
  const [images, setImages] = useState<NozioneImage[]>([]);
  const [originalImages, setOriginalImages] = useState<NozioneImage[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const nozioneModel = new NozioneModel();

  useEffect(() => {
    loadNozione();
  }, []);

  const hasChanges = (): boolean => {
    const textChanged = domanda.trim() !== originalDomanda.trim() || 
                        risposta.trim() !== originalRisposta.trim();
    const imagesChanged = JSON.stringify(images) !== JSON.stringify(originalImages);
    return textChanged || imagesChanged;
  };

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
          disabled={isProcessingImage}
        >
          <Text style={styles.removeImageIconText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleSave = async () => {
    if (!user?.uid || !nozione) {
      Alert.alert('Errore', 'Dati mancanti per il salvataggio');
      return;
    }

    const validation = ValidationUtils.validateNozione(domanda.trim(), risposta.trim());
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);

    try {
      if (hasChanges()) {
        const updates: Partial<Nozione> = {
          domanda: domanda.trim(),
          risposta: risposta.trim(),
        };

        // 🆕 Aggiorna immagini se modificate
        if (JSON.stringify(images) !== JSON.stringify(originalImages)) {
          updates.images = images.length > 0 ? images : undefined;
        }

        await nozioneModel.update(nozioneId, updates, user.uid);

        setDomanda(domanda.trim());
        setRisposta(risposta.trim());
        setOriginalDomanda(domanda.trim());
        setOriginalRisposta(risposta.trim());
        setOriginalImages([...images]);

        Alert.alert(
          'Modifiche Salvate!',
          `La tua nozione è stata aggiornata con successo${images.length !== originalImages.length ? ` (${images.length} ${images.length === 1 ? 'immagine' : 'immagini'})` : ''}.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        navigation.goBack();
      }

    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      Alert.alert('Errore', appError.message);
      ErrorHandler.logError(appError, 'EditNotionScreen.handleSave');
    }
  };

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

  useEffect(() => {
    const canSave = domanda.trim() && risposta.trim() && hasChanges();
    
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={handleCancel}
          style={styles.headerButton}
        >
          <Text style={styles.headerCancelText}>Annulla</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleSave}
          disabled={!canSave || isProcessingImage}
          style={styles.headerButton}
        >
          <Text style={[
            styles.headerSaveText,
            (!canSave || isProcessingImage) && styles.headerSaveTextDisabled
          ]}>
            Salva
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [domanda, risposta, originalDomanda, originalRisposta, images, originalImages, isProcessingImage]);

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
      
      // 🆕 Carica immagini se presenti
      const loadedImages = loadedNozione.images || [];
      setImages(loadedImages);
      setOriginalImages(loadedImages);
      
      console.log(`📸 Caricate ${loadedImages.length} immagini`);
    } catch (error) {
      const appError = ErrorHandler.handleFirebaseError(error);
      Alert.alert('Errore', appError.message);
      navigation.goBack();
    } finally {
      setIsLoadingNotion(false);
    }
  };

  const getFieldError = (fieldName: string): string | undefined => {
    const fieldError = validationErrors.find(error => error.field === fieldName);
    return fieldError?.message;
  };

  const getRemainingChars = (text: string, maxLength: number): string => {
    const remaining = maxLength - text.length;
    return `${remaining} caratteri rimanenti`;
  };

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

  const totalImagesSize = images.length > 0 ? ImageService.getTotalImagesSize(images) : 0;

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
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>✏️</Text>
            <Text style={styles.infoText}>
              Puoi modificare domanda, risposta e immagini. I ripassi programmati rimarranno invariati.
            </Text>
          </View>

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
              editable={!isProcessingImage}
            />
            {getFieldError('domanda') && (
              <Text style={styles.errorText}>{getFieldError('domanda')}</Text>
            )}
            <Text style={styles.charCount}>
              {getRemainingChars(domanda, 500)}
            </Text>
          </View>

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
              editable={!isProcessingImage}
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
                disabled={isProcessingImage}
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

            {/* Banner se immagini sono state modificate */}
            {JSON.stringify(images) !== JSON.stringify(originalImages) && (
              <View style={styles.imageChangedBanner}>
                <Text style={styles.imageChangedText}>
                  ✓ Immagini modificate (salva per confermare)
                </Text>
              </View>
            )}

            <Text style={styles.imageHint}>
              💡 Puoi aggiungere, rimuovere o modificare le immagini
            </Text>
          </View>

          {/* Preview delle modifiche */}
          {hasChanges() && (
            <View style={styles.changesContainer}>
              <Text style={styles.changesTitle}>Anteprima Modifiche</Text>
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
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerCancelText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  headerSaveText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSaveTextDisabled: {
    color: '#9CA3AF',
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
  // 🆕 STILI MULTIPLE IMMAGINI
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
  imageChangedBanner: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  imageChangedText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  imageHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
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
