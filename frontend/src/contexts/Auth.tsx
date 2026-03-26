import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  apiLogin,
  apiLogout,
  apiGetGoogleAuthUrl,
  apiGetCurrentUser,
  apiRefreshToken,
  AuthUser as ApiAuthUser,
  AuthResponse,
  LoginParams,
} from "../services/authClient";
import { MESSAGES } from "../constants/messages";

type AuthUser = ApiAuthUser;

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (params: LoginParams & { remember?: boolean }) => Promise<AuthResponse | void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => void;
  refreshTokens: () => Promise<boolean>;
  setTokens: (accessToken: string, refreshToken: string, userId: string, userData?: AuthUser) => void;
  setUser: (user: AuthUser | null) => void;
  saveAuthToStorage: (accessToken: string, refreshToken: string, user: AuthUser, remember: boolean) => void;
  clearAuth: () => void;
};

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút không tương tác thì tự động đăng xuất

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface StoredAuthData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser | null;
  lastActiveAt: number;
  remember: boolean;
}

function loadFromStorage(): {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  remember: boolean;
} {
  // Ưu tiên localStorage trước
  let raw = window.localStorage.getItem("auth");
  let remember = true;

  if (!raw) {
    raw = window.sessionStorage.getItem("auth");
    remember = false;
  }

  if (!raw) return { accessToken: null, refreshToken: null, user: null, remember: false };

  try {
    const parsed = JSON.parse(raw);
    const lastActiveAt = typeof parsed.lastActiveAt === "number"
      ? parsed.lastActiveAt
      : Date.now();

    // Nếu đã quá thời gian idle cho phép thì coi như hết session
    if (Date.now() - lastActiveAt > IDLE_TIMEOUT_MS) {
      window.localStorage.removeItem("auth");
      window.sessionStorage.removeItem("auth");
      window.localStorage.removeItem("access_token");
      window.sessionStorage.removeItem("access_token");
      return { accessToken: null, refreshToken: null, user: null, remember: false };
    }

    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      user: parsed.user ?? null,
      remember: parsed.remember ?? false,
    };
  } catch {
    return { accessToken: null, refreshToken: null, user: null, remember: false };
  }
}

