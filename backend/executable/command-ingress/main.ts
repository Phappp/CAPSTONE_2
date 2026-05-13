// Bypass SSL certificate verification (CHỈ dùng trong dev, KHÔNG dùng production)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { config } from 'dotenv';
import path from 'path';

// #region DEBUG: Hypothesis A - dotenv loading
config({ path: path.join(process.cwd(), '.env') });
// console.log('[DEBUG-A1] After dotenv config:', {
//   cwd: process.cwd(),
//   envPath: path.join(process.cwd(), '.env'),
//   GOOGLE_CLIENT_ID_raw: process.env.GOOGLE_OAUTH_CLIENT_ID,
//   GOOGLE_CLIENT_SECRET_raw: process.env.GOOGLE_OAUTH_CLIENT_SECRET ? '[SET]' : '[UNDEFINED]',
// });
// #endregion

import { createHttpServer } from './app';
import AppDataSource from '../../lib/database';
import { syncDatabase } from '../../lib/db-sync';
import env from './utils/env';
import { CourseServiceImpl } from './features/course/domain/service';

// #region DEBUG: Hypothesis B - envalid parsed values
// console.log('[DEBUG-B1] After envalid cleanEnv:', {
//   GOOGLE_CLIENT_ID: env.GOOGLE_OAUTH_CLIENT_ID,
//   GOOGLE_CLIENT_SECRET: env.GOOGLE_OAUTH_CLIENT_SECRET ? '[SET]' : '[UNDEFINED]',
// });
// #endregion

async function start() {
    await AppDataSource.initialize();
    console.log('Database connected');

    // Tự động đồng bộ schema database (tạo bảng nếu chưa tồn tại, cập nhật nếu đã tồn tại)
    // Lưu ý: TypeORM synchronize phù hợp cho môi trường dev / dự án capstone.
    // try {
    //     await syncDatabase();
    // } catch (error) {
    //     // Im lặng bỏ qua lỗi sync khi khởi động server (ví dụ bảng đã tồn tại).
    //     // Nếu muốn xem lỗi chi tiết, hãy chạy: npm run db:sync
    // }
    // Chỉ đồng bộ khi bật flag DATABASE_SYNC
    if (env.DATABASE_SYNC) {
        await syncDatabase();
    }

    const redisClient = undefined;
    const server = createHttpServer(redisClient);

    if (env.STARTUP_SCAN_TRANSCRIPTS) {
      setImmediate(async () => {
        const courseService = new CourseServiceImpl();
        const result = await courseService.scanPendingTranscripts();
        if (result.queued > 0) {
          console.log(`[startup] Queued ${result.queued} pending video transcripts, skipped ${result.skipped}`);
        }
      });
    }

    server.listen(env.PORT, () => {
        console.log(`Server running on port ${env.PORT}`);
    });

    process.on('SIGINT', () => {
        // redisClient.quit();

        // Avoid connection leak.
        AppDataSource.destroy();
        process.exit(0);
    });
}

start().catch((err) => {
    console.error(err);
    process.exit(1);
});