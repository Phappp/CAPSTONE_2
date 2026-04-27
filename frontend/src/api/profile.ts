// Định nghĩa các endpoint liên quan đến hồ sơ cá nhân

export const PROFILE_API_BASE = "/api/v1/profile";

export const PROFILE_API = {
  getProfile: `${PROFILE_API_BASE}`,
  updateProfile: `${PROFILE_API_BASE}`,
  uploadAvatar: `${PROFILE_API_BASE}/avatar`,
  deleteAvatar: `${PROFILE_API_BASE}/avatar`,
  uploadCourseManagerDocument: `${PROFILE_API_BASE}/course-manager-documents`,
  courseManagerReadiness: `${PROFILE_API_BASE}/course-manager-readiness`,
  submitCourseManagerApplication: `${PROFILE_API_BASE}/course-manager-application`,
  changePassword: `${PROFILE_API_BASE}/change-password`,
  updateSecurity: `${PROFILE_API_BASE}/security`,
} as const;

