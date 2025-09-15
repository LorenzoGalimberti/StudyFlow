// services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Nozione, NotificationPayload } from '../types';

// Configurazione base delle notifiche
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Inizializza il servizio notifiche e richiede i permessi
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) return true;

      // Richiedi permessi per le notifiche
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Permessi notifiche non concessi');
        return false;
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Errore inizializzazione notifiche:', error);
      return false;
    }
  }

  /**
   * Richiede i permessi per le notifiche
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Configurazioni specifiche per Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Ripassi StudyFlow',
          description: 'Notifiche per i ripassi delle nozioni',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return true;
    } catch (error) {
      console.error('Errore richiesta permessi:', error);
      return false;
    }
  }

  /**
   * Programma le notifiche per una nozione (inclusa quella di test)
   */
  async scheduleNotificationsForNozione(nozione: Nozione): Promise<string[]> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return [];
    }

    const notificationIds: string[] = [];

    try {
      // // 1. NOTIFICA DI TEST A 10 SECONDI (per verificare deep linking)
      // const testNotificationId = await this.scheduleTestNotificationForNozione(nozione);
      // if (testNotificationId) {
      //   notificationIds.push(testNotificationId);
      // }

      // 2. NOTIFICHE NORMALI DI RIPASSO
      for (const ripasso of nozione.ripassi) {
        if (ripasso.completato) continue;

        const dataRipasso = new Date(ripasso.dataRipasso);
        const now = new Date();

        // Salta notifiche nel passato
        if (dataRipasso <= now) continue;

        const payload: NotificationPayload = {
          nozioneId: nozione.id,
          giorno: ripasso.giorno,
          title: '📚 Tempo di ripassare!',
          body: this.createNotificationBody(nozione.domanda),
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: payload.title,
            body: payload.body,
            data: {
              nozioneId: payload.nozioneId,
              giorno: payload.giorno,
              action: 'review',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: dataRipasso,
          },
        });

        notificationIds.push(notificationId);
      }

      return notificationIds;
    } catch (error) {
      console.error('Errore programmazione notifiche:', error);
      return [];
    }
  }

  // /**
  //  * Programma una notifica di test a 10 secondi per verificare il deep linking
  //  */
  // private async scheduleTestNotificationForNozione(nozione: Nozione): Promise<string | null> {
  //   try {
  //     const testDate = new Date(Date.now() + 10000); // 10 secondi da ora
      
  //     const notificationId = await Notifications.scheduleNotificationAsync({
  //       content: {
  //         title: '🧪 Nozione Creata!',
  //         body: `Test deep linking: "${this.createNotificationBody(nozione.domanda)}"`,
  //         data: {
  //           nozioneId: nozione.id,
  //           giorno: 1, // Usa giorno 1 per il test
  //           action: 'review',
  //           isTest: true, // Flag per identificare che è un test
  //         },
  //       },
  //       trigger: {
  //         type: Notifications.SchedulableTriggerInputTypes.DATE,
  //         date: testDate,
  //       },
  //     });

  //     console.log(`🧪 Notifica di test programmata per ${testDate.toLocaleTimeString()}`);
  //     return notificationId;
  //   } catch (error) {
  //     console.error('Errore programmazione notifica di test:', error);
  //     return null;
  //   }
  // }

  /**
   * Cancella le notifiche per una nozione specifica
   */
  async cancelNotificationsForNozione(nozioneId: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      const toCancel = scheduledNotifications
        .filter(notification => 
          notification.content.data?.nozioneId === nozioneId
        )
        .map(notification => notification.identifier);

      for (const id of toCancel) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    } catch (error) {
      console.error('Errore cancellazione notifiche:', error);
    }
  }

  /**
   * Aggiorna le notifiche quando un ripasso viene completato
   */
  async updateNotificationsAfterRipasso(
    nozioneId: string, 
    completedGiorno: number
  ): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Trova e cancella la notifica per il ripasso completato
      const toCancelIds = scheduledNotifications
        .filter(notification => 
          notification.content.data?.nozioneId === nozioneId &&
          notification.content.data?.giorno === completedGiorno
        )
        .map(notification => notification.identifier);

      for (const id of toCancelIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    } catch (error) {
      console.error('Errore aggiornamento notifiche:', error);
    }
  }

  /**
   * Cancella tutte le notifiche programmate
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Errore cancellazione tutte notifiche:', error);
    }
  }

  /**
   * Ottiene tutte le notifiche programmate per debugging
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Errore recupero notifiche:', error);
      return [];
    }
  }

  /**
   * Crea il corpo del messaggio della notifica
   */
  private createNotificationBody(domanda: string): string {
    const shortDomanda = domanda.length > 50 
      ? domanda.substring(0, 47) + '...'
      : domanda;

    return `È il momento di ripassare: "${shortDomanda}"`;
  }

  /**
   * Gestisce le notifiche ricevute quando l'app è aperta
   */
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Gestisce il tap sulle notifiche
   */
  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  /**
   * Verifica se le notifiche sono abilitate
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      return false;
    }
  }

  /**
   * Mostra notifica immediata per test
   */
  async showTestNotification(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 Test StudyFlow',
        body: 'Le notifiche funzionano correttamente!',
      },
      trigger: null, // Immediata
    });
  }
}
