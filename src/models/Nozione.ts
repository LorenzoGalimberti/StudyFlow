// models/Nozione.ts - CON DEBUG DATE RIPASSI
import { Nozione, RipassoSchedule, RIPASSO_GIORNI } from '../types';
import { DatabaseService } from '../services/DatabaseService';
import { NotificationService } from '../services/NotificationService';

export class NozioneModel {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor() {
    this.db = new DatabaseService();
    this.notificationService = NotificationService.getInstance();
  }

  /**
   * Crea una nuova nozione con i ripassi programmati - CON DEBUG
   */
  static createNozione(
    domanda: string,
    risposta: string,
    userId: string
  ): Omit<Nozione, 'id'> {
    const now = new Date();
    const dataCreazione = now.toISOString();

    console.log('\n🔧 === DEBUG CREAZIONE NOZIONE ===');
    console.log(`📅 Data/ora creazione: ${now.toLocaleString('it-IT')}`);
    console.log(`📅 ISO creazione: ${dataCreazione}`);

    // Calcola le date dei ripassi
    const ripassi: RipassoSchedule[] = RIPASSO_GIORNI.map(giorno => {
      const dataRipasso = new Date(now);
      dataRipasso.setDate(dataRipasso.getDate() + giorno);
      
      console.log(`📊 Giorno ${giorno}: ${dataRipasso.toLocaleString('it-IT')} (${dataRipasso.toISOString()})`);
      
      return {
        giorno,
        dataRipasso: dataRipasso.toISOString(),
        completato: false,
      };
    });

    console.log('===================================\n');

    return {
      domanda,
      risposta,
      dataCreazione,
      ripassi,
      completato: false,
      userId,
    };
  }

  /**
   * Salva una nuova nozione nel database
   */
  async create(domanda: string, risposta: string, userId: string): Promise<string> {
    const nozioneData = NozioneModel.createNozione(domanda, risposta, userId);
    return await this.db.createNozione(nozioneData);
  }

  /**
   * Recupera tutte le nozioni dell'utente
   */
  async getAll(userId: string): Promise<Nozione[]> {
    return await this.db.getNozioniByUser(userId);
  }

  /**
   * Recupera una nozione specifica
   */
  async getById(id: string, userId: string): Promise<Nozione | null> {
    return await this.db.getNozione(id, userId);
  }

  /**
   * Aggiorna una nozione
   */
  async update(id: string, updates: Partial<Nozione>, userId: string): Promise<void> {
    await this.db.updateNozione(id, updates, userId);
  }

  /**
   * Elimina una nozione e cancella le relative notifiche
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      // Prima cancella le notifiche programmate per questa nozione
      await this.notificationService.cancelNotificationsForNozione(id);
      console.log(`🧹 Notifiche cancellate per nozione: ${id}`);
      
      // Poi elimina la nozione dal database
      await this.db.deleteNozione(id, userId);
      console.log(`🗑️ Nozione eliminata: ${id}`);
      
    } catch (error) {
      console.error('❌ Errore durante eliminazione nozione:', error);
      throw error;
    }
  }

  /**
   * Marca un ripasso come completato
   */
  async completeRipasso(
    nozioneId: string,
    giorno: number,
    userId: string
  ): Promise<void> {
    const nozione = await this.getById(nozioneId, userId);
    if (!nozione) {
      throw new Error('Nozione non trovata');
    }

    // Trova e aggiorna il ripasso specifico
    const ripassoIndex = nozione.ripassi.findIndex(r => r.giorno === giorno);
    if (ripassoIndex === -1) {
      throw new Error('Ripasso non trovato');
    }

    const ripassiAggiornati = [...nozione.ripassi];
    ripassiAggiornati[ripassoIndex] = {
      ...ripassiAggiornati[ripassoIndex],
      completato: true,
      dataCompletamento: new Date().toISOString(),
    };

    // Verifica se tutti i ripassi sono completati
    const tuttiCompletati = ripassiAggiornati.every(r => r.completato);

    await this.update(
      nozioneId,
      {
        ripassi: ripassiAggiornati,
        completato: tuttiCompletati,
      },
      userId
    );

    // Cancella la notifica specifica per questo ripasso
    await this.notificationService.updateNotificationsAfterRipasso(nozioneId, giorno);
  }

  /**
   * Recupera le nozioni che hanno ripassi da fare ora - COERENTE CON TUTTO IL SISTEMA
   */
  async getNozioniDaRipassare(userId: string): Promise<Nozione[]> {
    const tutte = await this.getAll(userId);
    const now = new Date(); // Usa orario preciso corrente invece di fine giornata

    return tutte.filter(nozione => {
      return nozione.ripassi.some(ripasso => {
        if (ripasso.completato) return false;
      
        const dataRipasso = new Date(ripasso.dataRipasso);
        // Confronto preciso al millisecondo - coerente con HomeScreen e NotificationService
        return dataRipasso <= now;
      });
    });
  }

  /**
   * Ottiene il prossimo ripasso in sospeso per una nozione
   */
  getNextRipasso(nozione: Nozione): RipassoSchedule | null {
    return nozione.ripassi.find(r => !r.completato) || null;
  }

  /**
   * Calcola quanti giorni mancano al prossimo ripasso
   */
  getGiorniAlProssimoRipasso(nozione: Nozione): number {
    const nextRipasso = this.getNextRipasso(nozione);
    if (!nextRipasso) return -1;

    const oggi = new Date();
    const dataRipasso = new Date(nextRipasso.dataRipasso);
    const diffTime = dataRipasso.getTime() - oggi.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }
}
