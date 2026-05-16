import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Unique
} from "typeorm";
import Course from "./course";
import User from "./user";

@Entity("course_reviews")
@Unique(["course_id", "user_id"])
export default class CourseReview {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  course_id: number;

  @Column()
  user_id: number;

  @Column({ type: "tinyint" })
  rating: number;

  @Column({ type: "text", nullable: true })
  comment: string | null;

  @Column({ type: "boolean", default: true })
  is_visible: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Course)
  @JoinColumn({ name: "course_id" })
  course: Course;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;
}
