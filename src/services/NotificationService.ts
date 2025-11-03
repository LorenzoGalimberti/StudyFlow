// services/NotificationService.ts - VERSIONE CORRETTA CON FIX + TEST 30 SECONDI
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
      console.log('🔔 Inizializzazione NotificationService...');

      // Richiedi permessi per le notifiche
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('⚠️ Permessi notifiche non concessi');
        this.isInitialized = false;
        return false;
      }

      this.isInitialized = true;
      console.log('✅ NotificationService inizializzato');
      return true;
    } catch (error) {
      console.error('❌ Errore inizializzazione notifiche:', error);
      this.isInitialized = false;
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
        console.log('📱 Richiedendo permessi notifiche...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log(`📱 Risposta utente: ${finalStatus}`);
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
        console.log('📱 Android notification channel OK');
      }

      return true;
    } catch (error) {
      console.error('❌ Errore richiesta permessi:', error);
      return false;
    }
  }

  /**
   * Programma le notifiche per una nozione - CON TEST 30 SECONDI
   * 
   * 🔧 FIX APPLICATO: Verifica sempre i permessi prima di programmare
   */
  async scheduleNotificationsForNozione(nozione: Nozione): Promise<string[]> {
    console.log('\n🔍 === INIZIO PROGRAMMAZIONE NOTIFICHE ===');
    console.log(`📝 Nozione: ${nozione.domanda.substring(0, 30)}...`);
    console.log(`🆔 ID: ${nozione.id.slice(0, 8)}...`);

    // ✨ CRITICAL FIX: Verifica SEMPRE i permessi prima di programmare
    // Questo risolve il bug del primo avvio!
    console.log('🔐 Verifica permessi...');
    const hasPermissions = await this.areNotificationsEnabled();
    console.log(`🔐 Risultato: ${hasPermissions ? '✅ CONCESSI' : '❌ NEGATI'}`);

    if (!hasPermissions) {
      console.warn('⚠️ Permessi non disponibili, tento reinizializzazione...');
      
      // Prova a reinizializzare
      const initialized = await this.initialize();
      if (!initialized) {
        console.error('❌ Reinizializzazione fallita - ABORT');
        return [];
      }
      
      // Verifica di nuovo dopo reinizializzazione
      const recheckPermissions = await this.areNotificationsEnabled();
      console.log(`🔐 Ricontrollo permessi: ${recheckPermissions ? '✅ OK' : '❌ FAIL'}`);
      
      if (!recheckPermissions) {
        console.error('❌ Permessi ancora non disponibili - ABORT');
        return [];
      }
      
      console.log('✅ Reinizializzazione riuscita!');
    }

    // Assicurati che il servizio sia inizializzato
    if (!this.isInitialized) {
      console.log('🔄 Servizio non inizializzato, inizializzo...');
      const initialized = await this.initialize();
      if (!initialized) {
        console.error('❌ Impossibile inizializzare - ABORT');
        return [];
      }
    }

    const notificationIds: string[] = [];
    const now = new Date();

    try {
      console.log(`📅 Ora corrente: ${now.toLocaleString('it-IT')}`);
      console.log(`📅 Nozione creata: ${new Date(nozione.dataCreazione).toLocaleString('it-IT')}`);

      let scheduledCount = 0;
      let skippedCount = 0;

      // 🧪 NOTIFICA DI TEST A 30 SECONDI - CON DEEP LINK
      console.log('\n🧪 Programmando notifica di TEST (30 secondi)...');
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
        console.log(`✅ TEST programmato: ID ${testNotificationId.slice(0, 8)}...`);
        console.log(`   📅 Arrivo previsto: ${testDate.toLocaleTimeString('it-IT')}`);
        console.log(`   🔔 Riceverai la notifica tra 30 secondi!`);
      } catch (error) {
        console.error(`❌ Errore programmazione TEST: ${error}`);
      }

      // NOTIFICHE DI RIPASSO NORMALI (1, 3, 7, 21 giorni)
      console.log('\n📚 Programmando notifiche di ripasso...');
      
      for (const ripasso of nozione.ripassi) {
        if (ripasso.completato) {
          console.log(`⏭️  Giorno ${ripasso.giorno}: già completato, skip`);
          skippedCount++;
          continue;
        }

        const dataRipasso = new Date(ripasso.dataRipasso);
        const diffMs = dataRipasso.getTime() - now.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        console.log(`\n📊 Giorno ${ripasso.giorno}:`);
        console.log(`   📅 Data: ${dataRipasso.toLocaleString('it-IT')}`);
        console.log(`   ⏰ Tra: ${diffDays}g ${diffHours}h ${diffMinutes}min`);

        // Salta notifiche nel passato
        if (dataRipasso <= now) {
          console.log(`   ❌ SKIP: nel passato (${diffMinutes} min fa)`);
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
          console.log(`   ✅ OK: ID ${notificationId.slice(0, 8)}...`);
        } catch (error) {
          console.error(`   ❌ ERRORE: ${error}`);
        }
      }

      // Verifica totale notifiche nel sistema
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      console.log('\n📊 === RIEPILOGO FINALE ===');
      console.log(`🧪 Test (30 sec):        1`);
      console.log(`✅ Ripassi programmati:  ${scheduledCount}`);
      console.log(`❌ Ripassi saltati:      ${skippedCount}`);
      console.log(`📋 Totale nel sistema:   ${allScheduled.length}`);
      console.log(`🎯 ID restituiti:        ${notificationIds.length}`);
      console.log('================================\n');

      return notificationIds;
    } catch (error) {
      console.error('💥 ERRORE CRITICO nella programmazione:', error);
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
      
      console.log(`✅ Notifiche cancellate`);
    } catch (error) {
      console.error('❌ Errore cancellazione notifiche:', error);
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
      
      console.log(`✅ Notifica aggiornata`);
    } catch (error) {
      console.error('❌ Errore aggiornamento notifiche:', error);
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
      console.error('❌ Errore cancellazione tutte notifiche:', error);
    }
  }

  /**
   * Ottiene tutte le notifiche programmate per debugging
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 Notifiche in sistema: ${notifications.length}`);
      return notifications;
    } catch (error) {
      console.error('❌ Errore recupero notifiche:', error);
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

    return `${shortDomanda}`;
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
   * 🔧 FIX: Questo metodo è ora chiamato SEMPRE prima di programmare
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const enabled = status === 'granted';
      // Log rimosso per non intasare i log
      return enabled;
    } catch (error) {
      console.error('❌ Errore verifica permessi:', error);
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
    
    console.log('🧪 Notifica di test immediata inviata');
  }

  /**
   * Reset del servizio (per gestione stato)
   */
  reset(): void {
    this.isInitialized = false;
    console.log('🔄 NotificationService resettato');
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
      
      const info = {
        permissions: status,
        scheduledCount: scheduled.length,
        initialized: this.isInitialized,
      };
      
      console.log('\n📊 DEBUG INFO:');
      console.log(`   Permessi: ${info.permissions}`);
      console.log(`   Notifiche: ${info.scheduledCount}`);
      console.log(`   Inizializzato: ${info.initialized}`);
      
      return info;
    } catch (error) {
      console.error('❌ Errore getDebugInfo:', error);
      return {
        permissions: 'error',
        scheduledCount: 0,
        initialized: false,
      };
    }
  }
}
