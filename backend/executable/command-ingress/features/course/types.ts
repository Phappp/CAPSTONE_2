export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'archived';

export type CreateCourseRequest = {
  title: string;
  short_description?: string | null;
  full_description?: string | null;
  category?: string | null;
  level?: string | null;
  language?: string | null;
  thumbnail_url?: string | null;
  publish_scheduled_at?: string | null;
  learning_objectives?: string[] | null;
  prerequisites?: string[] | null;
  price?: number | null;
  has_certificate?: boolean;
  estimated_hours?: number | null;
  tags?: string[] | null;
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
  open_at?: string | null;
  is_published?: boolean;
  is_free_preview?: boolean;
  duration_minutes?: number | null;
  /** Có Quizz gắn với lesson (lesson vẫn có thể là video/text). */
  has_quiz?: boolean;
  /** Có bài tập gắn với lesson (lesson có thể không phải loại assignment). */
  has_assignment?: boolean;
  /** Trạng thái chất lượng nội dung để hiển thị trong cây của giảng viên. */
  quality_status?: 'ok' | 'needs_fix';
  /** Lý do lesson chưa đạt chất lượng (nếu có). */
  quality_issue?: string | null;
};

export type CourseModuleItem = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  order_index: number;
  open_at?: string | null;
  is_published?: boolean;
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
  price?: number | null;
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
  price?: number | null;
  total_duration_minutes?: number | null;
  is_enrolled?: boolean;
  can_enroll?: boolean;
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
  open_at?: string | null;
};

export type UpdateModuleRequest = {
  title?: string;
  description?: string | null;
  open_at?: string | null;
  is_published?: boolean;
};

export type CreateLessonRequest = {
  title: string;
  description?: string | null;
  lesson_type: LessonType;
  open_at?: string | null;
};

export type UpdateLessonRequest = {
  title?: string;
  description?: string | null;
  lesson_type?: LessonType;
  open_at?: string | null;
  is_published?: boolean;
};

export type ReorderModulesRequest = {
  modules: { id: number; order_index: number }[];
};

export type ReorderLessonsRequest = {
  lessons: { id: number; module_id: number; order_index: number }[];
};

export type ReorderCourseContentRequest = ReorderModulesRequest & ReorderLessonsRequest;

export type LessonResourceType = 'file' | 'video';
export type LessonResourceKind = 'pdf' | 'word' | 'video' | 'youtube' | 'other';
export type ResourceReviewStatus = 'pending' | 'approved' | 'rejected';

export type LessonResourceItem = {
  id: number;
  lesson_id: number;
  resource_type: LessonResourceType;
  resource_kind: LessonResourceKind;
  url: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  preview_url: string | null;
  review_status: ResourceReviewStatus;
  review_reason: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
};

export type PendingLessonResourceQuery = {
  page?: number;
  page_size?: number;
  q?: string;
  kind?: LessonResourceKind | 'all';
  course_id?: number;
};

export type PendingLessonResourceListItem = LessonResourceItem & {
  course_id: number;
  course_title: string;
  lesson_title: string;
  teacher_id: number;
  is_resubmitted?: boolean;
  last_review_decision?: 'submit' | 'approve' | 'reject' | 'resubmit' | null;
  last_review_note?: string | null;
  last_reviewed_at?: string | null;
  previous_rejected_reason?: string | null;
};

export type PendingLessonResourceListResult = {
  items: PendingLessonResourceListItem[];
  page: number;
  page_size: number;
  total: number;
};

export type TeacherRejectedResourceListItem = LessonResourceItem & {
  course_id: number;
  course_title: string;
  module_id: number;
  module_title: string;
  lesson_id: number;
  lesson_title: string;
  lesson_type: LessonType;
  review_event_note: string | null;
  review_event_at: string | null;
};

export type TeacherRejectedResourceListResult = {
  course_id: number;
  items: TeacherRejectedResourceListItem[];
};

export type TeacherPendingResourceListItem = LessonResourceItem & {
  course_id: number;
  course_title: string;
  module_id: number;
  module_title: string;
  lesson_id: number;
  lesson_title: string;
  lesson_type: LessonType;
  is_resubmitted?: boolean;
  last_review_decision?: 'submit' | 'approve' | 'reject' | 'resubmit' | null;
  last_review_note?: string | null;
  last_reviewed_at?: string | null;
  previous_rejected_reason?: string | null;
};

export type TeacherPendingResourceListResult = {
  course_id: number;
  items: TeacherPendingResourceListItem[];
};

export type TeacherApprovedResourceListItem = {
  id: number;
  module_id: number;
  module_title: string;
  lesson_id: number;
  lesson_title: string;
  lesson_type: LessonType;
  resource_kind: LessonResourceKind;
  filename: string | null;
  reviewed_at: string | null;
};

