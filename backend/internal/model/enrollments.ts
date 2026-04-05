import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn
  } from 'typeorm';
  import  User  from './user'; // Đảm bảo bạn đã có file user.ts
  import  Course  from './course'; // Đảm bảo bạn đã có file course.ts
  
  @Entity('enrollments')
  export class Enrollment {
    @PrimaryGeneratedColumn({ type: 'int' })
    id: number;
  
    @Column({ name: 'user_id', type: 'int' })
    userId: number;
  
    @Column({ name: 'course_id', type: 'int' })
    courseId: number;
  
    @CreateDateColumn({
      name: 'enrolled_at',
      type: 'datetime',
      default: () => 'CURRENT_TIMESTAMP'
    })
    enrolledAt: Date;
  
    @Column({
      type: 'enum',
      enum: ['active', 'completed', 'dropped'],
      default: 'active'
    })
    status: 'active' | 'completed' | 'dropped';
  
    // Thiết lập quan hệ Foreign Key giống như trong SQL
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
  
    @ManyToOne(() => Course)
    @JoinColumn({ name: 'course_id' })
    course: Course;
  }