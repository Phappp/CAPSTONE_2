import 'reflect-metadata';
import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    username: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'medium_clone',
    synchronize: false, // Không tự động tạo lại bảng nếu đã tồn tại
    // Tắt logging nội bộ của TypeORM cho console gọn hoàn toàn
    logging: false,
    // Tự động load toàn bộ entity trong thư mục internal/model
    entities: [__dirname + '/../internal/model/*.{ts,js}'],
    subscribers: [],
    migrations: [],
});

export default AppDataSource;
