import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env') });
import { createHttpServer } from './app';
import AppDataSource from '../../lib/database';
import env from './utils/env';

async function start() {
    await AppDataSource.initialize();
    console.log('Database connected');
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