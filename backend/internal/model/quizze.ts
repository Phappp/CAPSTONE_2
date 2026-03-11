/**
 * Entity: `quizzes`
 * Mục đích: Quiz (bài kiểm tra) gắn với một lesson.
 *
 * Cột chính:
 * - lesson_id: FK -> lessons
 * - title/description: thông tin quiz
 * - time_limit_minutes: giới hạn thời gian (nullable)
 * - passing_score: điểm đạt (nullable)
 * - max_attempts: số lần làm tối đa
 * - shuffle_questions/shuffle_options: trộn câu hỏi/đáp án
 * - show_results_immediately/show_correct_answers: cấu hình hiển thị kết quả/đáp án
 * - random_question_count: (nullable) số lượng câu chọn ngẫu nhiên từ bank (nếu dùng)
 * - created_at/updated_at: timestamps
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';

import Lesson from './lesson';

@Entity('quizzes')
export default class Quiz {

    @PrimaryGeneratedColumn()
    /** Khóa chính. */
    id: number;

    @Column()
    /** FK -> `lessons.id`: lesson chứa quiz. */
    lesson_id: number;

    @ManyToOne(() => Lesson)
    @JoinColumn({ name: 'lesson_id' })
    /** Quan hệ đến lesson. */
    lesson: Lesson;

    @Column({ type: 'varchar', length: 255 })
    /** Tiêu đề quiz. */
    title: string;

    @Column({ type: 'text', nullable: true })
    /** Mô tả quiz (nullable). */
    description: string;

    @Column({ type: 'int', nullable: true })
    /** Giới hạn thời gian (phút) (nullable). */
    time_limit_minutes: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    /** Điểm đạt (nullable). */
    passing_score: number;

    @Column({ type: 'int', default: 1 })
    /** Số lần làm tối đa. */
    max_attempts: number;

    @Column({ type: 'boolean', default: false })
    /** Trộn thứ tự câu hỏi khi làm quiz. */
    shuffle_questions: boolean;

    @Column({ type: 'boolean', default: false })
    /** Trộn thứ tự options khi làm quiz. */
    shuffle_options: boolean;

    @Column({ type: 'boolean', default: true })
    /** Hiển thị kết quả ngay sau khi nộp. */
    show_results_immediately: boolean;

    @Column({ type: 'boolean', default: true })
    /** Hiển thị đáp án đúng cho người học. */
    show_correct_answers: boolean;

    @Column({ type: 'int', nullable: true })
    /** Số câu lấy ngẫu nhiên (nullable nếu không random). */
    random_question_count: number;

    @CreateDateColumn()
    /** Thời điểm tạo. */
    created_at: Date;

    @UpdateDateColumn()
    /** Thời điểm cập nhật gần nhất. */
    updated_at: Date;
}