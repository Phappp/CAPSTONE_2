import { config } from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import User from '../internal/model/user';
import Role from '../internal/model/role';
import UserRole from '../internal/model/user_roles';

config({ path: path.join(process.cwd(), '.env') });

type AdminInput = {
    email: string;
    password: string;
    fullName: string;
};

function getInput(): AdminInput {
    const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const password = process.argv[3] || process.env.ADMIN_PASSWORD || '12345678';
    const fullName = process.argv[4] || process.env.ADMIN_FULL_NAME || 'System Admin';

    return { email, password, fullName };
}

async function ensureAdminRole(roleRepository: Repository<Role>) {
    let adminRole = await roleRepository.findOne({ where: { name: 'admin' } });

    if (!adminRole) {
        adminRole = roleRepository.create({
            name: 'admin',
            description: 'Default role for administrators',
        });
        await roleRepository.save(adminRole);
        console.log('Created role: admin');
    }

    return adminRole;
}

async function main() {
    const { email, password, fullName } = getInput();
    const { default: AppDataSource } = await import('./database');

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const userRepository = AppDataSource.getRepository(User);
        const roleRepository = AppDataSource.getRepository(Role);
        const userRoleRepository = AppDataSource.getRepository(UserRole);

        const adminRole = await ensureAdminRole(roleRepository);

        let user = await userRepository.findOne({ where: { email } });
        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            user = userRepository.create({
                email,
                password_hash: passwordHash,
                full_name: fullName,
                is_active: true,
                email_verified_at: new Date(),
            });
            await userRepository.save(user);
            console.log(`Created user: ${email}`);
        } else {
            console.log(`User already exists: ${email}`);
        }

        const existingUserRole = await userRoleRepository.findOne({
            where: { user_id: user.id, role_id: adminRole.id },
        });

        if (!existingUserRole) {
            const userRole = userRoleRepository.create({
                user_id: user.id,
                role_id: adminRole.id,
            });
            await userRoleRepository.save(userRole);
            console.log(`Assigned admin role to user: ${email}`);
        } else {
            console.log(`User already has admin role: ${email}`);
        }

        console.log('Done.');
    } catch (error) {
        console.error('Failed to create admin account:', error);
        process.exit(1);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

main();
