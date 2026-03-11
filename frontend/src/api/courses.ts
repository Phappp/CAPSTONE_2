// Định nghĩa các endpoint liên quan đến khóa học

export const COURSES_API_BASE = "/api/v1/courses";

export const COURSES_API = {
  createCourse: `${COURSES_API_BASE}`,
  // Có thể bổ sung: getDetail, updateCourse, deleteCourse, listCourses, ...
} as const;

