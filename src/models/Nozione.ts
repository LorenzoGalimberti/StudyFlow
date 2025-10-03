// models/Nozione.ts - CON SUPPORTO MULTIPLE IMMAGINI
import { Nozione, RipassoSchedule, RIPASSO_GIORNI, NozioneImage } from '../types';
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
   * Crea una nuova nozione con i ripassi programmati
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
   * 🆕 Crea una nuova nozione con supporto MULTIPLE immagini
   */
  static createNozioneWithImages(
    domanda: string,
    risposta: string,
    userId: string,
    images?: NozioneImage[]
  ): Omit<Nozione, 'id'> {
    const baseNozione = this.createNozione(domanda, risposta, userId);
    
    // Aggiungi immagini se presenti
    if (images && images.length > 0) {
      const totalSize = images.reduce((sum, img) => {
        return sum + Math.round((img.base64.length * 3) / 4 / 1024);
      }, 0);
      
      console.log(`🖼️ ${images.length} immagini presenti - Dimensione totale: ~${totalSize}KB`);
      
      return {
        ...baseNozione,
        images,
      };
    }
    
    return baseNozione;
  }

  /**
   * ⚠️ DEPRECATO - Usa createWithImages()
   * Mantenuto per retrocompatibilità
   */
  static createNozioneWithImage(
    domanda: string,
    risposta: string,
    userId: string,
    imageBase64?: string,
    imageType?: string
  ): Omit<Nozione, 'id'> {
    const baseNozione = this.createNozione(domanda, risposta, userId);
    
    if (imageBase64 && imageType) {
      // Migra a nuovo formato
      const image: NozioneImage = {
        id: `img_${Date.now()}_legacy`,
        base64: imageBase64,
        type: imageType,
        createdAt: new Date().toISOString(),
        order: 0,
      };
      
      return {
        ...baseNozione,
        images: [image],
        // Mantieni anche i vecchi campi per compatibilità
        imageBase64,
        imageType,
      };
    }
    
    return baseNozione;
  }

  /**
   * Salva una nuova nozione nel database (senza immagini)
   */
  async create(domanda: string, risposta: string, userId: string): Promise<string> {
    const nozioneData = NozioneModel.createNozione(domanda, risposta, userId);
    return await this.db.createNozione(nozioneData);
  }

  /**
   * 🆕 Salva una nuova nozione con MULTIPLE immagini
   */
  async createWithImages(
    domanda: string,
    risposta: string,
    userId: string,
    images?: NozioneImage[]
  ): Promise<string> {
    const nozioneData = NozioneModel.createNozioneWithImages(
      domanda,
      risposta,
      userId,
      images
    );
    
    console.log('💾 Salvando nozione con immagini:', {
      hasImages: !!(images && images.length > 0),
      imageCount: images?.length || 0,
      totalSize: images ? `${images.reduce((sum, img) => sum + Math.round((img.base64.length * 3) / 4 / 1024), 0)}KB` : 'N/A',
    });
    
    return await this.db.createNozione(nozioneData);
  }

  /**
   * ⚠️ DEPRECATO - Usa createWithImages()
   * Mantenuto per retrocompatibilità
   */
  async createWithImage(
    domanda: string,
    risposta: string,
    userId: string,
    imageBase64?: string,
    imageType?: string
  ): Promise<string> {
    const nozioneData = NozioneModel.createNozioneWithImage(
      domanda,
      risposta,
      userId,
      imageBase64,
      imageType
    );
    
    return await this.db.createNozione(nozioneData);
  }

  /**
   * Recupera tutte le nozioni dell'utente
   */
  async getAll(userId: string): Promise<Nozione[]> {
    const nozioni = await this.db.getNozioniByUser(userId);
    
    // Migra vecchie nozioni al nuovo formato se necessario
    return nozioni.map(n => this.migrateToNewFormat(n));
  }

  /**
   * Recupera una nozione specifica
   */
  async getById(id: string, userId: string): Promise<Nozione | null> {
    const nozione = await this.db.getNozione(id, userId);
    
    if (!nozione) return null;
    
    // Migra al nuovo formato se necessario
    return this.migrateToNewFormat(nozione);
  }

  /**
   * 🆕 Migra vecchie nozioni con singola immagine al nuovo formato
   */
  private migrateToNewFormat(nozione: Nozione): Nozione {
    // Se ha già il nuovo formato, ritorna così com'è
    if (nozione.images && nozione.images.length > 0) {
      return nozione;
    }
    
    // Se ha il vecchio formato, migra
    if (nozione.imageBase64 && nozione.imageType) {
      const migratedImage: NozioneImage = {
        id: `img_${Date.now()}_migrated`,
        base64: nozione.imageBase64,
        type: nozione.imageType,
        createdAt: nozione.dataCreazione,
        order: 0,
      };
      
      return {
        ...nozione,
        images: [migratedImage],
      };
    }
    
    return nozione;
  }

  /**
   * Aggiorna una nozione
   */
  async update(id: string, updates: Partial<Nozione>, userId: string): Promise<void> {
    await this.db.updateNozione(id, updates, userId);
  }

  /**
   * 🆕 Aggiorna le immagini di una nozione
   */
  async updateImages(
    id: string,
    userId: string,
    images: NozioneImage[]
  ): Promise<void> {
    const updates: Partial<Nozione> = {
      images,
    };
    
    await this.db.updateNozione(id, updates, userId);
    console.log(`✅ ${images.length} immagini aggiornate per nozione:`, id);
  }

  /**
   * 🆕 Aggiungi immagini a una nozione esistente
   */
  async addImages(
    id: string,
    userId: string,
    newImages: NozioneImage[]
  ): Promise<void> {
    const nozione = await this.getById(id, userId);
    if (!nozione) {
      throw new Error('Nozione non trovata');
    }

    const currentImages = nozione.images || [];
    const updatedImages = [...currentImages, ...newImages];

    await this.updateImages(id, userId, updatedImages);
  }

  /**
   * 🆕 Rimuovi un'immagine specifica
   */
  async removeImage(
    id: string,
    userId: string,
    imageId: string
  ): Promise<void> {
    const nozione = await this.getById(id, userId);
    if (!nozione) {
      throw new Error('Nozione non trovata');
    }

    const updatedImages = (nozione.images || [])
      .filter(img => img.id !== imageId)
      .map((img, index) => ({
        ...img,
        order: index, // Riordina dopo rimozione
      }));

    await this.updateImages(id, userId, updatedImages);
    console.log(`🗑️ Immagine ${imageId} rimossa da nozione ${id}`);
  }

  /**
   * ⚠️ DEPRECATO - Usa updateImages()
   * Mantenuto per retrocompatibilità
   */
  async updateImage(
    id: string,
    userId: string,
    imageBase64?: string,
    imageType?: string
  ): Promise<void> {
    if (imageBase64 && imageType) {
      const image: NozioneImage = {
        id: `img_${Date.now()}_update`,
        base64: imageBase64,
        type: imageType,
        createdAt: new Date().toISOString(),
        order: 0,
      };
      
      await this.updateImages(id, userId, [image]);
    } else {
      await this.updateImages(id, userId, []);
    }
  }

  /**
   * Elimina una nozione e cancella le relative notifiche
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      await this.notificationService.cancelNotificationsForNozione(id);
      console.log(`🧹 Notifiche cancellate per nozione: ${id}`);
      
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

    const tuttiCompletati = ripassiAggiornati.every(r => r.completato);

    await this.update(
      nozioneId,
      {
        ripassi: ripassiAggiornati,
        completato: tuttiCompletati,
      },
      userId
    );

    await this.notificationService.updateNotificationsAfterRipasso(nozioneId, giorno);
  }

  /**
   * Recupera le nozioni che hanno ripassi da fare ora
   */
  async getNozioniDaRipassare(userId: string): Promise<Nozione[]> {
    const tutte = await this.getAll(userId);
    const now = new Date();

    return tutte.filter(nozione => {
      return nozione.ripassi.some(ripasso => {
        if (ripasso.completato) return false;
        const dataRipasso = new Date(ripasso.dataRipasso);
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

  /**
   * Ottiene statistiche sulle nozioni dell'utente
   */
  async getStatistiche(userId: string): Promise<{
    totale: number;
    completate: number;
    inCorso: number;
    conImmagine: number;
    totalImages: number;
  }> {
    const nozioni = await this.getAll(userId);
    
    return {
      totale: nozioni.length,
      completate: nozioni.filter(n => n.completato).length,
      inCorso: nozioni.filter(n => !n.completato).length,
      conImmagine: nozioni.filter(n => (n.images && n.images.length > 0) || n.imageBase64).length,
      totalImages: nozioni.reduce((sum, n) => sum + (n.images?.length || 0), 0),
    };
  }
}