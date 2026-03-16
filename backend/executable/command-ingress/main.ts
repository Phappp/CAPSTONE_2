import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env') });
import { createHttpServer } from './app';
import AppDataSource from '../../lib/database';
// import { syncDatabase } from '../../lib/db-sync';
import env from './utils/env';

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

    const redisClient = undefined;
    const server = createHttpServer(redisClient);

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