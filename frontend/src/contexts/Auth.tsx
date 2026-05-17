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
  apiVerify2FA,
  AuthUser as ApiAuthUser,
  AuthResponse,
  LoginParams,
} from "../services/authClient";
import { MESSAGES } from "../constants/messages";
import { resolvePrimaryRole } from "../utils/roles";
import SessionReauthModal from "../components/SessionReauthModal";
import {
  emitSessionUnauthorized,
  isUnauthorizedMessage,
  SESSION_UNAUTHORIZED_EVENT,
} from "../utils/authEvents";

type AuthUser = ApiAuthUser;
type OAuthPopupSuccessPayload = {
  type: "oauth:success";
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};
type OAuthPopupErrorPayload = {
  type: "oauth:error";
  message: string;
};
type OAuthPopupPayload = OAuthPopupSuccessPayload | OAuthPopupErrorPayload;

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  remember: boolean;
  login: (params: LoginParams & { remember?: boolean; redirect?: boolean }) => Promise<AuthResponse | void>;
  verifyMfa: (params: { email: string; code: string; remember?: boolean; redirect?: boolean }) => Promise<AuthResponse>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => void;
  refreshTokens: () => Promise<boolean>;
  setTokens: (accessToken: string, refreshToken: string, userId: string, userData?: AuthUser) => void;
  setUser: (user: AuthUser | null) => void;
  saveAuthToStorage: (accessToken: string, refreshToken: string, user: AuthUser, remember: boolean) => void;
  clearAuth: () => void;
};

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút không tương tác thì tự động đăng xuất

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface StoredAuthData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser | null;
  lastActiveAt: number;
  remember: boolean;
}

