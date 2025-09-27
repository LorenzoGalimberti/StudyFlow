// services/NotificationService.ts - CON TEST 30 SECONDI E DEEP LINK
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
   * Programma le notifiche per una nozione - CON TEST 30 SECONDI
   */
  async scheduleNotificationsForNozione(nozione: Nozione): Promise<string[]> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return [];
    }

    const notificationIds: string[] = [];
    const now = new Date();

    try {
      console.log('\n🔍 === DEBUG PROGRAMMAZIONE NOTIFICHE ===');
      console.log(`📅 Nozione: ${nozione.id.slice(0, 8)}...`);
      console.log(`📅 Creata: ${new Date(nozione.dataCreazione).toLocaleString('it-IT')}`);
      console.log(`📅 Ora corrente: ${now.toLocaleString('it-IT')}`);
      
      // Verifica permessi
      const hasPermissions = await this.areNotificationsEnabled();
      console.log(`🔐 Permessi: ${hasPermissions ? 'CONCESSI' : 'NEGATI'}`);

      let scheduledCount = 0;
      let skippedCount = 0;

      // 🧪 NOTIFICA DI TEST A 30 SECONDI - CON DEEP LINK
      try {
        const testDate = new Date(now.getTime() + 30000); // 30 secondi da ora
        
        const testNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🧪 TEST StudyFlow (30sec)',
            body: `Test immediato: "${this.createNotificationBody(nozione.domanda)}"`,
            data: {
              nozioneId: nozione.id,
              giorno: 0, // Giorno 0 = test
              action: 'review',
              isTest: true,
              testTime: testDate.toISOString()
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: testDate,
          },
        });

        notificationIds.push(testNotificationId);
        console.log(`🧪 TEST NOTIFICA: ID ${testNotificationId.slice(0, 8)}... programmata per ${testDate.toLocaleTimeString('it-IT')}`);
      } catch (error) {
        console.log(`💥 ERRORE TEST: ${error}`);
      }

      // NOTIFICHE DI RIPASSO NORMALI (1, 3, 7, 21 giorni)
      for (const ripasso of nozione.ripassi) {
        if (ripasso.completato) {
          console.log(`⏭️ Saltato giorno ${ripasso.giorno}: già completato`);
          continue;
        }

        const dataRipasso = new Date(ripasso.dataRipasso);
        const diffMs = dataRipasso.getTime() - now.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        console.log(`\n📊 Ripasso giorno ${ripasso.giorno}:`);
        console.log(`   📅 Data: ${dataRipasso.toLocaleString('it-IT')}`);
        console.log(`   ⏰ Tra: ${diffDays}d ${diffHours}h ${diffMinutes}min`);

        // Salta notifiche nel passato
        if (dataRipasso <= now) {
          console.log(`   ❌ SALTATO: Nel passato (diff: ${diffMinutes} min)`);
          skippedCount++;
          continue;
        }

        const payload: NotificationPayload = {
          nozioneId: nozione.id,
          giorno: ripasso.giorno,
          title: '📚 Tempo di ripassare!',
          body: this.createNotificationBody(nozione.domanda),
        };

        try {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: payload.title,
              body: payload.body,
              data: {
                nozioneId: payload.nozioneId,
                giorno: payload.giorno,
                action: 'review',
                isTest: false
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: dataRipasso,
            },
          });

          notificationIds.push(notificationId);
          scheduledCount++;
          console.log(`   ✅ PROGRAMMATA: ID ${notificationId.slice(0, 8)}...`);
        } catch (error) {
          console.log(`   💥 ERRORE: ${error}`);
        }
      }

      // Verifica totale notifiche nel sistema
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      console.log('\n📊 === RIEPILOGO ===');
      console.log(`🧪 Test (30sec): 1`);
      console.log(`✅ Programmate: ${scheduledCount}`);
      console.log(`❌ Saltate: ${skippedCount}`);
      console.log(`📋 Totale notifiche sistema: ${allScheduled.length}`);
      console.log('===============================\n');

      return notificationIds;
    } catch (error) {
      console.error('💥 Errore programmazione notifiche:', error);
      return [];
    }
  }

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

      console.log(`🧹 Cancellando ${toCancel.length} notifiche per nozione ${nozioneId.slice(0, 8)}...`);

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

      console.log(`🎯 Cancellando notifica giorno ${completedGiorno} per nozione ${nozioneId.slice(0, 8)}...`);

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
      console.log('🧹 Tutte le notifiche cancellate');
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
   * Mostra notifica immediata per test (solo se necessario)
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

  /**
   * 📊 Debug info per troubleshooting
   */
  async getDebugInfo(): Promise<{
    permissions: string;
    scheduledCount: number;
    initialized: boolean;
  }> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      return {
        permissions: status,
        scheduledCount: scheduled.length,
        initialized: this.isInitialized,
      };
    } catch (error) {
      return {
        permissions: 'error',
        scheduledCount: 0,
        initialized: false,
      };
    }
  }
}
