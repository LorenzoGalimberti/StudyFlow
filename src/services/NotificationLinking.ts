// services/NotificationLinking.ts - CON GESTIONE TEST E DEEP LINK
import * as Notifications from 'expo-notifications';
import { NavigationContainerRef } from '@react-navigation/native';

export class NotificationLinking {
  private static instance: NotificationLinking;
  private navigationRef: NavigationContainerRef<any> | null = null;
  private isInitialized = false;
  private listeners: Notifications.Subscription[] = [];

  static getInstance(): NotificationLinking {
    if (!NotificationLinking.instance) {
      NotificationLinking.instance = new NotificationLinking();
    }
    return NotificationLinking.instance;
  }

  /**
   * Inizializza il servizio di deep linking
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.setupNotificationListeners();
    this.isInitialized = true;
    console.log('✅ NotificationLinking initialized');
  }

  /**
   * Imposta il riferimento al navigator principale
   */
  setNavigationRef(ref: NavigationContainerRef<any>): void {
    this.navigationRef = ref;
    console.log('✅ Navigation ref set for NotificationLinking');
  }

  /**
   * Configura i listener per le notifiche
   */
  private setupNotificationListeners(): void {
    // Listener per notifiche ricevute quando l'app è aperta
    const receivedListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Listener per il tap sulle notifiche
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    this.listeners.push(receivedListener, responseListener);
  }

  /**
   * Gestisce le notifiche ricevute quando l'app è in foreground
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const { data } = notification.request.content;
    const isTest = data?.isTest === true;
    
    console.log(`📱 Notification received in foreground: ${notification.request.content.title}`);
    
    if (isTest) {
      console.log('🧪 Test notification received - will redirect on tap');
    }
    
    // Qui potresti mostrare un banner custom o fare altre azioni
    // Per ora lasciamo che sia il sistema a gestire la visualizzazione
  }

  /**
   * Gestisce il tap dell'utente su una notifica - CON SUPPORTO TEST
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    console.log('👆 User tapped notification');
    
    const { data } = response.notification.request.content;
    
    // Log dettagliato per debug
    console.log('📊 Notification data:', {
      nozioneId: typeof data?.nozioneId === 'string' ? data.nozioneId.slice(0, 8) + '...' : 'unknown',
      giorno: data?.giorno,
      action: data?.action,
      isTest: data?.isTest
    });
    
    // Verifica che sia una notifica di ripasso con type safety
    if (
      data?.action === 'review' && 
      typeof data?.nozioneId === 'string' && 
      typeof data?.giorno === 'number'
    ) {
      
      if (data?.isTest === true) {
        console.log('🧪 Test notification tapped - navigating to review');
        this.navigateToReview(data.nozioneId, data.giorno, true);
      } else {
        console.log('📚 Regular notification tapped - navigating to review');
        this.navigateToReview(data.nozioneId, data.giorno, false);
      }
      
    } else {
      console.warn('⚠️ Invalid notification data:', data);
    }
  }

  /**
   * Naviga alla schermata di ripasso - CON SUPPORTO TEST
   */
  private navigateToReview(nozioneId: string, giorno: number, isTest: boolean = false): void {
    if (!this.navigationRef?.isReady()) {
      console.warn('⚠️ Navigation not ready, scheduling retry...');
      // Retry dopo un breve delay
      setTimeout(() => this.navigateToReview(nozioneId, giorno, isTest), 500);
      return;
    }

    try {
      if (isTest) {
        // Per il test, naviga alla HomeScreen e poi mostra un alert
        this.navigationRef.navigate('App', {
          screen: 'Home'
        });
        
        // Piccolo delay per assicurarsi che la navigazione sia completata
        setTimeout(() => {
          console.log('🧪 TEST SUCCESSFUL: Navigation and deep linking working!');
          console.log(`📍 Test destination: Review screen for nozione ${nozioneId.slice(0, 8)}... giorno ${giorno}`);
          
          // Potresti anche mostrare un alert qui se vuoi feedback visivo
          // Alert.alert('🧪 Test Riuscito!', 'Notifiche e deep linking funzionano correttamente');
        }, 1000);
        
      } else {
        // Navigazione normale per ripassi reali
        this.navigationRef.navigate('App', {
          screen: 'Review',
          params: { nozioneId, giorno }
        });
      }
      
      console.log(`✅ Navigated to ${isTest ? 'Home (test)' : 'Review'}: nozione=${nozioneId.slice(0, 8)}..., giorno=${giorno}`);
      
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  }

  /**
   * Gestisce le notifiche quando l'app viene aperta da stato chiuso
   */
  async handleInitialNotification(): Promise<void> {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      
      if (response) {
        console.log('🚀 App opened from notification');
        this.handleNotificationResponse(response);
      }
    } catch (error) {
      console.error('❌ Error handling initial notification:', error);
    }
  }

  /**
   * Pulisce i listener quando l'app viene chiusa
   */
  cleanup(): void {
    this.listeners.forEach(listener => listener.remove());
    this.listeners = [];
    this.isInitialized = false;
    console.log('🧹 NotificationLinking cleaned up');
  }

  /**
   * Metodo di debug per testare la navigazione
   */
  testNavigation(nozioneId: string, giorno: number): void {
    console.log('🧪 Testing navigation to Review screen...');
    this.navigateToReview(nozioneId, giorno, true);
  }
}