const REAUTH_RETRY_HEADER = "x-session-reauth-retry";

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
    // NHƯNG không xóa localStorage ở đây — chỉ return null để React state quản lý.
    // Xóa localStorage sẽ gây logout tất cả các tab khác cùng lúc.
    const isExpired = Date.now() - lastActiveAt > IDLE_TIMEOUT_MS;
    if (isExpired) {
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
  const role = resolvePrimaryRole(user);
  // Hỗ trợ cả tên role cũ (student/teacher) và mới (learner/course_manager)
  if (role === "student" || role === "learner") {
    navigate("/learner/dashboard", { replace: true });
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
  navigate("/learner/dashboard", { replace: true });
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
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthEmail, setReauthEmail] = useState(initial.user?.email ?? "");
  const [reauthError, setReauthError] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(initial.accessToken);
  const userEmailRef = useRef<string>(initial.user?.email ?? "");
  const reauthPromiseRef = useRef<{
    promise: Promise<boolean>;
    resolve: (value: boolean) => void;
  } | null>(null);

  const isAuthenticated = !!accessToken && !!user;

  useEffect(() => {
    accessTokenRef.current = accessToken;
    userEmailRef.current = user?.email ?? "";
  }, [accessToken, user?.email]);

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
  const clearAuth = useCallback((clearPersistentStorage = false) => {
    window.sessionStorage.removeItem("auth");
    window.sessionStorage.removeItem("access_token");
    // Only clear localStorage (persistent storage) if explicitly requested,
    // e.g. when user explicitly logs out. Idle timeout should NOT clear it
    // because it would log out all other open tabs that share the same localStorage.
    if (clearPersistentStorage) {
      window.localStorage.removeItem("auth");
      window.localStorage.removeItem("access_token");
    }
  }, []);

  const resolveReauthRequests = useCallback((ok: boolean) => {
    if (!reauthPromiseRef.current) return;
    reauthPromiseRef.current.resolve(ok);
    reauthPromiseRef.current = null;
  }, []);

  const ensureReauthFlow = useCallback(() => {
    if (!accessTokenRef.current) {
      return null;
    }

    if (!reauthPromiseRef.current) {
      let resolvePromise: (value: boolean) => void = () => undefined;
      const promise = new Promise<boolean>((resolve) => {
        resolvePromise = resolve;
      });
      reauthPromiseRef.current = {
        promise,
        resolve: resolvePromise,
      };
      setReauthEmail(userEmailRef.current);
      setReauthError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setShowReauthModal(true);
    }

    return reauthPromiseRef.current.promise;
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
  // Backend bỏ field `requires2FA` khi serialize → FE phát hiện 2FA qua việc
  // response thiếu access_token (controller chỉ spread access_token/refresh_token/user).
  const login = useCallback(async (
    params: LoginParams & { remember?: boolean; redirect?: boolean }
  ): Promise<AuthResponse | void> => {
    setIsLoading(true);
    try {
      const data = await apiLogin(params);

      // 2FA: dùng cả `requires2FA` (nếu backend gửi) lẫn fallback "thiếu access_token".
      if (data.requires2FA || !data.access_token) {
        return {
          ...data,
          requires2FA: true,
          email: data.email || params.email,
        } as AuthResponse;
      }

      // Đăng nhập thành công
      const { access_token, refresh_token, user } = data;
      const rememberFlag = params.remember ?? false;

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      setUser(user);
      setRemember(rememberFlag);

      saveAuthToStorage(access_token, refresh_token, user, rememberFlag);

      // Redirect theo role nếu được yêu cầu
      if (params.redirect !== false) {
        redirectByRole(user, navigate);
      }

      return data;
    } catch (err: any) {
      if (isUnauthorizedMessage(err)) {
        emitSessionUnauthorized();
      }
      const code = err?.message as keyof typeof MESSAGES;
      throw new Error(MESSAGES[code] ?? MESSAGES.LOGIN_FAILED);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, saveAuthToStorage]);

  // Hàm xác thực 2FA (gọi POST /api/auth/verify-2fa với { email, code }).
  // apiVerify2FA tự unwrap `{ success, data: {...} }` của BE và normalize tên field.
  const verifyMfa = useCallback(async (
    params: { email: string; code: string; remember?: boolean; redirect?: boolean }
  ): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const data = await apiVerify2FA({ email: params.email, code: params.code });

      const { access_token, refresh_token, user } = data;
      if (!access_token || !user) {
        throw new Error("VERIFY_2FA_FAILED");
      }
      const rememberFlag = params.remember ?? false;

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      setUser(user);
      setRemember(rememberFlag);

      saveAuthToStorage(access_token, refresh_token, user, rememberFlag);

      if (params.redirect !== false) {
        redirectByRole(user, navigate);
      }

      return data;
    } catch (err: any) {
      const code = err?.message as keyof typeof MESSAGES;
      throw new Error(MESSAGES[code] ?? err?.message ?? "Mã xác thực không chính xác.");
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
    resolveReauthRequests(false);
    clearAuth(true); // Clear both session and persistent storage on explicit logout
    navigate("/login", { replace: true });
  }, [refreshToken, resolveReauthRequests, clearAuth, navigate]);

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

  // Idle timeout auto logout — BUT only clear LOCAL state, do NOT call logout()
  // because logout() clears shared localStorage and would log out ALL tabs.
  // Token expiration is handled separately by the fetch interceptor.
  const idleTimerRef = useRef<number | null>(null);
  const isIdleLogoutRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const clearIdleLogout = () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const handleIdleTimeout = () => {
      // Only clear local state — do NOT call logout() which would clear storage for ALL tabs
      isIdleLogoutRef.current = true;
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      resolveReauthRequests(false);
      clearAuth(); // clears this tab's sessionStorage if used
    };

    const resetIdleTimer = () => {
      clearIdleLogout();
      idleTimerRef.current = window.setTimeout(handleIdleTimeout, IDLE_TIMEOUT_MS);
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
      clearIdleLogout();
      events.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [isAuthenticated, updateLastActive, clearAuth, resolveReauthRequests]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const getRequestUrl = (request: RequestInfo | URL) => {
      if (typeof request === "string") return request;
      if (request instanceof URL) return request.href;
      return request.url;
    };

    const isAuthEndpoint = (url: string) =>
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/token") ||
      url.includes("/api/auth/logout") ||
      url.includes("/api/auth/google");

    const wasRetried = (request: RequestInfo | URL, init?: RequestInit) => {
      if (init?.headers) {
        const headers = new Headers(init.headers);
        if (headers.get(REAUTH_RETRY_HEADER) === "1") return true;
      }
      if (request instanceof Request) {
        return request.headers.get(REAUTH_RETRY_HEADER) === "1";
      }
      return false;
    };

    const retryRequestWithLatestToken = async (
      request: RequestInfo | URL,
      init: RequestInit | undefined,
      latestToken: string | null
    ) => {
      const mergedHeaders = new Headers(
        init?.headers ?? (request instanceof Request ? request.headers : undefined)
      );
      mergedHeaders.set(REAUTH_RETRY_HEADER, "1");

      const prevAuthHeader = mergedHeaders.get("Authorization");
      if (prevAuthHeader?.toLowerCase().startsWith("bearer ") && latestToken) {
        mergedHeaders.set("Authorization", `Bearer ${latestToken}`);
      }

      if (request instanceof Request) {
        const retryRequest = new Request(request, {
          ...init,
          headers: mergedHeaders,
        });
        return originalFetch(retryRequest);
      }

      return originalFetch(request, {
        ...(init ?? {}),
        headers: mergedHeaders,
      });
    };

    window.fetch = async (...args) => {
      const [request, init] = args;
      const requestUrl = getRequestUrl(request);
      const response = await originalFetch(...args);

      if (
        response.status === 401 &&
        accessTokenRef.current &&
        !isAuthEndpoint(requestUrl) &&
        !wasRetried(request, init)
      ) {
        emitSessionUnauthorized({ url: requestUrl });
        const reauthPromise = ensureReauthFlow();
        if (!reauthPromise) return response;

        const reauthOk = await reauthPromise;
        if (!reauthOk) return response;

        return retryRequestWithLatestToken(request, init, accessTokenRef.current);
      }

      if (response.status === 401) {
        emitSessionUnauthorized({ url: requestUrl });
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [ensureReauthFlow]);

  useEffect(() => {
    const onUnauthorized = () => {
      ensureReauthFlow();
    };

    window.addEventListener(SESSION_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      window.removeEventListener(SESSION_UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, [ensureReauthFlow]);

  const handleReauthByPassword = useCallback(
    async (password: string) => {
      try {
        setReauthError(null);
        await login({
          email: reauthEmail,
          password,
          remember,
          redirect: false,
        });
        setShowReauthModal(false);
        resolveReauthRequests(true);
      } catch (error: any) {
        setReauthError(error?.message ?? "Đăng nhập lại thất bại.");
      }
    },
    [login, reauthEmail, remember, resolveReauthRequests]
  );

  const handleReauthByGoogle = useCallback(async () => {
    setIsLoading(true);
    setReauthError(null);

    try {
      const authUrl = await apiGetGoogleAuthUrl();
      const popup = window.open(
        authUrl,
        "google-reauth-popup",
        "width=560,height=700,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes"
      );

      if (!popup) {
        throw new Error("Trình duyệt đã chặn popup. Vui lòng cho phép popup và thử lại.");
      }

      const result = await new Promise<OAuthPopupPayload>((resolve, reject) => {
        const timer = window.setInterval(() => {
          if (!popup || popup.closed) {
            window.clearInterval(timer);
            window.removeEventListener("message", onMessage);
            reject(new Error("Bạn đã đóng cửa sổ xác thực Google."));
          }
        }, 500);

        const onMessage = (event: MessageEvent<OAuthPopupPayload>) => {
          if (event.origin !== window.location.origin) return;
          if (!event.data || (event.data.type !== "oauth:success" && event.data.type !== "oauth:error")) {
            return;
          }
          window.clearInterval(timer);
          window.removeEventListener("message", onMessage);
          resolve(event.data);
        };

        window.addEventListener("message", onMessage);
      });

      if (result.type === "oauth:error") {
        throw new Error(result.message || "Đăng nhập lại bằng Google thất bại.");
      }

      setTokens(
        result.accessToken,
        result.refreshToken,
        String(result.user.id),
        result.user
      );
      saveAuthToStorage(
        result.accessToken,
        result.refreshToken,
        result.user,
        remember
      );
      setUser(result.user);
      setShowReauthModal(false);
      resolveReauthRequests(true);
    } catch (error: any) {
      setReauthError(error?.message ?? "Đăng nhập lại bằng Google thất bại.");
    } finally {
      setIsLoading(false);
    }
  }, [remember, resolveReauthRequests, saveAuthToStorage, setTokens]);

  const value: AuthContextValue = {
    isAuthenticated,
    user,
    accessToken,
    refreshToken,
    remember,
    login,
    verifyMfa,
    loginWithGoogle,
    logout,
    updateUser,
    refreshTokens,
    setTokens,
    setUser,
    saveAuthToStorage,
    clearAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionReauthModal
        open={showReauthModal}
        email={reauthEmail}
        onEmailChange={setReauthEmail}
        onSubmitPassword={handleReauthByPassword}
        onGoogleLogin={handleReauthByGoogle}
        error={reauthError}
        loading={isLoading}
        onClose={() => {
          setShowReauthModal(false);
          resolveReauthRequests(false);
        }}
      />
    </AuthContext.Provider>
  );
}

// HOOKS
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};