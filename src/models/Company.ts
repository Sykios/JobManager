import { Company } from '../types';

export class CompanyModel {
  id: number;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  size?: string;
  description?: string;
  created_at: string;
  updated_at: string;

  constructor(data: Partial<Company> & { name: string }) {
    this.id = data.id || 0;
    this.name = data.name;
    this.website = data.website;
    this.industry = data.industry;
    this.location = data.location;
    this.size = data.size;
    this.description = data.description;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  /**
   * Convert the model instance to a plain object for database operations
   */
  toJSON(): Company {
    return {
      id: this.id,
      name: this.name,
      website: this.website,
      industry: this.industry,
      location: this.location,
      size: this.size,
      description: this.description,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Create a Company model instance from database row
   */
  static fromJSON(data: Company): CompanyModel {
    return new CompanyModel(data);
  }

  /**
   * Get formatted display name with location if available
   */
  getDisplayName(): string {
    return this.location ? `${this.name} (${this.location})` : this.name;
  }

  /**
   * Get company initials for avatar/logo display
   */
  getInitials(): string {
    return this.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  /**
   * Get formatted website URL with protocol
   */
  getFormattedWebsite(): string | undefined {
    if (!this.website) return undefined;
    
    // Add https:// if no protocol is present
    if (!this.website.match(/^https?:\/\//)) {
      return `https://${this.website}`;
    }
    return this.website;
  }

  /**
   * Check if company has complete information
   */
  isComplete(): boolean {
    return !!(
      this.name &&
      (this.industry || this.location || this.size || this.description)
    );
  }

  /**
   * Get company size as a formatted string
   */
  getFormattedSize(): string | undefined {
    if (!this.size) return undefined;
    
    // Common size mappings
    const sizeMap: Record<string, string> = {
      'startup': 'Startup (1-10)',
      'small': 'Klein (11-50)',
      'medium': 'Mittelständisch (51-200)',
      'large': 'Groß (201-1000)',
      'enterprise': 'Konzern (1000+)',
    };

    return sizeMap[this.size.toLowerCase()] || this.size;
  }

  /**
   * Validate website URL format
   */
  isValidWebsite(): boolean {
    if (!this.website) return true; // Website is optional
    
    try {
      const url = this.getFormattedWebsite();
      if (!url) return false;
      
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Comprehensive validation of the company
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!this.name?.trim()) {
      errors.push('Firmenname ist erforderlich');
    }

    // Name length validation
    if (this.name && this.name.length > 255) {
      errors.push('Firmenname darf maximal 255 Zeichen lang sein');
    }

    // Website validation
    if (!this.isValidWebsite()) {
      errors.push('Website URL-Format ist ungültig');
    }

    // Field length validations
    if (this.website && this.website.length > 500) {
      errors.push('Website URL darf maximal 500 Zeichen lang sein');
    }

    if (this.industry && this.industry.length > 100) {
      errors.push('Branche darf maximal 100 Zeichen lang sein');
    }

    if (this.location && this.location.length > 200) {
      errors.push('Standort darf maximal 200 Zeichen lang sein');
    }

    if (this.size && this.size.length > 50) {
      errors.push('Unternehmensgröße darf maximal 50 Zeichen lang sein');
    }

    if (this.description && this.description.length > 2000) {
      errors.push('Beschreibung darf maximal 2000 Zeichen lang sein');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get a search-friendly representation of the company
   */
  getSearchText(): string {
    return [
      this.name,
      this.industry,
      this.location,
      this.size,
      this.description,
      this.website
    ].filter(Boolean).join(' ').toLowerCase();
  }

  /**
   * Check if company matches a search query
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
   * Update company information and set updated timestamp
   */
  updateWith(data: Partial<Company>): CompanyModel {
    return new CompanyModel({
      ...this.toJSON(),
      ...data,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Get company relevance score for sorting
   */
  getRelevanceScore(): number {
    let score = 0;
    
    // Base score for having a name
    score += this.name ? 10 : 0;
    
    // Company information completeness
    score += this.industry ? 15 : 0;
    score += this.location ? 10 : 0;
    score += this.size ? 10 : 0;
    score += this.website ? 10 : 0;
    score += this.description ? 15 : 0;
    
    // Bonus for complete profile
    if (this.isComplete()) score += 10;
    
    return score;
  }

  /**
   * Get company type based on size
   */
  getCompanyType(): 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | 'unknown' {
    if (!this.size) return 'unknown';
    
    const size = this.size.toLowerCase();
    
    if (size.includes('startup') || size.includes('1-10')) return 'startup';
    if (size.includes('small') || size.includes('11-50')) return 'small';
    if (size.includes('medium') || size.includes('mittel') || size.includes('51-200')) return 'medium';
    if (size.includes('large') || size.includes('groß') || size.includes('201-1000')) return 'large';
    if (size.includes('enterprise') || size.includes('konzern') || size.includes('1000+')) return 'enterprise';
    
    return 'unknown';
  }

  /**
   * Generate a unique slug for the company (useful for URLs)
   */
  generateSlug(): string {
    return this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Get company domain from website
   */
  getDomain(): string | undefined {
    if (!this.website) return undefined;
    
    try {
      const url = new URL(this.getFormattedWebsite()!);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return undefined;
    }
  }

  /**
   * Check if company is likely a tech company based on industry
   */
  isTechCompany(): boolean {
    if (!this.industry) return false;
    
    const techKeywords = [
      'software', 'tech', 'it', 'computer', 'digital', 'internet',
      'web', 'app', 'mobile', 'cloud', 'saas', 'ai', 'ml', 'data',
      'entwicklung', 'programmierung', 'informatik'
    ];
    
    const industry = this.industry.toLowerCase();
    return techKeywords.some(keyword => industry.includes(keyword));
  }

  /**
   * Get color scheme based on company type or industry
   */
  getColorScheme(): { primary: string; secondary: string; accent: string } {
    const type = this.getCompanyType();
    
    const colorSchemes = {
      startup: { primary: '#10B981', secondary: '#D1FAE5', accent: '#059669' },
      small: { primary: '#3B82F6', secondary: '#DBEAFE', accent: '#1D4ED8' },
      medium: { primary: '#8B5CF6', secondary: '#EDE9FE', accent: '#7C3AED' },
      large: { primary: '#F59E0B', secondary: '#FEF3C7', accent: '#D97706' },
      enterprise: { primary: '#EF4444', secondary: '#FEE2E2', accent: '#DC2626' },
      unknown: { primary: '#6B7280', secondary: '#F3F4F6', accent: '#4B5563' }
    };

    return colorSchemes[type];
  }
}
