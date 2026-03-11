import { url as API_BASE_URL } from "../baseUrl";
import { AUTH_API } from "../api/auth";

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  roles?: string[];
  primary_role?: string | null;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};

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
    // Trả về mã lỗi kỹ thuật để UI tự map ra message hiển thị
    const code = data?.code || "REGISTER_FAILED";
    throw new Error(code);
  }
}

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

export async function apiLogin(params: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}${AUTH_API.login}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = data?.code || "LOGIN_FAILED";
    throw new Error(code);
  }

  return data as AuthResponse;
}

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


