import { config } from 'dotenv';
import AppDataSource from '../../lib/database';

config();

async function main() {
    await AppDataSource.initialize();
    console.log('Database connected');
    console.log('Post-related CDC connector has been disabled. Post and Tag entities have been removed.');

    // Post-related CDC operations disabled
    // const postCollection = 'posts';
    // const redisClient = await connectRedis();
    // ... pipeline setup disabled
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});