/**
 * Database Schema Initialization Script
 * Run this once to create database tables:
 *
 * npx ts-node lib/sync-db.ts
 */

import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env') });

import { syncDatabase, dropDatabase } from './db-sync';

const command = process.argv[2];

async function main() {
    try {
        if (command === 'sync') {
            await syncDatabase();
        } else if (command === 'drop') {
            const confirm = process.argv[3];
            if (confirm !== '--force') {
                console.log('❌ Dropped cancelled. Use --force to confirm.');
                console.log('Usage: npx ts-node lib/sync-db.ts drop --force');
                process.exit(1);
            }
            await dropDatabase();
        } else {
            console.log(`
Database Schema Management

Usage:
  npx ts-node lib/sync-db.ts sync        - Create/update database tables
  npx ts-node lib/sync-db.ts drop --force - Drop ALL tables (Be careful!)

Examples:
  npx ts-node lib/sync-db.ts sync
  npx ts-node lib/sync-db.ts drop --force
            `);
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