function redirectByRole(
  user: AuthUser | null,
  navigate: ReturnType<typeof useNavigate>
) {
  const normalizedPrimaryRole = String(user?.primary_role ?? "")
    .trim()
    .toLowerCase();
  const roles = (user?.roles ?? [])
    .map((r) => String(r).trim().toLowerCase())
    .filter(Boolean);
  // Ưu tiên suy ra role từ roles để tránh trường hợp primary_role bị lệch.
  const role =
    roles.includes("admin")
      ? "admin"
      : roles.includes("course_manager")
      ? "course_manager"
      : roles.includes("teacher")
      ? "teacher"
      : roles.includes("learner")
      ? "learner"
      : roles.includes("student")
      ? "student"
      : normalizedPrimaryRole || roles[0] || "";
  // Hỗ trợ cả tên role cũ (student/teacher) và mới (learner/course_manager)
  if (role === "student" || role === "learner") {
    navigate("/student/dashboard", { replace: true });
    return;
  }
  if (role === "teacher" || role === "course_manager") {
    navigate("/teacher/dashboard", { replace: true });
    return;
  }
  if (role === "admin") {
    navigate("/admin", { replace: true });
    return;
  }
  // Mặc định: học viên
  navigate("/student/dashboard", { replace: true });
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const initial = loadFromStorage();
  const [accessToken, setAccessToken] = useState<string | null>(
    initial.accessToken
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    initial.refreshToken
  );
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [remember, setRemember] = useState<boolean>(initial.remember);
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!accessToken && !!user;

  // Hàm lưu auth data vào storage
  const saveAuthToStorage = useCallback((
    accessToken: string,
    refreshToken: string,
    user: AuthUser,
    remember: boolean
  ) => {
    const storage = remember ? window.localStorage : window.sessionStorage;
    const authData: StoredAuthData = {
      accessToken,
      refreshToken,
      user,
      lastActiveAt: Date.now(),
      remember,
    };
    storage.setItem("auth", JSON.stringify(authData));

    // Lưu riêng access token để dễ truy cập
    if (remember) {
      window.localStorage.setItem("access_token", accessToken);
    } else {
      window.sessionStorage.setItem("access_token", accessToken);
    }
  }, []);

  // Hàm xóa auth data khỏi storage
  const clearAuth = useCallback(() => {
    window.localStorage.removeItem("auth");
    window.sessionStorage.removeItem("auth");
    window.localStorage.removeItem("access_token");
    window.sessionStorage.removeItem("access_token");
  }, []);

  // Hàm cập nhật lastActiveAt
  const updateLastActive = useCallback(() => {
    if (!isAuthenticated) return;

    try {
      const storage = remember ? window.localStorage : window.sessionStorage;
      const raw = storage.getItem("auth");
      if (raw) {
        const parsed = JSON.parse(raw);
        const updated = {
          ...parsed,
          lastActiveAt: Date.now(),
        };
        storage.setItem("auth", JSON.stringify(updated));
      }
    } catch {
      // ignore parse errors
    }
  }, [isAuthenticated, remember]);

  // Hàm set tokens (dùng cho Google OAuth callback)
  const setTokens = useCallback((
    accessToken: string,
    refreshToken: string,
    userId: string,
    userData?: AuthUser
  ) => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    
    if (userData) {
      setUser(userData);
      // Lưu vào storage với user data
      const storage = remember ? window.localStorage : window.sessionStorage;
      const authData: StoredAuthData = {
        accessToken,
        refreshToken,
        user: userData,
        lastActiveAt: Date.now(),
        remember,
      };
      storage.setItem("auth", JSON.stringify(authData));
      
      if (remember) {
        window.localStorage.setItem("access_token", accessToken);
      } else {
        window.sessionStorage.setItem("access_token", accessToken);
      }
    }
  }, [remember]);

  // Hàm làm mới token
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false;

    try {
      const result = await apiRefreshToken({ refreshToken });
      setAccessToken(result.access_token);
      setRefreshToken(result.refresh_token);

      // Cập nhật storage
      if (user) {
        saveAuthToStorage(
          result.access_token,
          result.refresh_token,
          user,
          remember
        );
      }

      return true;
    } catch (error) {
      console.error("Refresh token failed:", error);
      // Nếu refresh token hết hạn, đăng xuất
      await logout();
      return false;
    }
  }, [refreshToken, user, remember, saveAuthToStorage]);

  // Hàm đăng nhập (hỗ trợ cả 2FA)
  const login = useCallback(async (
    params: LoginParams & { remember?: boolean }
  ): Promise<AuthResponse | void> => {
    setIsLoading(true);
    try {
      const data = await apiLogin(params);

      // Nếu yêu cầu 2FA, trả về thông tin để hiển thị form 2FA
      if (data.requires2FA) {
        return data;
      }

      // Đăng nhập thành công
      const { access_token, refresh_token, user } = data;
      const rememberFlag = params.remember ?? false;

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      setUser(user);
      setRemember(rememberFlag);

      saveAuthToStorage(access_token, refresh_token, user, rememberFlag);

      // Redirect theo role
      redirectByRole(user, navigate);

      return data;
    } catch (err: any) {
      const code = err?.message as keyof typeof MESSAGES;
      throw new Error(MESSAGES[code] ?? MESSAGES.LOGIN_FAILED);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, saveAuthToStorage]);

  // Hàm đăng nhập với Google
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const authUrl = await apiGetGoogleAuthUrl();
      // Chuyển hướng đến Google OAuth
      window.location.href = authUrl;
    } catch (err: any) {
      console.error("Google login error:", err);
      throw new Error(err?.message || "Không thể kết nối đến Google");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Hàm đăng xuất
  const logout = useCallback(async () => {
    // Gọi BE để hủy session (best-effort, không chặn UI nếu lỗi)
    if (refreshToken) {
      try {
        await apiLogout({ refreshToken });
      } catch (err: any) {
        console.warn("Logout failed on server:", err?.message ?? "Unknown error");
      }
    }

    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    clearAuth();
    navigate("/login", { replace: true });
  }, [refreshToken, clearAuth, navigate]);

  // Hàm cập nhật user
  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        const storage = remember ? window.localStorage : window.sessionStorage;
        const raw = storage.getItem("auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          const updated = {
            ...parsed,
            user: { ...(parsed.user ?? {}), ...patch },
          };
          storage.setItem("auth", JSON.stringify(updated));
        }
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, [remember]);

  // Kiểm tra token hết hạn và refresh
  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    // Kiểm tra token mỗi 5 phút
    const interval = setInterval(async () => {
      try {
        // Decode token để kiểm tra thời gian hết hạn
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const expTime = payload.exp * 1000;
        const now = Date.now();

        // Nếu token sắp hết hạn (dưới 5 phút), refresh
        if (expTime - now < 5 * 60 * 1000) {
          await refreshTokens();
        }
      } catch {
        // Token không hợp lệ, không làm gì
      }
    }, 60 * 1000); // Kiểm tra mỗi phút

    return () => clearInterval(interval);
  }, [accessToken, refreshToken, refreshTokens]);

  // Redirect nếu đã authenticated và đang ở trang login hoặc root
  useEffect(() => {
    if (isAuthenticated && (location.pathname === "/" || location.pathname === "/login")) {
      redirectByRole(user, navigate);
    }
  }, [isAuthenticated, user, location.pathname, navigate]);

  // Idle timeout auto logout
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const resetIdleTimer = () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        logout();
      }, IDLE_TIMEOUT_MS);

      updateLastActive();
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(event, resetIdleTimer);
    });

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [isAuthenticated, logout, updateLastActive]);

  const value: AuthContextValue = {
    isAuthenticated,
    user,
    accessToken,
    refreshToken,
    login,
    loginWithGoogle,
    logout,
    updateUser,
    refreshTokens,
    setTokens,
    setUser,
    saveAuthToStorage,
    clearAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// HOOKS
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};