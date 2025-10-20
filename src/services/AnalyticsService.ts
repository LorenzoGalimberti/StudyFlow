// src/services/AnalyticsService.ts - Versione NATIVA per Firebase Analytics
import analytics from '@react-native-firebase/analytics';

class AnalyticsService {
  constructor() {
    console.log('✅ Firebase Analytics nativo inizializzato');
  }

  /**
   * Traccia la creazione di una nozione
   */
  async trackNozioneCreated(
    nozioneId: string, 
    domanda: string, 
    risposta: string,
    hasImages: boolean = false
  ) {
    try {
      const contentLength = domanda.length + risposta.length;
      
      await analytics().logEvent('nozione_created', {
        nozione_id: nozioneId,
        content_length: contentLength,
        has_images: hasImages,
        timestamp: new Date().toISOString(),
      });
      
      console.log('📊 Evento tracciato: nozione_created', { 
        nozioneId, 
        contentLength,
        hasImages 
      });
    } catch (error) {
      console.warn('Errore tracking evento:', error);
    }
  }

  /**
   * Traccia l'eliminazione di una nozione
   */
  async trackNozioneDeleted(nozioneId: string) {
    try {
      await analytics().logEvent('nozione_deleted', {
        nozione_id: nozioneId,
        timestamp: new Date().toISOString(),
      });
      
      console.log('📊 Evento tracciato: nozione_deleted', nozioneId);
    } catch (error) {
      console.warn('Errore tracking eliminazione:', error);
    }
  }

  /**
   * Traccia il completamento di un ripasso
   */
  async trackRipassoCompleted(nozioneId: string, giorno: number) {
    try {
      await analytics().logEvent('ripasso_completed', {
        nozione_id: nozioneId,
        giorno_ripasso: giorno,
        timestamp: new Date().toISOString(),
      });
      
      console.log('📊 Evento tracciato: ripasso_completed', { nozioneId, giorno });
    } catch (error) {
      console.warn('Errore tracking ripasso:', error);
    }
  }

  /**
   * Traccia l'apertura di una notifica
   */
  async trackNotificationOpened(nozioneId: string, giorno: number) {
    try {
      await analytics().logEvent('notification_opened', {
        nozione_id: nozioneId,
        giorno_ripasso: giorno,
        timestamp: new Date().toISOString(),
      });
      
      console.log('📊 Evento tracciato: notification_opened', { nozioneId, giorno });
    } catch (error) {
      console.warn('Errore tracking notification:', error);
    }
  }

  /**
   * Imposta l'ID utente per tracciare il comportamento
   */
  async setUser(userId: string) {
    try {
      await analytics().setUserId(userId);
      console.log('📊 User ID impostato per Analytics:', userId);
    } catch (error) {
      console.warn('Errore impostazione User ID:', error);
    }
  }

  /**
   * Traccia visualizzazioni schermata
   */
  async trackScreenView(screenName: string) {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      });
      console.log('📊 Screen view tracciato:', screenName);
    } catch (error) {
      console.warn('Errore tracking screen view:', error);
    }
  }
}

// Esporta istanza singleton
export const analyticsService = new AnalyticsService();