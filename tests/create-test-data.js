#!/usr/bin/env node

/**
 * Create Test Data Script
 * 
 * This script creates sample job applications in your local database
 * to test synchronization functionality
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config({
    path: path.join(__dirname, '..', '.env')
});

class TestDataCreator {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'jobmanager.db');
    }

    async createDatabase() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(db);
                }
            });
        });
    }

    async createTestApplications(db, count = 5) {
        console.log(`📝 Creating ${count} test job applications...`);

        const companies = [
            { name: 'Tech Solutions GmbH', industry: 'IT', location: 'Berlin' },
            { name: 'Marketing Dynamics', industry: 'Marketing', location: 'Hamburg' },
            { name: 'Green Energy Corp', industry: 'Renewable Energy', location: 'Munich' },
            { name: 'Digital Finance AG', industry: 'Fintech', location: 'Frankfurt' },
            { name: 'Creative Media Studio', industry: 'Media', location: 'Cologne' }
        ];

        const positions = [
            'Junior Software Developer',
            'Marketing Assistant',
            'Project Coordinator',
            'Data Analyst',
            'UX/UI Designer'
        ];

        const statuses = ['applied', 'interview_scheduled', 'rejected', 'offer_received'];

        const insertApplication = `
            INSERT INTO applications (
                id, company_name, position_title, status, 
                application_date, salary_expectation, notes,
                created_at, updated_at, needs_sync
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)
        `;

        for (let i = 0; i < count; i++) {
            const company = companies[i % companies.length];
            const position = positions[i % positions.length];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const salary = 35000 + Math.floor(Math.random() * 25000); // 35k - 60k

            const applicationId = `test-app-${Date.now()}-${i}`;
            const applicationDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const notes = `Bewerbung über ${Math.random() > 0.5 ? 'LinkedIn' : 'Unternehmenswebsite'} gesendet. ${
                Math.random() > 0.7 ? 'Ansprechpartner: Hr. Müller' : 'Kein direkter Kontakt'
            }`;

            await new Promise((resolve, reject) => {
                db.run(insertApplication, [
                    applicationId,
                    company.name,
                    position,
                    status,
                    applicationDate,
                    salary,
                    notes
                ], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`✅ Created: ${position} at ${company.name} (${status})`);
                        resolve();
                    }
                });
            });
        }
    }

    async createTestReminders(db, count = 3) {
        console.log(`⏰ Creating ${count} test reminders...`);

        const reminderTypes = [
            'Follow up on application',
            'Interview preparation',
            'Thank you email',
            'Application deadline',
            'Salary negotiation'
        ];

        const insertReminder = `
            INSERT INTO reminders (
                id, title, description, due_date, priority, completed,
                created_at, updated_at, needs_sync
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)
        `;

        for (let i = 0; i < count; i++) {
            const title = reminderTypes[i % reminderTypes.length];
            const reminderId = `test-reminder-${Date.now()}-${i}`;
            const dueDate = new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString();
            const priority = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
            const completed = Math.random() > 0.7 ? 1 : 0;

            const description = `Automatically generated test reminder for synchronization testing. Priority: ${priority}`;

            await new Promise((resolve, reject) => {
                db.run(insertReminder, [
                    reminderId,
                    title,
                    description,
                    dueDate,
                    priority,
                    completed
                ], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`✅ Created reminder: ${title} (${priority} priority)`);
                        resolve();
                    }
                });
            });
        }
    }

    async showSummary(db) {
        console.log('\n📊 Database Summary:');

        // Count applications
        const appCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM applications', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Count reminders
        const reminderCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM reminders', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Count pending sync items
        const pendingSyncCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM sync_queue WHERE synced_at IS NULL', (err, row) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        });

        console.log(`📝 Applications: ${appCount}`);
        console.log(`⏰ Reminders: ${reminderCount}`);
        console.log(`🔄 Pending sync items: ${pendingSyncCount}`);
        
        console.log('\n🎉 Test data created successfully!');
        console.log('💡 You can now test synchronization with: npm run test:sync');
        console.log('🚀 Or start the application with: npm run dev');
    }

    async run() {
        try {
            console.log('🗄️ Creating test data for JobManager...\n');
            
            const db = await this.createDatabase();
            console.log('✅ Connected to database');

            await this.createTestApplications(db, 5);
            await this.createTestReminders(db, 3);
            await this.showSummary(db);

            db.close();
        } catch (error) {
            console.error('❌ Error creating test data:', error.message);
            process.exit(1);
        }
    }
}

// Main execution
async function main() {
    const creator = new TestDataCreator();
    await creator.run();
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { TestDataCreator };
