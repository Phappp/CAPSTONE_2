import 'reflect-metadata';
import { DataSource } from 'typeorm';
import User from '../internal/model/user';
import Session from '../internal/model/session';

const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    username: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'medium_clone',
    synchronize: false, // Không tự động tạo lại bảng nếu đã tồn tại
    logging: process.env.DEV === 'true',
    entities: [User, Session],
    subscribers: [],
    migrations: [],
});

export default AppDataSource;
