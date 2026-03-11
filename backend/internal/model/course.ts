/**
 * Entity: `courses`
 * Mục đích: Lưu thông tin course (khóa học) và metadata phục vụ hiển thị/tra cứu.
 *
 * Quan hệ chính:
 * - created_by -> users: người tạo course
 * - modules: danh sách module/chương thuộc course
 * - instructors: danh sách giảng viên của course
 *
 * Cột chính:
 * - title/slug/description: thông tin hiển thị
 * - learning_objectives/prerequisites: JSON arrays mô tả mục tiêu/điều kiện
 * - level/language/status/published_at: metadata phát hành
 * - created_at/updated_at/deleted_at: timestamps (soft delete)
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    JoinColumn
} from 'typeorm';
import User from './user';
import Module from './modules';
import CourseInstructor from './course_instructor';

@Entity('courses')
export default class Course {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column({ type: 'varchar', length: 255 })
    /** Tên course. */
    title: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    /** Slug duy nhất (phục vụ URL/SEO). */
    slug: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    /** Mô tả ngắn hiển thị danh sách (nullable). */
    short_description: string;

    @Column({ type: 'text', nullable: true })
    /** Mô tả đầy đủ (nullable). */
    full_description: string;

    @Column({ type: 'json', nullable: true })
    /** Mục tiêu học tập (JSON array) (nullable). */
    learning_objectives: string[];

    @Column({ type: 'json', nullable: true })
    /** Kiến thức/điều kiện tiên quyết (JSON array) (nullable). */
    prerequisites: string[];

    @Column({ type: 'varchar', length: 500, nullable: true })
    /** URL thumbnail (nullable). */
    thumbnail_url: string;

    @Column({
        type: 'enum',
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    })
    /** Trình độ course. */
    level: string;

    @Column({ type: 'varchar', length: 50, default: 'vi' })
    /** Ngôn ngữ course (mặc định vi). */
    language: string;

    @Column({
        type: 'enum',
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    })
    /** Trạng thái phát hành. */
    status: string;

    @Column({ type: 'datetime', nullable: true })
    /** Thời điểm publish (nullable nếu chưa publish). */
    published_at: Date;

    @Column()
    /** FK -> `users.id`: người tạo course. */
    created_by: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    /** Quan hệ đến user tạo course. */
    creator: User;

    @OneToMany(() => Module, module => module.course)
    /** Danh sách module/chương thuộc course. */
    modules: Module[];

    @OneToMany(() => CourseInstructor, ci => ci.course)
    /** Danh sách giảng viên của course. */
    instructors: CourseInstructor[];

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;

    @DeleteDateColumn()
    /** Soft delete timestamp (nullable cho bản ghi đang active). */
    deleted_at: Date;
}