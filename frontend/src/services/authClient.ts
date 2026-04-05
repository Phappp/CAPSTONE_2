import { url as API_BASE_URL } from "../baseUrl";
import { AUTH_API } from "../api/auth";
import { PROFILE_API } from "../api/profile";

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  roles?: string[];
  primary_role?: string | null;
  is_2fa_enabled?: boolean;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  requires2FA?: boolean;
  email?: string;
};

export type LoginParams = {
  email: string;
  password: string;
  twoFACode?: string;
};

export type GoogleAuthUrlResponse = {
  url: string;
};

export async function apiForgotPassword(params: { email: string }): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${AUTH_API.forgotPassword}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.code || "FORGOT_PASSWORD_FAILED");
  }
}

export async function apiResetPassword(params: {
  token: string;
  new_password: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${AUTH_API.resetPassword}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.code || "RESET_PASSWORD_FAILED");
  }
}

// Đăng ký tài khoản
export async function apiRegister(params: {
  email: string;
  password: string;
  full_name: string;
  role: "learner" | "course_manager";
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${AUTH_API.register}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.code || "REGISTER_FAILED";
    throw new Error(code);
  }
}

// Xác thực OTP đăng ký
export async function apiVerifyRegistrationOtp(params: {
  email: string;
  code: string;
}): Promise<AuthResponse> {
  const res = await fetch(
    `${API_BASE_URL}${AUTH_API.verifyRegistrationOtp}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.code || "VERIFY_OTP_FAILED";
    throw new Error(code);
  }

  return data as AuthResponse;
}

// Đăng nhập (hỗ trợ cả 2FA)
export async function apiLogin(params: LoginParams): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}${AUTH_API.login}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      ...(params.twoFACode && { two_fa_code: params.twoFACode }),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.code || "LOGIN_FAILED";
    throw new Error(code);
  }

  return data as AuthResponse;
}

// Xác thực 2FA
export async function apiVerify2FA(params: {
  email: string;
  code: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}${AUTH_API.verify2FA}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.code || "VERIFY_2FA_FAILED";
    throw new Error(code);
  }

  return data as AuthResponse;
}

// Đăng xuất
export async function apiLogout(params: {
  refreshToken: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${AUTH_API.logout}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: params.refreshToken,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.code || "LOGOUT_FAILED";
    throw new Error(code);
  }
}

// Lấy URL đăng nhập Google
export async function apiGetGoogleAuthUrl(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}${AUTH_API.googleAuthUrl}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.code || "GET_GOOGLE_URL_FAILED";
    throw new Error(code);
  }

  return data.url;
}

// Làm mới token
export async function apiRefreshToken(params: {
  refreshToken: string;
}): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${API_BASE_URL}${AUTH_API.refreshToken}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: params.refreshToken,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.code || "REFRESH_TOKEN_FAILED";
    throw new Error(code);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

// Lấy thông tin user hiện tại
export async function apiGetCurrentUser(accessToken: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}${PROFILE_API.getProfile}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Không thể lấy thông tin người dùng");
  }

  const profile = data?.data ?? data;
  return {
    id: profile?.id,
    email: profile?.email ?? "",
    full_name: profile?.full_name ?? "",
    avatar_url: profile?.avatar_url ?? null,
    roles: Array.isArray(profile?.roles) ? profile.roles : [],
    primary_role: profile?.primary_role ?? null,
  } as AuthUser;
}