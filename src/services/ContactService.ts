import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';
import { Contact } from '../types';
import { ContactModel } from '../models/Contact';

export interface ContactFilters {
  company_id?: number;
  has_email?: boolean;
  has_phone?: boolean;
  has_linkedin?: boolean;
  search?: string;
  position?: string;
}

export interface ContactCreateData {
  company_id?: number;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  linkedin_url?: string;
  notes?: string;
}

export interface ContactUpdateData extends Partial<ContactCreateData> {}

export interface ContactStatistics {
  total: number;
  withEmail: number;
  withPhone: number;
  withLinkedIn: number;
  withCompany: number;
  byPosition: Record<string, number>;
  recentContacts: number; // contacts added in last 30 days
}

export class ContactService {
  constructor(private db: Database<sqlite3.Database, sqlite3.Statement>) {}

  /**
   * Initialize the contacts table
   */
  async initializeTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        first_name TEXT NOT NULL,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        position TEXT,
        linkedin_url TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
      )
    `;

    await this.db.exec(query);

    // Create indexes for better performance
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
      CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(first_name, last_name);
      CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
    `);
  }

  /**
   * Create a new contact
   */
  async create(data: ContactCreateData): Promise<ContactModel> {
    const contact = new ContactModel(data);
    const validation = contact.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const query = `
      INSERT INTO contacts (
        company_id, first_name, last_name, email, phone, 
        position, linkedin_url, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = new Date().toISOString();
    const result = await this.db.run(query, [
      data.company_id || null,
      data.first_name,
      data.last_name || null,
      data.email || null,
      data.phone || null,
      data.position || null,
      data.linkedin_url || null,
      data.notes || null,
      now,
      now
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create contact');
    }

    return this.getById(result.lastID);
  }

  /**
   * Get contact by ID
   */
  async getById(id: number): Promise<ContactModel> {
    const query = 'SELECT * FROM contacts WHERE id = ?';
    const row = await this.db.get<Contact>(query, [id]);
    
    if (!row) {
      throw new Error(`Contact with ID ${id} not found`);
    }

    return ContactModel.fromJSON(row);
  }

  /**
   * Update an existing contact
   */
  async update(id: number, data: ContactUpdateData): Promise<ContactModel> {
    const existing = await this.getById(id);
    
    // Create updated contact for validation
    const updated = new ContactModel({
      ...existing.toJSON(),
      ...data,
      updated_at: new Date().toISOString(),
    });

    const validation = updated.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const fields = Object.keys(data).filter(key => data[key as keyof ContactUpdateData] !== undefined);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field as keyof ContactUpdateData]);

    if (fields.length === 0) {
      return existing;
    }

    const query = `UPDATE contacts SET ${setClause}, updated_at = ? WHERE id = ?`;
    await this.db.run(query, [...values, new Date().toISOString(), id]);

    return this.getById(id);
  }

  /**
   * Delete a contact
   */
  async delete(id: number): Promise<void> {
    // Check if contact is referenced by applications
    const applicationCheck = await this.db.get(
      'SELECT COUNT(*) as count FROM applications WHERE contact_id = ?',
      [id]
    );

    if (applicationCheck && applicationCheck.count > 0) {
      throw new Error(`Cannot delete contact: ${applicationCheck.count} application(s) reference this contact`);
    }

    const query = 'DELETE FROM contacts WHERE id = ?';
    const result = await this.db.run(query, [id]);
    
    if (result.changes === 0) {
      throw new Error(`Contact with ID ${id} not found`);
    }
  }

  /**
   * Get all contacts with optional filtering
   */
  async getAll(filters?: ContactFilters): Promise<ContactModel[]> {
    let query = 'SELECT * FROM contacts';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters) {
      if (filters.company_id) {
        conditions.push('company_id = ?');
        params.push(filters.company_id);
      }

      if (filters.has_email !== undefined) {
        conditions.push(filters.has_email ? 'email IS NOT NULL AND email != ""' : 'email IS NULL OR email = ""');
      }

      if (filters.has_phone !== undefined) {
        conditions.push(filters.has_phone ? 'phone IS NOT NULL AND phone != ""' : 'phone IS NULL OR phone = ""');
      }

      if (filters.has_linkedin !== undefined) {
        conditions.push(filters.has_linkedin ? 'linkedin_url IS NOT NULL AND linkedin_url != ""' : 'linkedin_url IS NULL OR linkedin_url = ""');
      }

      if (filters.position) {
        conditions.push('position LIKE ?');
        params.push(`%${filters.position}%`);
      }

      if (filters.search) {
        conditions.push(`(
          first_name LIKE ? OR 
          last_name LIKE ? OR 
          email LIKE ? OR 
          phone LIKE ? OR 
          position LIKE ? OR 
          notes LIKE ?
        )`);
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY first_name ASC, last_name ASC';

    const rows = await this.db.all<Contact[]>(query, params);
    return rows.map(row => ContactModel.fromJSON(row));
  }

  /**
   * Get contacts by company
   */
  async getByCompany(companyId: number): Promise<ContactModel[]> {
    return this.getAll({ company_id: companyId });
  }

  /**
   * Search contacts by query
   */
  async search(query: string, limit?: number): Promise<ContactModel[]> {
    const contacts = await this.getAll({ search: query });
    
    // Sort by relevance score
    const sorted = contacts.sort((a, b) => b.getRelevanceScore() - a.getRelevanceScore());
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get contact statistics
   */
  async getStatistics(): Promise<ContactStatistics> {
    const totalQuery = 'SELECT COUNT(*) as count FROM contacts';
    const totalResult = await this.db.get<{ count: number }>(totalQuery);

    const emailQuery = 'SELECT COUNT(*) as count FROM contacts WHERE email IS NOT NULL AND email != ""';
    const emailResult = await this.db.get<{ count: number }>(emailQuery);

    const phoneQuery = 'SELECT COUNT(*) as count FROM contacts WHERE phone IS NOT NULL AND phone != ""';
    const phoneResult = await this.db.get<{ count: number }>(phoneQuery);

    const linkedinQuery = 'SELECT COUNT(*) as count FROM contacts WHERE linkedin_url IS NOT NULL AND linkedin_url != ""';
    const linkedinResult = await this.db.get<{ count: number }>(linkedinQuery);

    const companyQuery = 'SELECT COUNT(*) as count FROM contacts WHERE company_id IS NOT NULL';
    const companyResult = await this.db.get<{ count: number }>(companyQuery);

    const positionQuery = `
      SELECT position, COUNT(*) as count 
      FROM contacts 
      WHERE position IS NOT NULL AND position != ""
      GROUP BY position 
      ORDER BY count DESC 
      LIMIT 10
    `;
    const positionResults = await this.db.all<{ position: string; count: number }[]>(positionQuery);

    const recentQuery = `
      SELECT COUNT(*) as count 
      FROM contacts 
      WHERE created_at > date('now', '-30 days')
    `;
    const recentResult = await this.db.get<{ count: number }>(recentQuery);

    const byPosition: Record<string, number> = {};
    positionResults.forEach(result => {
      byPosition[result.position] = result.count;
    });

    return {
      total: totalResult?.count || 0,
      withEmail: emailResult?.count || 0,
      withPhone: phoneResult?.count || 0,
      withLinkedIn: linkedinResult?.count || 0,
      withCompany: companyResult?.count || 0,
      byPosition,
      recentContacts: recentResult?.count || 0,
    };
  }

  /**
   * Get contacts that are not associated with any applications
   */
  async getUnusedContacts(): Promise<ContactModel[]> {
    const query = `
      SELECT c.* FROM contacts c
      LEFT JOIN applications a ON c.id = a.contact_id
      WHERE a.contact_id IS NULL
      ORDER BY c.created_at DESC
    `;

    const rows = await this.db.all<Contact[]>(query);
    return rows.map(row => ContactModel.fromJSON(row));
  }

  /**
   * Get contacts with their application counts
   */
  async getContactsWithApplicationCounts(): Promise<Array<ContactModel & { applicationCount: number }>> {
    const query = `
      SELECT c.*, COUNT(a.id) as application_count
      FROM contacts c
      LEFT JOIN applications a ON c.id = a.contact_id
      GROUP BY c.id
      ORDER BY application_count DESC, c.first_name ASC
    `;

    const rows = await this.db.all<(Contact & { application_count: number })[]>(query);
    return rows.map(row => {
      const contact = ContactModel.fromJSON(row);
      return Object.assign(contact, { applicationCount: row.application_count });
    });
  }

  /**
   * Duplicate detection - find potentially duplicate contacts
   */
  async findPotentialDuplicates(): Promise<Array<{ contacts: ContactModel[]; reason: string }>> {
    const allContacts = await this.getAll();
    const duplicateGroups: Array<{ contacts: ContactModel[]; reason: string }> = [];

    // Group by email
    const emailGroups = new Map<string, ContactModel[]>();
    allContacts.forEach(contact => {
      if (contact.email) {
        const email = contact.email.toLowerCase().trim();
        if (!emailGroups.has(email)) {
          emailGroups.set(email, []);
        }
        emailGroups.get(email)!.push(contact);
      }
    });

    emailGroups.forEach((contacts, email) => {
      if (contacts.length > 1) {
        duplicateGroups.push({
          contacts,
          reason: `Gleiche E-Mail-Adresse: ${email}`
        });
      }
    });

    // Group by phone
    const phoneGroups = new Map<string, ContactModel[]>();
    allContacts.forEach(contact => {
      if (contact.phone) {
        const phone = contact.phone.replace(/\D/g, ''); // Remove non-digits
        if (phone.length >= 6) { // Only consider valid phone numbers
          if (!phoneGroups.has(phone)) {
            phoneGroups.set(phone, []);
          }
          phoneGroups.get(phone)!.push(contact);
        }
      }
    });

    phoneGroups.forEach((contacts, phone) => {
      if (contacts.length > 1) {
        // Check if not already grouped by email
        const isAlreadyGrouped = duplicateGroups.some(group => 
          group.contacts.some(c1 => contacts.some(c2 => c1.id === c2.id))
        );
        if (!isAlreadyGrouped) {
          duplicateGroups.push({
            contacts,
            reason: `Gleiche Telefonnummer: ${contacts[0].getFormattedPhone()}`
          });
        }
      }
    });

    // Group by similar names (basic implementation)
    const nameGroups = new Map<string, ContactModel[]>();
    allContacts.forEach(contact => {
      const nameKey = `${contact.first_name.toLowerCase().trim()}_${(contact.last_name || '').toLowerCase().trim()}`;
      if (!nameGroups.has(nameKey)) {
        nameGroups.set(nameKey, []);
      }
      nameGroups.get(nameKey)!.push(contact);
    });

    nameGroups.forEach((contacts, nameKey) => {
      if (contacts.length > 1 && nameKey !== '_') { // Don't group contacts with no last name
        // Check if not already grouped
        const isAlreadyGrouped = duplicateGroups.some(group => 
          group.contacts.some(c1 => contacts.some(c2 => c1.id === c2.id))
        );
        if (!isAlreadyGrouped) {
          duplicateGroups.push({
            contacts,
            reason: `Ähnlicher Name: ${contacts[0].getFullName()}`
          });
        }
      }
    });

    return duplicateGroups;
  }

  /**
   * Bulk operations - create multiple contacts
   */
  async createMultiple(contactsData: ContactCreateData[]): Promise<ContactModel[]> {
    const createdContacts: ContactModel[] = [];
    
    // Use transaction for better performance and data consistency
    await this.db.exec('BEGIN TRANSACTION');
    
    try {
      for (const data of contactsData) {
        const contact = await this.create(data);
        createdContacts.push(contact);
      }
      
      await this.db.exec('COMMIT');
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }

    return createdContacts;
  }

  /**
   * Export contacts to CSV format data
   */
  async exportToCSV(): Promise<string> {
    const contacts = await this.getAll();
    
    const headers = [
      'ID', 'Vorname', 'Nachname', 'E-Mail', 'Telefon', 
      'Position', 'LinkedIn', 'Unternehmen ID', 'Notizen', 
      'Erstellt', 'Aktualisiert'
    ];
    
    const rows = contacts.map(contact => [
      contact.id,
      contact.first_name,
      contact.last_name || '',
      contact.email || '',
      contact.phone || '',
      contact.position || '',
      contact.linkedin_url || '',
      contact.company_id || '',
      contact.notes || '',
      contact.created_at,
      contact.updated_at
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}
