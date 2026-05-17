/**
 * Backfill script for lesson_resources - run once to populate missing records
 * Usage: npx ts-node lib/backfillLessonResources.ts
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(process.cwd(), '.env') });

async function main() {
  const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    username: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'medium_clone',
    synchronize: false,
    logging: false,
    entities: [__dirname + '/../internal/model/*.{ts,js}'],
    subscribers: [],
    migrations: [],
  });

  await AppDataSource.initialize();
  console.log('Connected to DB, starting backfill...');

  const retryOnDeadlock = async <T>(fn: () => Promise<T>): Promise<T> => {
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        return await fn();
      } catch (err: any) {
        if (err?.code === 'ER_LOCK_DEADLOCK') {
          console.log(`Deadlock detected, retry ${attempt}...`);
          await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
          continue;
        }
        throw err;
      }
    }
  };

  // Backfill quiz markers
  const quizResult = await retryOnDeadlock(() =>
    AppDataSource.query(`
      INSERT INTO lesson_resources
        (lesson_id, resource_type, url, filename, mime_type, preview_url, size_bytes, resource_kind, review_status, review_reason, reviewed_by, reviewed_at)
      SELECT
        q.lesson_id,
        'file',
        CONCAT('internal://lesson/', q.lesson_id, '/quiz'),
        CONCAT('[QUIZ] ', COALESCE(NULLIF(TRIM(q.title), ''), 'Quiz nội dung')),
        'application/vnd.mindbridge.review-item',
        NULL,
        NULL,
        'other',
        'pending',
        NULL,
        NULL,
        NULL
      FROM quizzes q
      LEFT JOIN lesson_resources lr
        ON lr.lesson_id = q.lesson_id
       AND lr.url = CONCAT('internal://lesson/', q.lesson_id, '/quiz')
      WHERE lr.id IS NULL
    `)
  );
  console.log('Quiz markers:', quizResult);

  // Backfill assignment markers
  const assignResult = await retryOnDeadlock(() =>
    AppDataSource.query(`
      INSERT INTO lesson_resources
        (lesson_id, resource_type, url, filename, mime_type, preview_url, size_bytes, resource_kind, review_status, review_reason, reviewed_by, reviewed_at)
      SELECT
        a.lesson_id,
        'file',
        CONCAT('internal://lesson/', a.lesson_id, '/assignment'),
        CONCAT('[ASSIGNMENT] ', COALESCE(NULLIF(TRIM(a.title), ''), 'Assignment nội dung')),
        'application/vnd.mindbridge.review-item',
        NULL,
        NULL,
        'other',
        'pending',
        NULL,
        NULL,
        NULL
      FROM assignments a
      INNER JOIN (
        SELECT lesson_id, MAX(id) AS max_id
        FROM assignments
        GROUP BY lesson_id
      ) latest ON latest.max_id = a.id
      LEFT JOIN lesson_resources lr
        ON lr.lesson_id = a.lesson_id
       AND lr.url = CONCAT('internal://lesson/', a.lesson_id, '/assignment')
      WHERE lr.id IS NULL
    `)
  );
  console.log('Assignment markers:', assignResult);

  await AppDataSource.destroy();
  console.log('Backfill complete!');
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