export type TeacherApprovedResourceListResult = {
  course_id: number;
  items: TeacherApprovedResourceListItem[];
};

export type LessonResourceReviewDecision = 'approve' | 'reject';

export type LessonResourceReviewEventItem = {
  id: number;
  resource_id: number;
  actor_user_id: number;
  from_status: ResourceReviewStatus | null;
  to_status: ResourceReviewStatus;
  decision: 'submit' | 'approve' | 'reject' | 'resubmit';
  note: string | null;
  created_at: string;
};

export type LessonResourceReviewTimelineResult = {
  resource_id: number;
  items: LessonResourceReviewEventItem[];
};

export type CourseListItem = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  full_description?: string | null;
  category?: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  learning_objectives?: string[] | null;
  prerequisites?: string[] | null;
  price?: number | null;
  has_certificate?: boolean;
  estimated_hours?: number | null;
  tags?: string[] | null;
  status: CourseStatus;
  published_at: string | null;
  publish_scheduled_at?: string | null;
  created_at: string;
  updated_at: string;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
  quality_gate?: {
    ready: boolean;
    issues: string[];
  };
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
  pending_review: number;
  archived: number;
  finance: {
    currency: string;
    gross_revenue: number;
    platform_fee_total: number;
    net_revenue: number;
    paid_orders: number;
  };
};

export type TeacherRevenueSummaryQuery = {
  from?: string;
  to?: string;
};

export type TeacherRevenueSummary = {
  currency: string;
  gross_revenue: number;
  platform_fee_total: number;
  net_revenue: number;
  paid_orders: number;
};

export type TeacherRevenueTrendPoint = {
  date: string;
  gross_revenue: number;
  platform_fee_total: number;
  net_revenue: number;
  paid_orders: number;
};

export type TeacherRevenueTrendResult = {
  points: TeacherRevenueTrendPoint[];
};

export type TeacherRevenueTransactionsQuery = {
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
};

export type TeacherRevenueTransactionItem = {
  order_id: number;
  course_id: number;
  teacher_user_id: number;
  gross_amount: number;
  platform_fee_amount: number;
  net_amount: number;
  currency: string;
  recognized_at: string;
  status: 'recognized' | 'reversed';
};

export type TeacherRevenueTransactionsResult = {
  items: TeacherRevenueTransactionItem[];
  page: number;
  page_size: number;
  total: number;
};

export type PendingReviewCourseQuery = {
  page?: number;
  page_size?: number;
  q?: string;
};

export type PendingReviewCourseListResult = {
  items: CourseListItem[];
  page: number;
  page_size: number;
  total: number;
};

export type CourseReviewEventItem = {
  id: number;
  course_id: number;
  actor_user_id: number;
  from_status: CourseStatus | null;
  to_status: CourseStatus;
  decision: 'submit' | 'approve' | 'reject' | 'archive' | 'revert_draft';
  note: string | null;
  created_at: string;
};

export type CourseReviewTimelineResult = {
  course_id: number;
  items: CourseReviewEventItem[];
};

export type ReviewCourseDecision = 'approve' | 'reject';

