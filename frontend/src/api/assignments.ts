export const ASSIGNMENTS_API_BASE = "/api/v1/lessons";
export const ASSIGNMENTS_SUBMIT_BASE = "/api/v1/assignments";

export const ASSIGNMENTS_API = {
  createAssignment: (lessonId: number | string) =>
    `${ASSIGNMENTS_API_BASE}/${lessonId}/assignments`,
  uploadAttachments: (lessonId: number | string, assignmentId: number | string) =>
    `${ASSIGNMENTS_API_BASE}/${lessonId}/assignments/${assignmentId}/attachments/upload`,
  previewAssignment: (lessonId: number | string, assignmentId: number | string) =>
    `${ASSIGNMENTS_API_BASE}/${lessonId}/assignments/${assignmentId}/preview`,
  updateAssignment: (lessonId: number | string, assignmentId: number | string) =>
    `${ASSIGNMENTS_API_BASE}/${lessonId}/assignments/${assignmentId}`,
  /** Học viên: bài tập mới nhất của bài học (kèm signed URL đề). */
  learnerAssignmentForLesson: (lessonId: number | string) =>
    `${ASSIGNMENTS_API_BASE}/${lessonId}/assignment-for-learner`,
  submitAssignment: (assignmentId: number | string) =>
    `${ASSIGNMENTS_SUBMIT_BASE}/${assignmentId}/submissions`,
  /** Học viên: điểm & feedback bài tập (bản nộp mới nhất). */
  myAssignmentGrade: (assignmentId: number | string) =>
    `${ASSIGNMENTS_SUBMIT_BASE}/${assignmentId}/my-grade`,
  /** Giảng viên: học viên đã ghi danh + đã/chưa nộp (bài tập mới nhất của bài học). */
  assignmentLearnerRoster: (lessonId: number | string) =>
    `${ASSIGNMENTS_API_BASE}/${lessonId}/assignment-learner-roster`,
  /** Giảng viên: danh sách bài nộp để chấm. */
  assignmentSubmissions: (lessonId: number | string, assignmentId: number | string) =>
    `${ASSIGNMENTS_API_BASE}/${lessonId}/assignments/${assignmentId}/submissions`,
  /** Giảng viên: chấm điểm một bài nộp. */
  gradeSubmission: (submissionId: number | string) => `/api/v1/submissions/${submissionId}/grade`,
} as const;

