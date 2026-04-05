import AppDataSource from './database';
import Role from '../internal/model/role';

async function seedDefaultRoles() {
    const roleRepository = AppDataSource.getRepository(Role);

    const defaultRoles = [
        { name: 'learner', description: 'Default role for learners' },
        { name: 'course_manager', description: 'Default role for course managers' },
        { name: 'admin', description: 'Default role for administrators' },
    ];

    for (const r of defaultRoles) {
        const existing = await roleRepository.findOne({ where: { name: r.name } });
        if (existing) continue;

        const role = roleRepository.create({
            name: r.name,
            description: r.description,
        });
        await roleRepository.save(role);
    }
}

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
        await seedDefaultRoles();
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
