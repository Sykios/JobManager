#!/usr/bin/env node

/**
 * Standalone Database Sync Test Runner
 * 
 * This script tests your JobManager database synchronization with Supabase
 * Run with: npm run test:sync
 * Or directly: node test-sync.js
 */

const path = require('path');
const fs = require('fs');

// Check if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';

// Load environment variables
require('dotenv').config({
    path: path.join(__dirname, isDev ? '.env.development' : '.env')
});

// Simple console test runner
class SimpleSyncTester {
    constructor() {
        this.results = [];
    }

    log(emoji, color, message) {
        const colorCodes = {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            reset: '\x1b[0m'
        };
        
        console.log(`${emoji} ${colorCodes[color]}${message}${colorCodes.reset}`);
    }

    addResult(test, passed, message) {
        this.results.push({ test, passed, message });
        this.log(passed ? '✅' : '❌', passed ? 'green' : 'red', `${test}: ${message}`);
    }

    async testEnvironmentVariables() {
        const requiredVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY'
        ];

        let allPresent = true;
        const missing = [];

        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                missing.push(varName);
                allPresent = false;
            }
        }

        if (allPresent) {
            this.addResult('Environment Variables', true, 
                `All required variables present (${requiredVars.length} found)`);
        } else {
            this.addResult('Environment Variables', false, 
                `Missing variables: ${missing.join(', ')}`);
        }

        return allPresent;
    }

    async testSupabaseConnection() {
        try {
            // Try to create Supabase client
            const { createClient } = require('@supabase/supabase-js');
            
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_ANON_KEY
            );

            // Test basic connection
            const { data, error } = await supabase
                .from('applications')
                .select('id')
                .limit(1);

            if (error) {
                throw new Error(`Supabase query failed: ${error.message}`);
            }

            this.addResult('Supabase Connection', true, 
                `Successfully connected to ${process.env.SUPABASE_URL}`);
            
            return true;
        } catch (error) {
            this.addResult('Supabase Connection', false, 
                `Connection failed: ${error.message}`);
            return false;
        }
    }

    async testWebAPIConnection() {
        try {
            const axios = require('axios');
            
            const response = await axios.get('https://JobManager.vercel.app/api/synchronizeJobManager/health', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'JobManager-Test/1.0.0'
                }
            });

            if (response.status === 200) {
                this.addResult('Web API Connection', true, 
                    `API health check successful (${response.status})`);
                return true;
            } else {
                throw new Error(`Unexpected status: ${response.status}`);
            }
        } catch (error) {
            this.addResult('Web API Connection', false, 
                `API connection failed: ${error.message}`);
            return false;
        }
    }

    async testDatabaseFiles() {
        const expectedFiles = [
            path.join(__dirname, 'src', 'database', 'index.ts'),
            path.join(__dirname, 'src', 'services', 'SyncService.ts'),
            path.join(__dirname, 'src', 'services', 'AuthService.ts')
        ];

        let allPresent = true;
        const missing = [];

        for (const filePath of expectedFiles) {
            if (!fs.existsSync(filePath)) {
                missing.push(path.basename(filePath));
                allPresent = false;
            }
        }

        if (allPresent) {
            this.addResult('Database Files', true, 
                `All required files present (${expectedFiles.length} checked)`);
        } else {
            this.addResult('Database Files', false, 
                `Missing files: ${missing.join(', ')}`);
        }

        return allPresent;
    }

    async testAuthentication() {
        try {
            // Simple auth test using a test email
            const { createClient } = require('@supabase/supabase-js');
            
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_ANON_KEY
            );

            // Try to sign in with a magic link (won't actually send email in test)
            const { data, error } = await supabase.auth.signInWithOtp({
                email: 'test@example.com',
                options: {
                    shouldCreateUser: false // Don't create user in test
                }
            });

            // We expect this to succeed (the request, not necessarily the login)
            if (error && !error.message.includes('rate limit')) {
                throw new Error(`Auth test failed: ${error.message}`);
            }

            this.addResult('Authentication Test', true, 
                'Auth service accessible and responding');
            return true;
        } catch (error) {
            this.addResult('Authentication Test', false, 
                `Auth test failed: ${error.message}`);
            return false;
        }
    }

    async runAllTests() {
        this.log('🧪', 'blue', 'Starting JobManager Database Sync Tests...\n');

        // Test environment setup
        await this.testEnvironmentVariables();
        await this.testDatabaseFiles();
        
        // Test external connections
        await this.testSupabaseConnection();
        await this.testWebAPIConnection();
        
        // Test authentication
        await this.testAuthentication();

        // Print summary
        this.printSummary();
    }

    printSummary() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => r.passed === false).length;
        const total = this.results.length;

        console.log('\n📊 Test Summary:');
        this.log('✅', 'green', `Passed: ${passed}/${total}`);
        
        if (failed > 0) {
            this.log('❌', 'red', `Failed: ${failed}/${total}`);
            console.log('\n🔍 Failed Tests:');
            this.results
                .filter(r => !r.passed)
                .forEach(r => console.log(`   • ${r.test}: ${r.message}`));
        }

        const successRate = ((passed / total) * 100).toFixed(1);
        this.log('📈', successRate > 80 ? 'green' : successRate > 50 ? 'yellow' : 'red', 
            `Success Rate: ${successRate}%`);

        if (successRate >= 80) {
            console.log('\n🎉 Your sync setup looks good! You can proceed with testing the full application.');
        } else if (successRate >= 50) {
            console.log('\n⚠️  Some issues detected. Check the failed tests above.');
        } else {
            console.log('\n🚨 Major issues detected. Please fix the failed tests before proceeding.');
        }
    }
}

// Main execution
async function main() {
    const tester = new SimpleSyncTester();
    
    try {
        await tester.runAllTests();
    } catch (error) {
        console.error('\n💥 Test runner crashed:', error.message);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { SimpleSyncTester };
