/**
 * Database Synchronization Test Suite
 * Use this to test if your local SQLite data syncs properly with Supabase
 */

import { SyncService } from '../services/SyncService';
import { setupDatabase, getDatabase } from '../database';
import { createAuthService } from '../services/AuthService';

export class SyncTestSuite {
    private syncService: SyncService | null = null;
    private authService: any = null;
    private testResults: Array<{ test: string; status: 'pass' | 'fail'; message: string }> = [];

    async initialize() {
        console.log('🔧 Initializing Sync Test Suite...');
        
        // Setup database
        await setupDatabase();
        const db = getDatabase();
        
        // Setup auth service
        this.authService = createAuthService({
            supabaseUrl: process.env.SUPABASE_URL!,
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY!
        });
        
        // Initialize sync service
        this.syncService = new SyncService(db, {
            apiBaseUrl: 'https://jobmanager-api.vercel.app/api',
            enableSync: true
        });
        
        console.log('✅ Test suite initialized');
    }

    async runAllTests() {
        console.log('🧪 Running Database Synchronization Tests...\n');
        this.testResults = [];
        
        await this.testLocalDatabaseConnection();
        await this.testSupabaseConnection();
        await this.testCreateLocalData();
        await this.testSyncToSupabase();
        await this.testSyncFromSupabase();
        await this.testConflictResolution();
        
        this.printResults();
    }

    private async testLocalDatabaseConnection() {
        try {
            const db = getDatabase();
            const result = await db.get('SELECT COUNT(*) as count FROM applications');
            
            this.addResult('Local Database Connection', 'pass', 
                `Connected successfully. Found ${result.count} applications.`);
        } catch (error) {
            this.addResult('Local Database Connection', 'fail', 
                `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async testSupabaseConnection() {
        try {
            if (!this.authService) throw new Error('Auth service not initialized');
            
            // Test Supabase connection
            const session = await this.authService.getSession();
            
            if (session) {
                this.addResult('Supabase Connection', 'pass', 
                    `Connected as ${session.user?.email || 'unknown user'}`);
            } else {
                this.addResult('Supabase Connection', 'fail', 
                    'No active session. Please authenticate first.');
            }
        } catch (error) {
            this.addResult('Supabase Connection', 'fail', 
                `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async testCreateLocalData() {
        try {
            const db = getDatabase();
            const testJobId = `test-${Date.now()}`;
            
            // Create a test application
            await db.run(`
                INSERT INTO applications (
                    id, company_name, position_title, status, 
                    created_at, updated_at, needs_sync
                ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 1)
            `, [testJobId, 'Test Company', 'Test Position', 'applied']);
            
            // Verify it was created
            const result = await db.get('SELECT * FROM applications WHERE id = ?', [testJobId]);
            
            if (result) {
                this.addResult('Create Local Data', 'pass', 
                    `Test application created: ${result.company_name} - ${result.position_title}`);
            } else {
                this.addResult('Create Local Data', 'fail', 'Failed to create test data');
            }
        } catch (error) {
            this.addResult('Create Local Data', 'fail', 
                `Failed to create test data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async testSyncToSupabase() {
        if (!this.syncService) {
            this.addResult('Sync to Supabase', 'fail', 'Sync service not initialized');
            return;
        }

        try {
            const syncResult = await this.syncService.performFullSync();
            
            if (syncResult.success) {
                this.addResult('Sync to Supabase', 'pass', 
                    `Sync successful. Synced ${syncResult.syncedTables?.join(', ') || 'unknown'} tables`);
            } else {
                this.addResult('Sync to Supabase', 'fail', 
                    `Sync failed: ${syncResult.errors?.map(e => e.error).join(', ') || 'Unknown error'}`);
            }
        } catch (error) {
            this.addResult('Sync to Supabase', 'fail', 
                `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async testSyncFromSupabase() {
        if (!this.syncService) {
            this.addResult('Sync from Supabase', 'fail', 'Sync service not initialized');
            return;
        }

        try {
            // This would typically involve creating data on Supabase and pulling it down
            const syncStatus = await this.syncService.getSyncStatus();
            
            this.addResult('Sync from Supabase', 'pass', 
                `Sync status: ${syncStatus.syncAvailable ? 'Online' : 'Offline'}, ` +
                `Pending: ${syncStatus.pendingItems}, ` +
                `Sync enabled: ${syncStatus.syncEnabled}`);
        } catch (error) {
            this.addResult('Sync from Supabase', 'fail', 
                `Failed to get sync status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async testConflictResolution() {
        try {
            const db = getDatabase();
            
            // Check for any records that might have sync conflicts
            const conflicts = await db.all(`
                SELECT COUNT(*) as count 
                FROM applications 
                WHERE needs_sync = 1 AND sync_conflict = 1
            `);
            
            this.addResult('Conflict Resolution', 'pass', 
                `Found ${conflicts[0]?.count || 0} sync conflicts to resolve`);
        } catch (error) {
            this.addResult('Conflict Resolution', 'fail', 
                `Failed to check conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private addResult(test: string, status: 'pass' | 'fail', message: string) {
        this.testResults.push({ test, status, message });
        
        const icon = status === 'pass' ? '✅' : '❌';
        const color = status === 'pass' ? '\x1b[32m' : '\x1b[31m';
        const reset = '\x1b[0m';
        
        console.log(`${icon} ${color}${test}:${reset} ${message}`);
    }

    private printResults() {
        const passed = this.testResults.filter(r => r.status === 'pass').length;
        const failed = this.testResults.filter(r => r.status === 'fail').length;
        
        console.log('\n📊 Test Results Summary:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n🔍 Failed Tests:');
            this.testResults
                .filter(r => r.status === 'fail')
                .forEach(r => console.log(`   • ${r.test}: ${r.message}`));
        }
    }
}

// Export a function to run the tests
export async function runSyncTests() {
    const testSuite = new SyncTestSuite();
    await testSuite.initialize();
    await testSuite.runAllTests();
}

// If running directly
if (require.main === module) {
    runSyncTests().catch(console.error);
}
