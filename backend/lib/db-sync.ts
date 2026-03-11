import AppDataSource from './database';

/**
 * Synchronize database schema (Create tables if they don't exist)
 * Use this only for first-time setup or manual schema updates
 */
export async function syncDatabase() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        console.log('Synchronizing database schema...');
        await AppDataSource.synchronize();
        console.log('✅ Database schema synchronized successfully');
    } catch (error) {
        console.error('❌ Error synchronizing database:', error);
        throw error;
    }
}

/**
 * Drop all tables (Use with caution!)
 */
export async function dropDatabase() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        console.log('⚠️  WARNING: Dropping all database tables...');
        await AppDataSource.dropDatabase();
        console.log('✅ Database dropped');
    } catch (error) {
        console.error('❌ Error dropping database:', error);
        throw error;
    }
}
