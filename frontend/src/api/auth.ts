// File này chỉ khai báo các đường dẫn API của module auth

export const AUTH_API_BASE = "/api/auth";

export const AUTH_API = {
  register: `${AUTH_API_BASE}/register`,
  verifyRegistrationOtp: `${AUTH_API_BASE}/register/verify-otp`,
  login: `${AUTH_API_BASE}/login`,
  logout: `${AUTH_API_BASE}/logout`,
  refreshToken: `${AUTH_API_BASE}/token`,
  googleOAuth: `${AUTH_API_BASE}/google/oauth`,
} as const;