/** Tổng quan một khóa học cho màn hình quản lý (GV). */
export type CourseManagerOverview = {
  course: CourseListItem;
  enrollment_by_status: Record<string, number>;
  avg_progress_percent: number;
  enrollment_trend: { labels: string[]; values: number[] };
  lesson_type_counts: Record<string, number>;
  lessons_with_quiz_count: number;
  lessons_with_assignment_count: number;
  progress_distribution: { label: string; count: number }[];
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
  rank: number;
  user_id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
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

export type CourseLeaderboardItem = {
  rank: number;
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  progress_percent: number;
  completed_lessons: number;
  time_spent_seconds: number;
  is_me?: boolean;
};

export type CourseLeaderboardResult = {
  course_id: number;
  total_lessons: number;
  items: CourseLeaderboardItem[];
  top_limit: number;
  includes_me: boolean;
};

export type CoursePrerequisiteOption = {
  id: number;
  title: string;
  slug: string;
  selectable: boolean;
  reason?: string | null;
};

export type CoursePrerequisiteGraphNode = {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  level: string;
  is_current: boolean;
  is_completed: boolean;
};

export type CoursePrerequisiteGraphEdge = {
  from_course_id: number;
  to_course_id: number;
};

export type CoursePrerequisiteGraph = {
  root_course_id: number;
  nodes: CoursePrerequisiteGraphNode[];
  edges: CoursePrerequisiteGraphEdge[];
};

export type ManualQuizOptionInput = {
  option_text: string;
  is_correct: boolean;
};

export type ManualQuizQuestionInput = {
  question_text: string;
  explanation?: string | null;
  points?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  question_type: 'multiple_choice' | 'true_false';
  options: ManualQuizOptionInput[];
};

export type ManualQuizUpsertRequest = {
  title: string;
  description?: string | null;
  time_limit_minutes?: number | null;
  passing_score?: number | null;
  max_attempts?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_results_immediately?: boolean;
  show_correct_answers?: boolean;
  questions: ManualQuizQuestionInput[];
};

export type ManualQuizAiGenerateRequest = {
  topic: string;
  question_count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  question_type?: 'multiple_choice' | 'true_false' | 'mixed';
  extra_instructions?: string | null;
  attachment_name?: string | null;
  attachment_text?: string | null;
};

export type ManualQuizAiGenerateResult = {
  model: string;
  questions: ManualQuizQuestionInput[];
};

export type ManualQuizDetailResult = {
  quiz_id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  max_attempts: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_results_immediately: boolean;
  show_correct_answers: boolean;
  questions: {
    order_index: number;
    points: number;
    question_type: string;
    question_text: string;
    explanation: string | null;
    difficulty: string;
    options: { option_text: string; is_correct: boolean; order_index: number }[];
  }[];
};

/** Quiz làm bài (học viên) — không chứa đáp án đúng. */
export type LearnerQuizTakePayload = {
  quiz_id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  max_attempts: number;
  attempts_used: number;
  show_results_immediately: boolean;
  show_correct_answers: boolean;
  recent_attempts: {
    attempt_id: number;
    attempt_number: number;
    submitted_at: string | null;
    score_percent: number | null;
    is_passed: boolean | null;
    status: string;
    answers: {
      quiz_question_id: number;
      question_text: string;
      selected_option_id: number | null;
      selected_option_text: string | null;
      correct_option_ids: number[];
    }[];
  }[];
  questions: {
    quiz_question_id: number;
    question_text: string;
    question_type: string;
    points: number;
    options: { id: number; option_text: string }[];
  }[];
};

export type LearnerQuizSubmitRequest = {
  answers: { quiz_question_id: number; selected_option_id: number }[];
};

export type QuizLearnerAttemptRow = {
  attempt_id: number;
  attempt_number: number;
  score: number | null;
  is_passed: boolean | null;
  submitted_at: string | null;
  status: string;
};

export type QuizLearnerScoresRow = {
  user_id: number;
  email: string;
  full_name: string;
  attempts: QuizLearnerAttemptRow[];
};

export type QuizLearnerScoresResult = {
  quiz: {
    id: number;
    title: string;
    passing_score: number | null;
    max_attempts: number;
  } | null;
  learners: QuizLearnerScoresRow[];
};

export type QuizAttemptDetailResult = {
  attempt_id: number;
  attempt_number: number;
  user_id: number;
  user_full_name: string;
  user_email: string;
  score: number | null;
  is_passed: boolean | null;
  submitted_at: string | null;
  status: string;
  show_correct_answers: boolean;
  questions: {
    quiz_question_id: number;
    order_index: number;
    question_text: string;
    points: number;
    selected_option_id: number | null;
    selected_option_text: string | null;
    is_correct: boolean | null;
    options: {
      id: number;
      option_text: string;
      is_correct: boolean;
      is_selected: boolean;
    }[];
  }[];
};

export type LearnerQuizSubmitResult = {
  attempt_id: number;
  attempt_number: number;
  score_percent: number;
  earned_points: number;
  max_points: number;
  is_passed: boolean;
  show_correct_answers: boolean;
  details: {
    quiz_question_id: number;
    is_correct: boolean;
    points_earned: number;
    correct_option_ids: number[];
    selected_option_id: number | null;
  }[];
};

export type LessonSummaryStatus = 'pending' | 'processing' | 'succeeded' | 'failed';
export type LessonSummarySourceType = 'text' | 'youtube' | 'uploaded_video';

export type LearningActivityDayPoint = {
  date: string;
  lessons_completed: number;
};

export type LearningActivityResult = {
  daily_activity: LearningActivityDayPoint[];
};

export type LessonSummarySegmentItem = {
  segment_index: number;
  start_sec: number | null;
  end_sec: number | null;
  raw_text: string;
  summary_text: string;
  keywords: string[];
};

export type LessonSummaryPayload = {
  lesson_id: number;
  status: LessonSummaryStatus;
  source_type: LessonSummarySourceType;
  source_ready: boolean;
  model: string | null;
  source_hash: string | null;
  overall_summary: string | null;
  key_points: string[];
  error_message: string | null;
  requested_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string | null;
  segments: LessonSummarySegmentItem[];
};

export interface CourseService {
  // Public methods
  listPublishedCourses(subjectUserId: number | undefined, query: PublishedCourseListQuery): Promise<PublishedCourseListResult>;
  getPublishedCourseBySlug(subjectUserId: number | undefined, slug: string): Promise<CourseDetail>;
  getPublishedCoursePrerequisiteGraphBySlug(subjectUserId: number | undefined, slug: string): Promise<CoursePrerequisiteGraph>;

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
  getMyRevenueSummary(subjectUserId: number, query: TeacherRevenueSummaryQuery): Promise<TeacherRevenueSummary>;
  getMyRevenueTrend(subjectUserId: number, query: TeacherRevenueSummaryQuery): Promise<TeacherRevenueTrendResult>;
  listMyRevenueTransactions(
    subjectUserId: number,
    query: TeacherRevenueTransactionsQuery
  ): Promise<TeacherRevenueTransactionsResult>;
  getMyCourseDetail(subjectUserId: number, courseId: number): Promise<CourseListItem>;
  getMyCourseManagerOverview(subjectUserId: number, courseId: number): Promise<CourseManagerOverview>;
  getMyCoursePrerequisiteGraph(subjectUserId: number, courseId: number): Promise<CoursePrerequisiteGraph>;
  listMyCoursePrerequisiteOptions(subjectUserId: number, courseId: number): Promise<CoursePrerequisiteOption[]>;
  updateMyCourse(subjectUserId: number, courseId: number, request: UpdateCourseRequest): Promise<void>;
  setMyCourseStatus(subjectUserId: number, courseId: number, status: CourseStatus): Promise<void>;
  softDeleteMyCourse(subjectUserId: number, courseId: number): Promise<void>;
  hardDeleteMyCourse(subjectUserId: number, courseId: number): Promise<void>;
  getMyCourseCompletionRules(subjectUserId: number, courseId: number): Promise<CourseCompletionRules>;
  updateMyCourseCompletionRules(subjectUserId: number, courseId: number, request: UpdateCourseCompletionRulesRequest): Promise<CourseCompletionRules>;
  listMyCourseLearnerProgress(subjectUserId: number, courseId: number, query: { page?: number; page_size?: number; q?: string }): Promise<CourseLearnerProgressResult>;
  getCourseLeaderboard(subjectUserId: number, courseId: number): Promise<CourseLeaderboardResult>;
  listPendingReviewCourses(subjectUserId: number, query: PendingReviewCourseQuery): Promise<PendingReviewCourseListResult>;
  reviewCourseByAdmin(subjectUserId: number, courseId: number, decision: ReviewCourseDecision, note?: string | null): Promise<void>;
  getCourseReviewTimelineByAdmin(subjectUserId: number, courseId: number): Promise<CourseReviewTimelineResult>;
  getMyCourseReviewTimeline(subjectUserId: number, courseId: number): Promise<CourseReviewTimelineResult>;
  listPendingLessonResourcesByAdmin(subjectUserId: number, query: PendingLessonResourceQuery): Promise<PendingLessonResourceListResult>;
  reviewLessonResourceByAdmin(
    subjectUserId: number,
    resourceId: number,
    decision: LessonResourceReviewDecision,
    note?: string | null
  ): Promise<void>;
  getLessonResourceReviewTimelineByAdmin(subjectUserId: number, resourceId: number): Promise<LessonResourceReviewTimelineResult>;
  listMyRejectedLessonResources(subjectUserId: number, courseId: number): Promise<TeacherRejectedResourceListResult>;
  listMyPendingLessonResources(subjectUserId: number, courseId: number): Promise<TeacherPendingResourceListResult>;
  listMyApprovedLessonResources(subjectUserId: number, courseId: number): Promise<TeacherApprovedResourceListResult>;

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

  /** Quiz thủ công (ngân hàng câu + quiz_questions). */
  getManualQuizForLesson(subjectUserId: number, courseId: number, lessonId: number): Promise<ManualQuizDetailResult | null>;
  upsertManualQuizForLesson(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    request: ManualQuizUpsertRequest
  ): Promise<{ quiz_id: number }>;
  generateManualQuizQuestionsWithAi(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    request: ManualQuizAiGenerateRequest
  ): Promise<ManualQuizAiGenerateResult>;

  getLearnerQuizForLesson(
    subjectUserId: number,
    courseId: number,
    lessonId: number
  ): Promise<LearnerQuizTakePayload | null>;
  submitLearnerQuiz(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    request: LearnerQuizSubmitRequest
  ): Promise<LearnerQuizSubmitResult>;

  /** Giảng viên: điểm các lần làm quiz theo học viên (ghi danh active/completed). */
  listQuizLearnerScoresForLesson(
    subjectUserId: number,
    courseId: number,
    lessonId: number
  ): Promise<QuizLearnerScoresResult>;
  getQuizAttemptDetailForTeacher(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    attemptId: number
  ): Promise<QuizAttemptDetailResult>;

  requestLessonSummary(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload>;
  getLessonSummary(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload>;
  regenerateLessonSummary(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload>;

  // Learning activity (dashboard)
  getMyLearningActivity(subjectUserId: number): Promise<LearningActivityResult>;
}