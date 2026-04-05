type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  // Danh sách role của user (vd: ['student', 'teacher', 'admin'])
  roles?: string[];
  // Role chính để điều hướng (ưu tiên role đầu tiên)
  primary_role?: string | null;
};

type LoginResult = TokenPair & {
  user: AuthUser;
};

type RegisterRequest = {
  email: string;
  password: string;
  fullName: string;
  // 'learner' hoặc 'course_manager'
  role: string;
};

type LoginRequest = {
  email: string;
  password: string;
  ip: string;
  userAgent: string;
};

type RequestPasswordResetRequest = {
  email: string;
};

type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

type ExchangeTokenResult = {
  sub: string;
  refreshToken: string;
  accessToken: string;
};

type ExchangeTokenRequest = {
  code: string;
  idp: string;
};

interface AuthService {
  // Email/password authentication với OTP
  register(request: RegisterRequest): Promise<void>;
  verifyRegistrationOtp(email: string, code: string): Promise<LoginResult>;
  login(request: LoginRequest): Promise<LoginResult>;

  // Google OAuth (giữ lại để tương thích nếu cần)
  exchangeWithGoogleIDP(request: ExchangeTokenRequest): Promise<ExchangeTokenResult>;

  logout(token: string): Promise<void>;
  refreshToken(token: string): Promise<ExchangeTokenResult>;
  verify2FA(email: string, code: string): Promise<LoginResult>;
  requestPasswordReset(request: RequestPasswordResetRequest): Promise<void>;
  resetPassword(request: ResetPasswordRequest): Promise<void>;
}

export {
  AuthService,
  ExchangeTokenRequest,
  ExchangeTokenResult,
  RegisterRequest,
  LoginRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  LoginResult,
  AuthUser,
  TokenPair,
}