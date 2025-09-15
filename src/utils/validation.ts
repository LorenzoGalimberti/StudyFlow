// utils/validation.ts
import { ValidationResult, ValidationError } from '../types';

export class ValidationUtils {
  
  /**
   * Valida una nozione (domanda e risposta)
   */
  static validateNozione(domanda: string, risposta: string): ValidationResult {
    const errors: ValidationError[] = [];

    // Validazione domanda
    const domandaValidation = this.validateDomanda(domanda);
    if (!domandaValidation.isValid) {
      errors.push(...domandaValidation.errors);
    }

    // Validazione risposta
    const rispostaValidation = this.validateRisposta(risposta);
    if (!rispostaValidation.isValid) {
      errors.push(...rispostaValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida il campo domanda
   */
  static validateDomanda(domanda: string): ValidationResult {
    const errors: ValidationError[] = [];
    const trimmedDomanda = domanda?.trim() || '';

    // Campo obbligatorio
    if (!trimmedDomanda) {
      errors.push({
        field: 'domanda',
        message: 'La domanda è obbligatoria',
      });
      return { isValid: false, errors };
    }

    // Lunghezza minima
    if (trimmedDomanda.length < 3) {
      errors.push({
        field: 'domanda',
        message: 'La domanda deve contenere almeno 3 caratteri',
      });
    }

    // Lunghezza massima
    if (trimmedDomanda.length > 500) {
      errors.push({
        field: 'domanda',
        message: 'La domanda non può superare 500 caratteri',
      });
    }

    // Caratteri speciali eccessivi
    const specialCharsCount = (trimmedDomanda.match(/[^a-zA-Z0-9\sàèéìòù.,;:!?'"()-]/g) || []).length;
    if (specialCharsCount > trimmedDomanda.length * 0.3) {
      errors.push({
        field: 'domanda',
        message: 'La domanda contiene troppi caratteri speciali',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida il campo risposta
   */
  static validateRisposta(risposta: string): ValidationResult {
    const errors: ValidationError[] = [];
    const trimmedRisposta = risposta?.trim() || '';

    // Campo obbligatorio
    if (!trimmedRisposta) {
      errors.push({
        field: 'risposta',
        message: 'La risposta è obbligatoria',
      });
      return { isValid: false, errors };
    }

    // Lunghezza minima
    if (trimmedRisposta.length < 2) {
      errors.push({
        field: 'risposta',
        message: 'La risposta deve contenere almeno 2 caratteri',
      });
    }

    // Lunghezza massima
    if (trimmedRisposta.length > 2000) {
      errors.push({
        field: 'risposta',
        message: 'La risposta non può superare 2000 caratteri',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida email
   */
  static validateEmail(email: string): ValidationResult {
    const errors: ValidationError[] = [];
    const trimmedEmail = email?.trim() || '';

    if (!trimmedEmail) {
      errors.push({
        field: 'email',
        message: 'L\'email è obbligatoria',
      });
      return { isValid: false, errors };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      errors.push({
        field: 'email',
        message: 'Inserisci un indirizzo email valido',
      });
    }

    if (trimmedEmail.length > 254) {
      errors.push({
        field: 'email',
        message: 'L\'email è troppo lunga',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida password
   */
  static validatePassword(password: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!password) {
      errors.push({
        field: 'password',
        message: 'La password è obbligatoria',
      });
      return { isValid: false, errors };
    }

    if (password.length < 6) {
      errors.push({
        field: 'password',
        message: 'La password deve contenere almeno 6 caratteri',
      });
    }

    if (password.length > 128) {
      errors.push({
        field: 'password',
        message: 'La password è troppo lunga (max 128 caratteri)',
      });
    }

    // Controllo caratteri comuni
    if (password === '123456' || password === 'password' || password === 'qwerty') {
      errors.push({
        field: 'password',
        message: 'Scegli una password più sicura',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida conferma password
   */
  static validatePasswordConfirmation(
    password: string, 
    confirmPassword: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!confirmPassword) {
      errors.push({
        field: 'confirmPassword',
        message: 'Conferma la password',
      });
      return { isValid: false, errors };
    }

    if (password !== confirmPassword) {
      errors.push({
        field: 'confirmPassword',
        message: 'Le password non coincidono',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitizza il testo rimuovendo caratteri pericolosi
   */
  static sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Rimuove script
      .replace(/<[^>]*>/g, '') // Rimuove tag HTML
      .replace(/[<>]/g, '') // Rimuove < e >
      .substring(0, 2000); // Limita lunghezza
  }

  /**
   * Formatta il testo per la visualizzazione
   */
  static formatText(text: string): string {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/\n\s*\n/g, '\n') // Rimuove righe vuote multiple
      .replace(/^\s+|\s+$/gm, '') // Rimuove spazi all'inizio e fine di ogni riga
      .substring(0, 2000);
  }

  /**
   * Conta le parole in un testo
   */
  static countWords(text: string): number {
    if (!text?.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }

  /**
   * Conta i caratteri (esclusi spazi)
   */
  static countCharacters(text: string, includeSpaces: boolean = true): number {
    if (!text) return 0;
    return includeSpaces ? text.length : text.replace(/\s/g, '').length;
  }

  /**
   * Verifica se il testo è troppo simile a un altro (per evitare duplicati)
   */
  static isSimilar(text1: string, text2: string, threshold: number = 0.8): boolean {
    if (!text1 || !text2) return false;
    
    const normalized1 = text1.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalized2 = text2.toLowerCase().replace(/\s+/g, ' ').trim();
    
    if (normalized1 === normalized2) return true;
    
    // Calcolo similarità semplice basato su Jaccard
    const words1 = new Set(normalized1.split(' '));
    const words2 = new Set(normalized2.split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    const similarity = intersection.size / union.size;
    return similarity >= threshold;
  }

  /**
   * Estrae le prime parole di un testo per preview
   */
  static extractPreview(text: string, maxWords: number = 10): string {
    if (!text?.trim()) return '';
    
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    
    return words.slice(0, maxWords).join(' ') + '...';
  }

  /**
   * Verifica se una stringa contiene solo spazi bianchi
   */
  static isWhitespaceOnly(text: string): boolean {
    return !text || /^\s*$/.test(text);
  }
}
