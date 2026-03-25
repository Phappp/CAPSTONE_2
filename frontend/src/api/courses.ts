// Định nghĩa các endpoint liên quan đến khóa học

export const COURSES_API_BASE = "/api/v1/courses";

export const COURSES_API = {
  createCourse: `${COURSES_API_BASE}`,
  myStats: `${COURSES_API_BASE}/my/stats`,
  myList: `${COURSES_API_BASE}/my`,
  detail: (id: number | string) => `${COURSES_API_BASE}/${id}`,
  update: (id: number | string) => `${COURSES_API_BASE}/${id}`,
  setStatus: (id: number | string) => `${COURSES_API_BASE}/${id}/status`,
  softDelete: (id: number | string) => `${COURSES_API_BASE}/${id}`,
  contentTree: (id: number | string) => `${COURSES_API_BASE}/${id}/content`,
  // Learner view (must be enrolled)
  learning: (id: number | string) => `${COURSES_API_BASE}/${id}/learning`,
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
  uploadCourseThumbnail: () => `${COURSES_API_BASE}/thumbnails/upload`,
   // NEW: Catalog & Enrollment endpoints
  catalog: `${COURSES_API_BASE}/catalog`,
  catalogDetail: (slug: string) => `${COURSES_API_BASE}/catalog/${slug}`,
  enroll: (id: number | string) => `${COURSES_API_BASE}/${id}/enroll`,
  enrollmentStatus: (id: number | string) => `${COURSES_API_BASE}/${id}/enrollment-status`,
  myEnrollments: `${COURSES_API_BASE}/my-enrollments`,
  // Backward-compatible alias (avoid breaking older code paths)
  myEnrolled: `${COURSES_API_BASE}/my-enrollments`,
} as const;

