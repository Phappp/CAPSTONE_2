// Định nghĩa các endpoint liên quan đến khóa học

export const COURSES_API_BASE = "/api/v1/courses";

export const COURSES_API = {
  createCourse: `${COURSES_API_BASE}`,
  myStats: `${COURSES_API_BASE}/my/stats`,
  myRevenueSummary: `${COURSES_API_BASE}/my/revenue/summary`,
  myRevenueTrend: `${COURSES_API_BASE}/my/revenue/trend`,
  myRevenueTransactions: `${COURSES_API_BASE}/my/revenue/transactions`,
  myList: `${COURSES_API_BASE}/my`,
  adminPendingReview: `${COURSES_API_BASE}/admin/pending-review`,
  adminPendingLessonResources: `${COURSES_API_BASE}/admin/resources/pending-review`,
  adminReview: (id: number | string) => `${COURSES_API_BASE}/${id}/admin-review`,
  adminReviewTimeline: (id: number | string) => `${COURSES_API_BASE}/${id}/admin-review/timeline`,
  adminReviewLessonResource: (resourceId: number | string) => `${COURSES_API_BASE}/resources/${resourceId}/admin-review`,
  adminReviewLessonResourceTimeline: (resourceId: number | string) => `${COURSES_API_BASE}/resources/${resourceId}/admin-review/timeline`,
  myReviewTimeline: (id: number | string) => `${COURSES_API_BASE}/${id}/review-timeline`,
  myRejectedResources: (id: number | string) => `${COURSES_API_BASE}/${id}/rejected-resources`,
  myPendingResources: (id: number | string) => `${COURSES_API_BASE}/${id}/pending-resources`,
  myApprovedResources: (id: number | string) => `${COURSES_API_BASE}/${id}/approved-resources`,
  detail: (id: number | string) => `${COURSES_API_BASE}/${id}`,
  /** GV: thống kê tổng quan một khóa học (biểu đồ, enrollment, …). */
  managerOverview: (id: number | string) => `${COURSES_API_BASE}/${id}/manager-overview`,
  prerequisiteGraph: (id: number | string) => `${COURSES_API_BASE}/${id}/prerequisite-graph`,
  prerequisiteOptions: (id: number | string) => `${COURSES_API_BASE}/${id}/prerequisite-options`,
  update: (id: number | string) => `${COURSES_API_BASE}/${id}`,
  setStatus: (id: number | string) => `${COURSES_API_BASE}/${id}/status`,
  softDelete: (id: number | string) => `${COURSES_API_BASE}/${id}`,
  hardDelete: (id: number | string) => `${COURSES_API_BASE}/${id}/permanent`,
  contentTree: (id: number | string) => `${COURSES_API_BASE}/${id}/content`,
  // Learner view (must be enrolled)
  learning: (id: number | string) => `${COURSES_API_BASE}/${id}/learning`,
  progress: (id: number | string) => `${COURSES_API_BASE}/${id}/progress`,
  leaderboard: (id: number | string) => `${COURSES_API_BASE}/${id}/leaderboard`,
  lessonHeartbeat: (id: number | string, lessonId: number | string) => `${COURSES_API_BASE}/${id}/lessons/${lessonId}/progress`,
  completeLesson: (id: number | string, lessonId: number | string) => `${COURSES_API_BASE}/${id}/lessons/${lessonId}/complete`,
  lessonSummary: (id: number | string, lessonId: number | string) => `${COURSES_API_BASE}/${id}/lessons/${lessonId}/summary`,
  requestLessonSummary: (id: number | string, lessonId: number | string) => `${COURSES_API_BASE}/${id}/lessons/${lessonId}/summary/request`,
  regenerateLessonSummary: (id: number | string, lessonId: number | string) => `${COURSES_API_BASE}/${id}/lessons/${lessonId}/summary/regenerate`,
  // Course manager: completion rules + learner tracking
  completionRules: (id: number | string) => `${COURSES_API_BASE}/${id}/completion-rules`,
  learnersProgress: (id: number | string) => `${COURSES_API_BASE}/${id}/learners/progress`,
  reorderContent: (id: number | string) => `${COURSES_API_BASE}/${id}/content/reorder`,
  createModule: (id: number | string) => `${COURSES_API_BASE}/${id}/modules`,
  updateModule: (id: number | string, moduleId: number | string) =>
    `${COURSES_API_BASE}/${id}/modules/${moduleId}`,
  deleteModule: (id: number | string, moduleId: number | string) =>
    `${COURSES_API_BASE}/${id}/modules/${moduleId}`,
  createLesson: (id: number | string, moduleId: number | string) =>
    `${COURSES_API_BASE}/${id}/modules/${moduleId}/lessons`,
  updateLesson: (id: number | string, lessonId: number | string) =>
    `${COURSES_API_BASE}/${id}/lessons/${lessonId}`,
  deleteLesson: (id: number | string, lessonId: number | string) =>
    `${COURSES_API_BASE}/${id}/lessons/${lessonId}`,
  listLessonResources: (id: number | string, lessonId: number | string) =>
    `${COURSES_API_BASE}/${id}/lessons/${lessonId}/resources`,
  createYoutubeLessonResource: (id: number | string, lessonId: number | string) =>
    `${COURSES_API_BASE}/${id}/lessons/${lessonId}/resources/youtube`,
  deleteLessonResource: (id: number | string, resourceId: number | string) =>
    `${COURSES_API_BASE}/${id}/resources/${resourceId}`,
  viewLessonResource: (courseId: number | string, resourceId: number | string) =>
    `${COURSES_API_BASE}/${courseId}/resources/${resourceId}/view`,
  uploadLessonResource: (id: number | string, lessonId: number | string) =>
    `${COURSES_API_BASE}/${id}/lessons/${lessonId}/resources/upload`,
  uploadLessonResourcePreview: (id: number | string, resourceId: number | string) =>
    `${COURSES_API_BASE}/${id}/resources/${resourceId}/preview`,
  lessonQuiz: (id: number | string, lessonId: number | string) =>
    `${COURSES_API_BASE}/${id}/lessons/${lessonId}/quiz`,
  /** Quiz thủ công (GV): GET/PATCH body qua POST */
  manualQuiz: (id: number | string, lessonId: number | string) =>
    `${COURSES_API_BASE}/${id}/lessons/${lessonId}/quiz/manual`,
  manualQuizAiGenerate: (id: number | string, lessonId: number | string) =>
    `${COURSES_API_BASE}/${id}/lessons/${lessonId}/quiz/manual/ai-generate`,
  /** Học viên: làm bài quiz */
  learnerQuizTake: (id: number | string, lessonId: number | string) =>
    `${COURSES_API_BASE}/${id}/lessons/${lessonId}/quiz/take`,
  learnerQuizSubmit: (id: number | string, lessonId: number | string) =>
    `${COURSES_API_BASE}/${id}/lessons/${lessonId}/quiz/submit`,
  /** Giảng viên: điểm quiz theo học viên */
  quizLearnerScores: (courseId: number | string, lessonId: number | string) =>
    `${COURSES_API_BASE}/${courseId}/lessons/${lessonId}/quiz/learner-scores`,
  quizAttemptDetail: (courseId: number | string, lessonId: number | string, attemptId: number | string) =>
    `${COURSES_API_BASE}/${courseId}/lessons/${lessonId}/quiz/attempts/${attemptId}`,
  uploadCourseThumbnail: () => `${COURSES_API_BASE}/thumbnails/upload`,
   // NEW: Catalog & Enrollment endpoints
  catalog: `${COURSES_API_BASE}/catalog`,
  catalogDetail: (slug: string) => `${COURSES_API_BASE}/catalog/${slug}`,
  catalogPrerequisiteGraph: (slug: string) => `${COURSES_API_BASE}/catalog/${slug}/prerequisite-graph`,
  enroll: (id: number | string) => `${COURSES_API_BASE}/${id}/enroll`,
  enrollmentStatus: (id: number | string) => `${COURSES_API_BASE}/${id}/enrollment-status`,
  myEnrollments: `${COURSES_API_BASE}/my-enrollments`,
  // Backward-compatible alias (avoid breaking older code paths)
  myEnrolled: `${COURSES_API_BASE}/my-enrollments`,
  // Learning activity for dashboard
  myLearningActivity: `${COURSES_API_BASE}/my/learning-activity`,
  // Instructors catalog
  instructorsCatalog: `${COURSES_API_BASE}/instructors/catalog`,
  // Course reviews
  reviews: (id: number | string) => `${COURSES_API_BASE}/${id}/reviews`,
  review: (id: number | string, reviewId: number | string) => `${COURSES_API_BASE}/${id}/reviews/${reviewId}`,
} as const;

