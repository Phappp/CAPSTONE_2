export const ASSIGNMENTS_API_BASE = "/api/v1/lessons";

export const ASSIGNMENTS_API = {
  createAssignment: (lessonId: number | string) =>
    `${ASSIGNMENTS_API_BASE}/${lessonId}/assignments`,
  uploadAttachments: (lessonId: number | string, assignmentId: number | string) =>
    `${ASSIGNMENTS_API_BASE}/${lessonId}/assignments/${assignmentId}/attachments/upload`,
  previewAssignment: (lessonId: number | string, assignmentId: number | string) =>
    `${ASSIGNMENTS_API_BASE}/${lessonId}/assignments/${assignmentId}/preview`,
  updateAssignment: (lessonId: number | string, assignmentId: number | string) =>
    `${ASSIGNMENTS_API_BASE}/${lessonId}/assignments/${assignmentId}`,
} as const;

