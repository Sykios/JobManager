import { Contact } from '../types';

export class ContactModel {
  id: number;
  company_id?: number;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  linkedin_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  constructor(data: Partial<Contact> & { first_name: string }) {
    this.id = data.id || 0;
    this.company_id = data.company_id;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.email = data.email;
    this.phone = data.phone;
    this.position = data.position;
    this.linkedin_url = data.linkedin_url;
    this.notes = data.notes;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  /**
   * Convert the model instance to a plain object for database operations
   */
  toJSON(): Contact {
    return {
      id: this.id,
      company_id: this.company_id,
      first_name: this.first_name,
      last_name: this.last_name,
      email: this.email,
      phone: this.phone,
      position: this.position,
      linkedin_url: this.linkedin_url,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Create a Contact model instance from database row
   */
  static fromJSON(data: Contact): ContactModel {
    return new ContactModel(data);
  }

  /**
   * Get the full name of the contact
   */
  getFullName(): string {
    return this.last_name 
      ? `${this.first_name} ${this.last_name}`
      : this.first_name;
  }

  /**
   * Get display name with position if available
   */
  getDisplayName(): string {
    const fullName = this.getFullName();
    return this.position ? `${fullName} (${this.position})` : fullName;
  }

  /**
   * Get initials for avatar display
   */
  getInitials(): string {
    const firstInitial = this.first_name.charAt(0).toUpperCase();
    const lastInitial = this.last_name ? this.last_name.charAt(0).toUpperCase() : '';
    return firstInitial + lastInitial;
  }

  /**
   * Check if contact has complete information
   */
  isComplete(): boolean {
    return !!(
      this.first_name &&
      (this.email || this.phone) &&
      (this.last_name || this.position)
    );
  }

  /**
   * Get formatted phone number (basic German formatting)
   */
  getFormattedPhone(): string | undefined {
    if (!this.phone) return undefined;
    
    // Remove all non-digits
    const digits = this.phone.replace(/\D/g, '');
    
    // Basic German mobile format
    if (digits.startsWith('49') && digits.length >= 11) {
      return `+${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5)}`;
    }
    
    // Basic German landline format  
    if (digits.startsWith('49') && digits.length >= 10) {
      return `+${digits.substring(0, 2)} ${digits.substring(2, 4)} ${digits.substring(4)}`;
    }
    
    // Austrian mobile format
    if (digits.startsWith('43') && digits.length >= 10) {
      return `+${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5)}`;
    }
    
    // Default formatting
    if (digits.length >= 10) {
      return `+${digits.substring(0, 2)} ${digits.substring(2)}`;
    }
    
    return this.phone; // Return original if can't format
  }

  /**
   * Validate email format
   */
  isValidEmail(): boolean {
    if (!this.email) return true; // Email is optional
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  /**
   * Validate LinkedIn URL format
   */
  isValidLinkedInUrl(): boolean {
    if (!this.linkedin_url) return true; // LinkedIn URL is optional
    
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w\-]+\/?$/i;
    return linkedinRegex.test(this.linkedin_url);
  }

  /**
   * Validate phone number format (basic validation)
   */
  isValidPhone(): boolean {
    if (!this.phone) return true; // Phone is optional
    
    // Allow various formats: +49 123 456789, 0123 456789, etc.
    const phoneRegex = /^[\+]?[0-9]?[\(\)\-\s\.]*[0-9]{6,}$/;
    return phoneRegex.test(this.phone);
  }

  /**
   * Comprehensive validation of the contact
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!this.first_name?.trim()) {
      errors.push('Vorname ist erforderlich');
    }

    // Must have at least one contact method
    if (!this.email?.trim() && !this.phone?.trim()) {
      errors.push('E-Mail oder Telefonnummer ist erforderlich');
    }

    // Email validation
    if (!this.isValidEmail()) {
      errors.push('E-Mail-Format ist ungültig');
    }

    // Phone validation  
    if (!this.isValidPhone()) {
      errors.push('Telefonnummer-Format ist ungültig');
    }

    // LinkedIn URL validation
    if (!this.isValidLinkedInUrl()) {
      errors.push('LinkedIn URL-Format ist ungültig');
    }

    // Name length validation
    if (this.first_name && this.first_name.length > 50) {
      errors.push('Vorname darf maximal 50 Zeichen lang sein');
    }

    if (this.last_name && this.last_name.length > 50) {
      errors.push('Nachname darf maximal 50 Zeichen lang sein');
    }

    if (this.position && this.position.length > 100) {
      errors.push('Position darf maximal 100 Zeichen lang sein');
    }

    if (this.email && this.email.length > 255) {
      errors.push('E-Mail darf maximal 255 Zeichen lang sein');
    }

    if (this.notes && this.notes.length > 1000) {
      errors.push('Notizen dürfen maximal 1000 Zeichen lang sein');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get a search-friendly representation of the contact
   */
  getSearchText(): string {
    return [
      this.first_name,
      this.last_name,
      this.email,
      this.phone,
      this.position,
      this.notes
    ].filter(Boolean).join(' ').toLowerCase();
  }

  /**
   * Check if contact matches a search query
   */
  matchesSearch(query: string): boolean {
    if (!query.trim()) return true;
    
    const searchText = this.getSearchText();
    const searchTerms = query.toLowerCase().split(' ');
    
    return searchTerms.every(term => 
      searchText.includes(term.trim())
    );
  }

  /**
   * Update contact information and set updated timestamp
   */
  updateWith(data: Partial<Contact>): ContactModel {
    return new ContactModel({
      ...this.toJSON(),
      ...data,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Get contact priority/relevance score for sorting
   */
  getRelevanceScore(): number {
    let score = 0;
    
    // Base score for having a name
    score += this.first_name ? 10 : 0;
    score += this.last_name ? 10 : 0;
    
    // Contact information
    score += this.email ? 20 : 0;
    score += this.phone ? 15 : 0;
    
    // Professional information
    score += this.position ? 15 : 0;
    score += this.linkedin_url ? 10 : 0;
    
    // Company association
    score += this.company_id ? 10 : 0;
    
    // Notes indicate active relationship
    score += this.notes ? 5 : 0;
    
    return score;
  }
}
