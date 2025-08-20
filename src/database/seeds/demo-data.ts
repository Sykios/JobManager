import { Database } from 'sqlite';
import * as sqlite3 from 'sqlite3';

export async function seedDemoData(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Seeding demo data...');

  try {
    // Insert demo companies
    const companies = [
      {
        name: 'Red Bull GmbH',
        website: 'https://www.redbull.com/at-de',
        industry: 'Media & Technology',
        location: 'Fuschl am See, Österreich',
        size: '1000-5000',
        description: 'Globaler Energy Drink Hersteller und Medienunternehmen'
      },
      {
        name: 'Erste Group Bank AG',
        website: 'https://www.erstegroup.com',
        industry: 'Banking & Finance',
        location: 'Wien, Österreich',
        size: '10000+',
        description: 'Eine der führenden Bankengruppen in Zentral- und Osteuropa'
      },
      {
        name: 'voestalpine AG',
        website: 'https://www.voestalpine.com',
        industry: 'Steel & Technology',
        location: 'Linz, Österreich',
        size: '10000+',
        description: 'Weltweit führender Stahl- und Technologiekonzern'
      },
      {
        name: 'Bitpanda GmbH',
        website: 'https://www.bitpanda.com',
        industry: 'FinTech & Crypto',
        location: 'Wien, Österreich',
        size: '500-1000',
        description: 'Europas führende Plattform für digitale Assets und Kryptowährungen'
      },
      {
        name: 'Kapsch TrafficCom AG',
        website: 'https://www.kapsch.net',
        industry: 'Smart Mobility',
        location: 'Wien, Österreich',
        size: '1000-5000',
        description: 'Weltweiter Anbieter intelligenter Verkehrssysteme'
      }
    ];

    for (const company of companies) {
      await db.run(`
        INSERT OR IGNORE INTO companies (name, website, industry, location, size, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [company.name, company.website, company.industry, company.location, company.size, company.description]);
    }

    // Get company IDs for foreign key references
    const redbullId = (await db.get('SELECT id FROM companies WHERE name = ?', 'Red Bull GmbH'))?.id;
    const ersteId = (await db.get('SELECT id FROM companies WHERE name = ?', 'Erste Group Bank AG'))?.id;
    const bitpandaId = (await db.get('SELECT id FROM companies WHERE name = ?', 'Bitpanda GmbH'))?.id;
    const kapschId = (await db.get('SELECT id FROM companies WHERE name = ?', 'Kapsch TrafficCom AG'))?.id;

    // Insert demo contacts
    const contacts = [
      {
        company_id: redbullId,
        first_name: 'Martina',
        last_name: 'Hofer',
        email: 'martina.hofer@redbull.com',
        phone: '+43 6229 5070',
        position: 'Head of Technology Recruiting',
        linkedin_url: 'https://linkedin.com/in/martina-hofer-redbull',
        notes: 'Sehr innovativ und technik-begeistert, schnelle Entscheidungen'
      },
      {
        company_id: ersteId,
        first_name: 'Stefan',
        last_name: 'Bauer',
        email: 'stefan.bauer@erstegroup.com',
        position: 'Senior IT Manager',
        linkedin_url: 'https://linkedin.com/in/stefan-bauer-erste',
        notes: 'Zuständig für Digital Banking Projekte, sehr professionell'
      },
      {
        company_id: bitpandaId,
        first_name: 'Julia',
        last_name: 'Neumann',
        email: 'julia.neumann@bitpanda.com',
        phone: '+43 1 3330 7330',
        position: 'Lead Technical Recruiter',
        notes: 'Startup-Mentalität, sehr direkt und ehrlich, schnelle Prozesse'
      }
    ];

    for (const contact of contacts) {
      await db.run(`
        INSERT OR IGNORE INTO contacts (company_id, first_name, last_name, email, phone, position, linkedin_url, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [contact.company_id, contact.first_name, contact.last_name, contact.email, contact.phone || null, contact.position, contact.linkedin_url || null, contact.notes || null]);
    }

    // Get contact IDs
    const martinaId = (await db.get('SELECT id FROM contacts WHERE email = ?', 'martina.hofer@redbull.com'))?.id;
    const stefanId = (await db.get('SELECT id FROM contacts WHERE email = ?', 'stefan.bauer@erstegroup.com'))?.id;
    const juliaId = (await db.get('SELECT id FROM contacts WHERE email = ?', 'julia.neumann@bitpanda.com'))?.id;

    // Insert demo applications
    const applications = [
      {
        company_id: redbullId,
        contact_id: martinaId,
        title: 'Senior Frontend Developer - Media Tech',
        position: 'Senior Frontend Developer',
        job_url: 'https://www.redbull.com/at-de/careers/senior-frontend-dev',
        application_channel: 'Company Website',
        salary_range: '65.000€ - 85.000€',
        work_type: 'full-time',
        location: 'Salzburg',
        remote_possible: true,
        status: 'interview',
        priority: 5,
        application_date: '2024-01-15',
        deadline: '2024-02-01',
        follow_up_date: '2024-01-29',
        notes: 'Sehr spannendes Medien-Tech Projekt. Interview mit Tech-Lead geplant.',
        requirements: 'React, TypeScript, Media Streaming, 5+ Jahre Erfahrung',
        benefits: 'Red Bull Events, flexible Arbeitszeiten, Sport-Angebote'
      },
      {
        company_id: ersteId,
        contact_id: stefanId,
        title: 'Full-Stack Developer - Digital Banking',
        position: 'Full-Stack Developer',
        job_url: 'https://www.erstegroup.com/careers/fullstack-developer',
        application_channel: 'LinkedIn',
        salary_range: '60.000€ - 80.000€',
        work_type: 'full-time',
        location: 'Wien',
        remote_possible: false,
        status: 'applied',
        priority: 4,
        application_date: '2024-01-20',
        deadline: '2024-02-15',
        notes: 'Banking-Erfahrung wäre von Vorteil. Wartezeit normal für Banken.',
        requirements: 'Java, Spring Boot, Angular, Banking-Domain Kenntnisse',
        benefits: 'Bankentarif, Pensionsvorsorge, Weiterbildungsmöglichkeiten'
      },
      {
        company_id: bitpandaId,
        contact_id: juliaId,
        title: 'React Developer - Crypto Platform',
        position: 'Frontend Developer',
        job_url: 'https://www.bitpanda.com/careers/react-developer',
        application_channel: 'Job Portal',
        salary_range: '55.000€ - 75.000€',
        work_type: 'full-time',
        location: 'Wien',
        remote_possible: true,
        status: 'in-review',
        priority: 3,
        application_date: '2024-01-25',
        notes: 'Sehr dynamisches Startup. Crypto-Interesse definitiv von Vorteil.',
        requirements: 'React, Redux, Crypto/FinTech Erfahrung erwünscht',
        benefits: 'Startup-Kultur, Crypto-Boni, flexible Arbeitszeiten'
      },
      {
        company_id: kapschId,
        title: 'Junior Software Developer - Smart Mobility',
        position: 'Junior Software Developer',
        job_url: 'https://www.kapsch.net/careers/junior-developer',
        application_channel: 'Company Website',
        salary_range: '45.000€ - 60.000€',
        work_type: 'full-time',
        location: 'Wien',
        remote_possible: true,
        status: 'draft',
        priority: 2,
        deadline: '2024-02-28',
        notes: 'Interessanter Bereich Verkehrstechnik. Anschreiben noch überarbeiten.',
        requirements: 'C++, Java, Embedded Systems, IoT Grundkenntnisse',
        benefits: 'Technische Weiterbildung, Projektvielfalt, internationale Teams'
      }
    ];

    for (const app of applications) {
      await db.run(`
        INSERT OR IGNORE INTO applications (
          company_id, contact_id, title, position, job_url, application_channel,
          salary_range, work_type, location, remote_possible, status, priority,
          application_date, deadline, follow_up_date, notes, requirements, benefits
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        app.company_id, app.contact_id || null, app.title, app.position, app.job_url,
        app.application_channel, app.salary_range, app.work_type, app.location,
        app.remote_possible, app.status, app.priority, app.application_date || null,
        app.deadline || null, app.follow_up_date || null, app.notes, app.requirements, app.benefits
      ]);
    }

    // Insert demo reminders
    const redbullAppId = (await db.get('SELECT id FROM applications WHERE title LIKE ?', '%Media Tech%'))?.id;
    const ersteAppId = (await db.get('SELECT id FROM applications WHERE title LIKE ?', '%Digital Banking%'))?.id;

    const reminders = [
      {
        application_id: redbullAppId,
        title: 'Tech-Interview vorbereiten',
        description: 'Frontend-Fragen und Media Streaming Technologien wiederholen',
        reminder_date: '2024-02-05 09:00:00',
        reminder_type: 'interview'
      },
      {
        application_id: ersteAppId,
        title: 'Follow-up E-Mail senden',
        description: 'Nachfragen zum Stand der Bewerbung bei Erste Group',
        reminder_date: '2024-02-10 10:00:00',
        reminder_type: 'follow_up'
      }
    ];

    for (const reminder of reminders) {
      await db.run(`
        INSERT OR IGNORE INTO reminders (application_id, title, description, reminder_date, reminder_type)
        VALUES (?, ?, ?, ?, ?)
      `, [reminder.application_id, reminder.title, reminder.description, reminder.reminder_date, reminder.reminder_type]);
    }

    console.log('Demo data seeded successfully');
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
}

/**
 * Clear all demo data
 */
export async function clearDemoData(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  console.log('Clearing demo data...');

  await db.exec('DELETE FROM reminders');
  await db.exec('DELETE FROM files');
  await db.exec('DELETE FROM status_history');
  await db.exec('DELETE FROM applications');
  await db.exec('DELETE FROM contacts');
  await db.exec('DELETE FROM companies');

  // Reset auto-increment counters
  await db.exec('DELETE FROM sqlite_sequence WHERE name IN ("companies", "contacts", "applications", "reminders", "files", "status_history")');

  console.log('Demo data cleared successfully');
}
