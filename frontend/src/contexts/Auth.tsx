import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  apiLogin,
  apiLogout,
  AuthUser as ApiAuthUser,
} from "../services/authClient";
import { MESSAGES } from "../constants/messages";

type AuthUser = ApiAuthUser;

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (params: {
    email: string;
    password: string;
    remember: boolean;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
};

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút không tương tác thì tự động đăng xuất

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStorage(remember: boolean) {
  return remember ? window.localStorage : window.sessionStorage;
}

function loadFromStorage(): {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
} {
  const raw =
    window.localStorage.getItem("auth") ||
    window.sessionStorage.getItem("auth");
  if (!raw) return { accessToken: null, refreshToken: null, user: null };
  try {
    const parsed = JSON.parse(raw);
    const lastActiveAt = typeof parsed.lastActiveAt === "number"
      ? parsed.lastActiveAt
      : Date.now();

    // Nếu đã quá thời gian idle cho phép thì coi như hết session
    if (Date.now() - lastActiveAt > IDLE_TIMEOUT_MS) {
      window.localStorage.removeItem("auth");
      window.sessionStorage.removeItem("auth");
      return { accessToken: null, refreshToken: null, user: null };
    }

    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      user: parsed.user ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
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

  const isAuthenticated = !!accessToken && !!user;

  useEffect(() => {
    // Nếu đang ở trang login mà đã authenticated thì redirect theo role
    if (isAuthenticated && location.pathname === "/") {
      redirectByRole(user, navigate);
    }
  }, [isAuthenticated, user, location.pathname, navigate]);

  const login: AuthContextValue["login"] = async ({
    email,
    password,
    remember,
  }) => {
    let data;
    try {
      data = await apiLogin({ email, password });
    } catch (err: any) {
      const code = err?.message as keyof typeof MESSAGES;
      throw new Error(MESSAGES[code] ?? MESSAGES.LOGIN_FAILED);
    }

    const nextAccess = data.access_token;
    const nextRefresh = data.refresh_token;
    const nextUser = data.user;

    setAccessToken(nextAccess);
    setRefreshToken(nextRefresh);
    setUser(nextUser);
    // Lưu thêm access token riêng để các màn khác (ví dụ ProfilePage) có thể đọc trực tiếp
    window.localStorage.setItem("access_token", nextAccess);
    // Luôn lưu vào localStorage kèm thời điểm hoạt động gần nhất.
    window.localStorage.setItem(
      "auth",
      JSON.stringify({
        accessToken: nextAccess,
        refreshToken: nextRefresh,
        user: nextUser,
        lastActiveAt: Date.now(),
      })
    );

    redirectByRole(nextUser, navigate);
  };

  const logout = () => {
    // Gọi BE để hủy session (best-effort, không chặn UI nếu lỗi)
    if (refreshToken) {
      (async () => {
        try {
          await apiLogout({ refreshToken });
        } catch (err: any) {
          // Có thể log ra console, UI vẫn tiếp tục xóa local state
          console.warn(
            "Logout failed on server:",
            err?.message ?? "Unknown error"
          );
        }
      })();
    }

    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    window.localStorage.removeItem("auth");
    window.sessionStorage.removeItem("auth");
    navigate("/", { replace: true });
  };

  const updateUser: AuthContextValue["updateUser"] = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        const raw =
          window.localStorage.getItem("auth") ||
          window.sessionStorage.getItem("auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          const updated = {
            ...parsed,
            user: { ...(parsed.user ?? {}), ...patch },
          };
          window.localStorage.setItem("auth", JSON.stringify(updated));
        }
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const value: AuthContextValue = {
    isAuthenticated,
    user,
    accessToken,
    refreshToken,
    login,
    logout,
    updateUser,
  };

  const idleTimerRef = useRef<number | null>(null);

  // Thiết lập auto-logout nếu người dùng không tương tác trong 5 phút
  useEffect(() => {
    if (!isAuthenticated) {
      // Nếu chưa đăng nhập thì không cần theo dõi idle
      return;
    }

    const resetIdleTimer = () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        // Hết thời gian không hoạt động -> tự động logout
        logout();
      }, IDLE_TIMEOUT_MS);

      // Cập nhật thời điểm hoạt động gần nhất để khi reload tab
      // trong vòng 5 phút vẫn giữ user đăng nhập.
      try {
        const raw =
          window.localStorage.getItem("auth") ||
          window.sessionStorage.getItem("auth");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const updated = {
          ...parsed,
          lastActiveAt: Date.now(),
        };
        window.localStorage.setItem("auth", JSON.stringify(updated));
      } catch {
        // ignore parse errors
      }
    };

    // Các sự kiện được coi là "tương tác" của người dùng
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

    // Khởi tạo timer ngay khi vừa đăng nhập / mount
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [isAuthenticated, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function redirectByRole(
  user: AuthUser | null,
  navigate: ReturnType<typeof useNavigate>
) {
  const role = user?.primary_role || user?.roles?.[0] || "";
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
