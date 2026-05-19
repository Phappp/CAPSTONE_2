/**
 * Script để chạy migration SQL cho discussion tables
 * Chạy: npx ts-node lib/run-migration.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';

async function runMigration() {
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = parseInt(process.env.DATABASE_PORT || '3306');
  const user = process.env.DATABASE_USER || 'root';
  const password = process.env.DATABASE_PASSWORD || '';
  const database = process.env.DATABASE_NAME || 'medium_clone';

  console.log('Connecting to database...');
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  });

  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFile = path.join(migrationsDir, '20260519_add_lesson_discussion_tables.sql');

  console.log('Reading migration file...');
  const sql = fs.readFileSync(migrationFile, 'utf-8');

  console.log('Running migration...');
  try {
    await connection.query(sql);
    console.log('Migration completed successfully!');
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Tables already exist, skipping...');
    } else {
      console.error('Migration failed:', error.message);
      process.exit(1);
    }
  }

  await connection.end();
  console.log('Done!');
}

runMigration();
