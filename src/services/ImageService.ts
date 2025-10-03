// src/services/ImageService.ts - CON SUPPORTO MULTIPLE IMMAGINI
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import { NozioneImage, MAX_IMAGES_PER_NOZIONE } from '../types';

/**
 * Service per gestire selezione, compressione e conversione immagini in Base64
 * ✨ AGGIORNATO: Supporto per multiple immagini
 */
export class ImageService {
  
  // Configurazione dimensioni e qualità 
  private static readonly MAX_WIDTH = 1200;
  private static readonly COMPRESSION_QUALITY = 0.8;
  private static readonly MAX_SIZE_KB = 400;

  /**
   * Richiede i permessi per accedere alla galleria
   */
  static async requestGalleryPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permesso negato',
          'Per aggiungere immagini alle tue nozioni, devi concedere l\'accesso alla galleria.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Errore richiesta permessi galleria:', error);
      return false;
    }
  }

  /**
   * Richiede i permessi per accedere alla fotocamera
   */
  static async requestCameraPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permesso negato',
          'Per scattare foto delle tue nozioni, devi concedere l\'accesso alla fotocamera.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Errore richiesta permessi fotocamera:', error);
      return false;
    }
  }

  /**
   * 🆕 Apre la galleria per selezionare MULTIPLE immagini
   */
  static async pickMultipleFromGallery(
    currentCount: number = 0
  ): Promise<NozioneImage[]> {
    try {
      const hasPermission = await this.requestGalleryPermissions();
      if (!hasPermission) return [];

      const remainingSlots = MAX_IMAGES_PER_NOZIONE - currentCount;
      
      if (remainingSlots <= 0) {
        Alert.alert(
          'Limite raggiunto',
          `Puoi aggiungere massimo ${MAX_IMAGES_PER_NOZIONE} immagini per nozione.`
        );
        return [];
      }

      // Apri galleria - SENZA CROP!
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,  // 🆕 SELEZIONE MULTIPLA!
        quality: 1,
        selectionLimit: remainingSlots, // Limita in base agli slot disponibili
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return [];
      }

      // Processa tutte le immagini selezionate
      const processedImages: NozioneImage[] = [];
      
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        const processed = await this.processImage(asset.uri);
        
        if (processed) {
          processedImages.push({
            id: this.generateImageId(),
            base64: processed.base64,
            type: processed.type,
            createdAt: new Date().toISOString(),
            order: currentCount + i,
          });
        }
      }

      console.log(`✅ ${processedImages.length} immagini processate dalla galleria`);
      return processedImages;
      
    } catch (error) {
      console.error('Errore selezione multiple immagini:', error);
      Alert.alert('Errore', 'Impossibile caricare le immagini dalla galleria');
      return [];
    }
  }

  /**
   * Apre la galleria per selezionare UNA singola immagine (retrocompatibilità)
   */
  static async pickFromGallery(): Promise<{ base64: string; type: string } | null> {
    try {
      const hasPermission = await this.requestGalleryPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        return null;
      }

      return await this.processImage(result.assets[0].uri);
      
    } catch (error) {
      console.error('Errore selezione immagine da galleria:', error);
      Alert.alert('Errore', 'Impossibile caricare l\'immagine dalla galleria');
      return null;
    }
  }

  /**
   * Apre la fotocamera per scattare una foto
   */
  static async takePhoto(currentCount: number = 0): Promise<NozioneImage | null> {
    try {
      if (currentCount >= MAX_IMAGES_PER_NOZIONE) {
        Alert.alert(
          'Limite raggiunto',
          `Puoi aggiungere massimo ${MAX_IMAGES_PER_NOZIONE} immagini per nozione.`
        );
        return null;
      }

      const hasPermission = await this.requestCameraPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        return null;
      }

      const processed = await this.processImage(result.assets[0].uri);
      
      if (!processed) return null;

      return {
        id: this.generateImageId(),
        base64: processed.base64,
        type: processed.type,
        createdAt: new Date().toISOString(),
        order: currentCount,
      };
      
    } catch (error) {
      console.error('Errore scatto foto:', error);
      Alert.alert('Errore', 'Impossibile scattare la foto');
      return null;
    }
  }

  /**
   * Processa l'immagine: ridimensiona PROPORZIONALMENTE, comprimi e converti in Base64
   */
  private static async processImage(uri: string): Promise<{ base64: string; type: string } | null> {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: this.MAX_WIDTH,
            },
          },
        ],
        {
          compress: this.COMPRESSION_QUALITY,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!manipulatedImage.base64) {
        throw new Error('Impossibile convertire immagine in Base64');
      }

      const sizeInKB = this.getBase64SizeInKB(manipulatedImage.base64);
      
      if (sizeInKB > this.MAX_SIZE_KB) {
        const furtherCompressed = await ImageManipulator.manipulateAsync(
          uri,
          [
            {
              resize: {
                width: Math.floor(this.MAX_WIDTH * 0.75),
              },
            },
          ],
          {
            compress: this.COMPRESSION_QUALITY * 0.7,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );

        if (!furtherCompressed.base64) {
          throw new Error('Impossibile comprimere ulteriormente l\'immagine');
        }

        const newSize = this.getBase64SizeInKB(furtherCompressed.base64);
        
        if (newSize > this.MAX_SIZE_KB) {
          Alert.alert(
            'Immagine troppo grande',
            `L'immagine è troppo grande (${newSize}KB). Saltata.`
          );
          return null;
        }

        return {
          base64: furtherCompressed.base64,
          type: 'image/jpeg',
        };
      }

      return {
        base64: manipulatedImage.base64,
        type: 'image/jpeg',
      };
      
    } catch (error) {
      console.error('Errore processamento immagine:', error);
      return null;
    }
  }

  /**
   * Calcola la dimensione di una stringa Base64 in KB
   */
  private static getBase64SizeInKB(base64: string): number {
    const sizeInBytes = (base64.length * 3) / 4;
    return Math.round(sizeInBytes / 1024);
  }

  /**
   * 🆕 Mostra dialog con opzioni per aggiungere immagini
   */
  static showImagePickerOptions(
    currentCount: number,
    onGallery: () => void,
    onCamera: () => void
  ): void {
    const remainingSlots = MAX_IMAGES_PER_NOZIONE - currentCount;

    if (remainingSlots <= 0) {
      Alert.alert(
        'Limite raggiunto',
        `Hai raggiunto il limite di ${MAX_IMAGES_PER_NOZIONE} immagini per questa nozione.`
      );
      return;
    }

    Alert.alert(
      'Aggiungi immagini',
      `Puoi aggiungere ancora ${remainingSlots} ${remainingSlots === 1 ? 'immagine' : 'immagini'}`,
      [
        {
          text: '📷 Fotocamera',
          onPress: onCamera,
        },
        {
          text: '🖼️ Galleria (multiple)',
          onPress: onGallery,
        },
        {
          text: 'Annulla',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  }

  /**
   * Converte Base64 in Data URI per visualizzazione
   */
  static getDataUri(base64: string, type: string = 'image/jpeg'): string {
    return `data:${type};base64,${base64}`;
  }

  /**
   * 🆕 Genera un ID univoco per l'immagine
   */
  private static generateImageId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🆕 Riordina array di immagini
   */
  static reorderImages(images: NozioneImage[]): NozioneImage[] {
    return images
      .sort((a, b) => a.order - b.order)
      .map((img, index) => ({
        ...img,
        order: index,
      }));
  }

  /**
   * 🆕 Calcola dimensione totale di tutte le immagini
   */
  static getTotalImagesSize(images: NozioneImage[]): number {
    return images.reduce((total, img) => {
      return total + this.getBase64SizeInKB(img.base64);
    }, 0);
  }

  /**
   * Valida se una stringa Base64 è valida
   */
  static isValidBase64(base64: string): boolean {
    try {
      return btoa(atob(base64)) === base64;
    } catch (error) {
      return false;
    }
  }
}
