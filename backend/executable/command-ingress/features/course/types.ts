

type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
import User from './../../../../internal/model/user';
import Module from './../../../../internal/model/modules';
import CourseInstructor from './../../../../internal/model/course_instructor';
type CourseStatus = 'draft' | 'published' | 'archived';

type Course = {
  id: number;
  title: string;
  slug: string;

  short_description?: string | null;
  full_description?: string | null;

  learning_objectives?: string[] | null;
  prerequisites?: string[] | null;

  thumbnail_url?: string | null;

  level: CourseLevel;
  language: string;
  status: CourseStatus;

  published_at?: Date | null;

  created_by: number;

  creator?: User;
  modules?: Module[];
  instructors?: CourseInstructor[];

  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
};

type CreateCourseRequest = {
  title: string;
  slug: string;

  short_description?: string;
  full_description?: string;

  learning_objectives?: string[];
  prerequisites?: string[];

  thumbnail_url?: string;

  level?: CourseLevel;
  language?: string;

  status?: CourseStatus;
  published_at?: Date;
};

type UpdateCourseRequest = Partial<CreateCourseRequest>;

type CourseListResult = {
  courses: Course[];
  total: number;
};

interface CourseService {
  createCourse(request: CreateCourseRequest): Promise<Course>;
  updateCourse(id: number, request: UpdateCourseRequest): Promise<Course>;
  getCourse(id: number): Promise<Course | null>;
  listCourses(): Promise<CourseListResult>;
  deleteCourse(id: number): Promise<void>;
}

export {
  Course,
  CourseLevel,
  CourseStatus,
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseListResult,
  CourseService,
};