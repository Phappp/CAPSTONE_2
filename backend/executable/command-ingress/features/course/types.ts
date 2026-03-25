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

export type PublishedCourseListQuery = {
  q?: string;
  level?: string;
  language?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'title' | 'created_at' | 'learners_count';
  sort_dir?: SortDir;
};

export type EnrollmentStatus = 'active' | 'completed' | 'dropped' | 'expired';

export type MyEnrollmentsQuery = {
  page?: number;
  page_size?: number;
  status?: EnrollmentStatus;
  q?: string;
};

export type LessonType = 'video' | 'text' | 'quiz' | 'assignment';

export type CourseLessonItem = {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  lesson_type: LessonType;
  order_index: number;
  is_free_preview?: boolean;
  duration_minutes?: number | null;
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

export type CourseDetail = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  learning_objectives: string[] | null;
  prerequisites: string[] | null;
  status: CourseStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
  total_duration_minutes?: number | null;
  is_enrolled?: boolean;
  enrollment?: {
    status: EnrollmentStatus;
    enrolled_at: string;
    completed_at: string | null;
    progress_percent: number;
  } | null;
  instructors: {
    id: number;
    full_name: string;
    avatar_url: string | null;
    is_primary: boolean;
  }[];
  modules?: CourseModuleItem[];
};

export type PublishedCourseListItem = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  published_at: string | null;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
  total_duration_minutes?: number | null;
  is_enrolled?: boolean;
  instructors: {
    id: number;
    full_name: string;
    avatar_url: string | null;
  }[];
};

export type MyEnrollmentListItem = {
  id: number;
  course_id: number;
  course_title: string;
  course_slug: string;
  course_thumbnail: string | null;
  course_level: string;
  enrolled_at: string;
  last_accessed_at: string | null;
  status: EnrollmentStatus;
  progress_percent: number;
  completed_at: string | null;
};

export type MyEnrollmentsResult = {
  items: MyEnrollmentListItem[];
  page: number;
  page_size: number;
  total: number;
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

export type PublishedCourseListResult = {
  items: PublishedCourseListItem[];
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

export type EnrollmentResult = {
  id: number;
  course_id: number;
  user_id: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  progress_percent: number;
};

export type CourseProgressResult = {
  course_id: number;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  completed_lesson_ids: number[];
  unlocked_lesson_ids: number[];
  next_locked_lesson_id: number | null;
};

export type LessonHeartbeatResult = {
  lesson_id: number;
  time_spent_seconds: number;
  required_seconds: number;
  can_complete: boolean;
  progress_percent: number;
};

export type LessonCompleteResult = {
  lesson_id: number;
  completed: boolean;
  progress_percent: number;
};

export type CourseCompletionRules = {
  course_id: number;
  video_min_seconds: number;
  video_min_percent: number;
  text_min_seconds: number;
};

export type UpdateCourseCompletionRulesRequest = Partial<Omit<CourseCompletionRules, 'course_id'>>;

export type CourseLearnerProgressItem = {
  user_id: number;
  full_name: string;
  email: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  last_accessed_at: string | null;
  completed_at: string | null;
  progress_percent: number;
  completed_lessons: number;
  time_spent_seconds: number;
};

export type CourseLearnerProgressResult = {
  course_id: number;
  total_lessons: number;
  items: CourseLearnerProgressItem[];
  page: number;
  page_size: number;
  total: number;
};

export interface CourseService {
  // Public methods
  listPublishedCourses(subjectUserId: number | undefined, query: PublishedCourseListQuery): Promise<PublishedCourseListResult>;
  getPublishedCourseBySlug(subjectUserId: number | undefined, slug: string): Promise<CourseDetail>;

  // Enrollment methods
  enrollCourse(subjectUserId: number, courseId: number): Promise<EnrollmentResult>;
  listMyEnrollments(subjectUserId: number, query: MyEnrollmentsQuery): Promise<MyEnrollmentsResult>;
  getMyLearningCourse(subjectUserId: number, courseId: number): Promise<CourseDetail>;
  getMyCourseProgress(subjectUserId: number, courseId: number): Promise<CourseProgressResult>;
  addLessonProgressHeartbeat(subjectUserId: number, courseId: number, lessonId: number, deltaSeconds: number): Promise<LessonHeartbeatResult>;
  completeLesson(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonCompleteResult>;

  // Instructor methods
  createCourse(subjectUserId: number, request: CreateCourseRequest): Promise<{ id: number }>;
  listMyCourses(subjectUserId: number, query: CourseListQuery): Promise<CourseListResult>;
  getMyCourseDashboardStats(subjectUserId: number): Promise<CourseDashboardStats>;
  getMyCourseDetail(subjectUserId: number, courseId: number): Promise<CourseListItem>;
  updateMyCourse(subjectUserId: number, courseId: number, request: UpdateCourseRequest): Promise<void>;
  setMyCourseStatus(subjectUserId: number, courseId: number, status: CourseStatus): Promise<void>;
  softDeleteMyCourse(subjectUserId: number, courseId: number): Promise<void>;
  getMyCourseCompletionRules(subjectUserId: number, courseId: number): Promise<CourseCompletionRules>;
  updateMyCourseCompletionRules(subjectUserId: number, courseId: number, request: UpdateCourseCompletionRulesRequest): Promise<CourseCompletionRules>;
  listMyCourseLearnerProgress(subjectUserId: number, courseId: number, query: { page?: number; page_size?: number; q?: string }): Promise<CourseLearnerProgressResult>;

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

  createLessonYoutubeResource(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    request: { youtube_url: string; title?: string | null }
  ): Promise<{ id: number }>;
}