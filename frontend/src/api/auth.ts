// File này chỉ khai báo các đường dẫn API của module auth

export const AUTH_API_BASE = "/api/auth";

export const AUTH_API = {
  register: `${AUTH_API_BASE}/register`,
  verifyRegistrationOtp: `${AUTH_API_BASE}/register/verify-otp`,
  login: `${AUTH_API_BASE}/login`,
  forgotPassword: `${AUTH_API_BASE}/forgot-password`,
  resetPassword: `${AUTH_API_BASE}/reset-password`,
  logout: `${AUTH_API_BASE}/logout`,
  refreshToken: `${AUTH_API_BASE}/token`,
  googleOAuth: `${AUTH_API_BASE}/google/oauth`,
  googleAuthUrl: `${AUTH_API_BASE}/google/url`, // Thêm endpoint lấy URL Google OAuth
  verify2FA: `${AUTH_API_BASE}/verify-2fa`,
} as const;