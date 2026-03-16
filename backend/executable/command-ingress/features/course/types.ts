export type CourseStatus = 'draft' | 'published' | 'archived';

export type CreateCourseRequest = {
  title: string;
  short_description?: string | null;
  full_description?: string | null;
  level?: string | null;
  language?: string | null;
  thumbnail_url?: string | null;
  learning_objectives?: string[] | null;
  prerequisites?: string[] | null;
};

export type UpdateCourseRequest = Partial<CreateCourseRequest>;

export type CourseSortBy =
  | 'updated_at'
  | 'created_at'
  | 'title'
  | 'learners_count';

export type SortDir = 'asc' | 'desc';

export type CourseListQuery = {
  status?: CourseStatus | 'all';
  q?: string;
  page?: number;
  page_size?: number;
  sort_by?: CourseSortBy;
  sort_dir?: SortDir;
};

export type LessonType = 'video' | 'text' | 'quiz' | 'assignment';

export type CourseLessonItem = {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  lesson_type: LessonType;
  order_index: number;
};

export type CourseModuleItem = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  order_index: number;
  lessons: CourseLessonItem[];
};

export type CourseContentTree = {
  course_id: number;
  modules: CourseModuleItem[];
};

export type CreateModuleRequest = {
  title: string;
  description?: string | null;
};

export type UpdateModuleRequest = {
  title?: string;
  description?: string | null;
};

export type CreateLessonRequest = {
  title: string;
  description?: string | null;
  lesson_type: LessonType;
};

export type UpdateLessonRequest = {
  title?: string;
  description?: string | null;
  lesson_type?: LessonType;
};

export type ReorderModulesRequest = {
  modules: { id: number; order_index: number }[];
};

export type ReorderLessonsRequest = {
  lessons: { id: number; module_id: number; order_index: number }[];
};

export type ReorderCourseContentRequest = ReorderModulesRequest & ReorderLessonsRequest;

export type LessonResourceType = 'file' | 'video';

export type LessonResourceItem = {
  id: number;
  lesson_id: number;
  resource_type: LessonResourceType;
  url: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  preview_url: string | null;
  created_at: string;
};

export type CourseListItem = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  status: CourseStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
};

export type CourseListResult = {
  items: CourseListItem[];
  page: number;
  page_size: number;
  total: number;
};

export type CourseDashboardStats = {
  total: number;
  published: number;
  draft: number;
  archived: number;
};

export interface CourseService {
  createCourse(subjectUserId: number, request: CreateCourseRequest): Promise<{ id: number }>;
  listMyCourses(subjectUserId: number, query: CourseListQuery): Promise<CourseListResult>;
  getMyCourseDashboardStats(subjectUserId: number): Promise<CourseDashboardStats>;
  getMyCourseDetail(subjectUserId: number, courseId: number): Promise<CourseListItem>;
  updateMyCourse(subjectUserId: number, courseId: number, request: UpdateCourseRequest): Promise<void>;
  setMyCourseStatus(subjectUserId: number, courseId: number, status: CourseStatus): Promise<void>;
  softDeleteMyCourse(subjectUserId: number, courseId: number): Promise<void>;

  getMyCourseContentTree(subjectUserId: number, courseId: number): Promise<CourseContentTree>;
  createModule(subjectUserId: number, courseId: number, request: CreateModuleRequest): Promise<{ id: number }>;
  updateModule(subjectUserId: number, courseId: number, moduleId: number, request: UpdateModuleRequest): Promise<void>;
  deleteModule(subjectUserId: number, courseId: number, moduleId: number): Promise<void>;

  createLesson(subjectUserId: number, courseId: number, moduleId: number, request: CreateLessonRequest): Promise<{ id: number }>;
  updateLesson(subjectUserId: number, courseId: number, lessonId: number, request: UpdateLessonRequest): Promise<void>;
  deleteLesson(subjectUserId: number, courseId: number, lessonId: number): Promise<void>;

  reorderCourseContent(subjectUserId: number, courseId: number, request: ReorderCourseContentRequest): Promise<void>;

  listLessonResources(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonResourceItem[]>;
  createLessonFileResource(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    file: { filename: string; mime_type: string; size_bytes: number; url: string }
  ): Promise<{ id: number }>;
  updateLessonResourcePreview(
    subjectUserId: number,
    courseId: number,
    resourceId: number,
    file: { filename: string; mime_type: string; size_bytes: number; url: string }
  ): Promise<void>;
  deleteLessonResource(subjectUserId: number, courseId: number, resourceId: number): Promise<void>;
  getLessonResourceViewUrl(
    subjectUserId: number,
    courseId: number,
    resourceId: number
  ): Promise<{ url: string; mime_type: string | null; filename: string | null }>;
}

