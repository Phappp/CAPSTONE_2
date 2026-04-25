// pages/OAuthRedirectPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/Auth";
import { resolvePrimaryRole } from "../../utils/roles";
import { House, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import transLogo from "../../assets/trans-logo.png";
import "./OAuthRedirectPage.css";

export default function OAuthRedirectPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setTokens, saveAuthToStorage, setUser } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
    const [pendingToken, setPendingToken] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string>("");
    const [isSubmittingRole, setIsSubmittingRole] = useState(false);
    const isPopupFlow = typeof window !== "undefined" && !!window.opener && window.opener !== window;

    const postResultToOpener = (payload: {
        type: "oauth:success";
        accessToken: string;
        refreshToken: string;
        user: any;
    } | {
        type: "oauth:error";
        message: string;
    }) => {
        if (!isPopupFlow || !window.opener) return false;
        window.opener.postMessage(payload, window.location.origin);
        window.close();
        return true;
    };

    const navigateAfterAuth = (fallbackRole: ReturnType<typeof resolvePrimaryRole>) => {
        const returnTo = window.sessionStorage.getItem("post_auth_redirect");
        if (returnTo) {
            window.sessionStorage.removeItem("post_auth_redirect");
            navigate(returnTo, { replace: true });
            return;
        }

        if (fallbackRole === "teacher" || fallbackRole === "course_manager") {
            navigate("/teacher/dashboard", { replace: true });
            return;
        }
        if (fallbackRole === "admin") {
            navigate("/admin", { replace: true });
            return;
        }
        navigate("/student/dashboard", { replace: true });
    };

    useEffect(() => {
        const handleGoogleRedirect = async () => {
            const accessToken = searchParams.get("access_token");
            const refreshToken = searchParams.get("refresh_token");
            const uid = searchParams.get("uid");
            const errorMsg = searchParams.get("error");
            const requiresRoleSelection = searchParams.get("requires_role_selection");
            const tokenForRoleSelection = searchParams.get("pending_token");
            const fullName = searchParams.get("full_name");

            if (errorMsg) {
                const decodedError = decodeURIComponent(errorMsg);
                if (postResultToOpener({ type: "oauth:error", message: decodedError })) {
                    return;
                }
                setError(decodedError);
                setTimeout(() => {
                    navigate("/login?error=" + encodeURIComponent(errorMsg));
                }, 3000);
                return;
            }

            if (requiresRoleSelection === "1" && tokenForRoleSelection) {
                setNeedsRoleSelection(true);
                setPendingToken(tokenForRoleSelection);
                setDisplayName(fullName || "");
                return;
            }

            if (accessToken && refreshToken && uid) {
                try {
                    const tempUser = {
                        id: parseInt(uid),
                        email: "",
                        full_name: "User",
                        roles: ["learner"],
                        primary_role: "learner"
                    };

                    // Thử gọi API nếu có
                    try {
                        const { apiGetCurrentUser } = await import("../../services/authClient");
                        const userData = await apiGetCurrentUser(accessToken);
                        console.log("User data from API:", userData);

                        const resolvedUser = {
                            ...tempUser,
                            ...userData,
                            roles: userData.roles?.length ? userData.roles : tempUser.roles,
                            primary_role: resolvePrimaryRole({
                                ...userData,
                                primary_role: userData.primary_role,
                                roles: userData.roles,
                            })
                        };

                        if (postResultToOpener({
                            type: "oauth:success",
                            accessToken,
                            refreshToken,
                            user: resolvedUser,
                        })) {
                            return;
                        }

                        // Lưu token và user
                        setTokens(accessToken, refreshToken, uid, resolvedUser);
                        saveAuthToStorage(accessToken, refreshToken, resolvedUser, true);
                        setUser(resolvedUser);

                        // Redirect theo role
                        const role = resolvePrimaryRole(resolvedUser);
                        navigateAfterAuth(role);
                    } catch (apiError) {
                        console.warn("Unable to load user profile after Google OAuth:", apiError);
                        if (postResultToOpener({
                            type: "oauth:error",
                            message: "Không thể tải quyền tài khoản. Vui lòng đăng nhập lại.",
                        })) {
                            return;
                        }
                        setError("Không thể tải quyền tài khoản. Vui lòng đăng nhập lại.");
                        setTimeout(() => {
                            navigate("/login?error=Không thể xác định quyền tài khoản Google", { replace: true });
                        }, 2000);
                    }
                } catch (err: any) {
                    if (postResultToOpener({
                        type: "oauth:error",
                        message: "Không thể xử lý đăng nhập",
                    })) {
                        return;
                    }
                    setError("Không thể xử lý đăng nhập");
                    setTimeout(() => {
                        navigate("/login?error=Không thể đăng nhập bằng Google");
                    }, 3000);
                }
            } else {
                if (postResultToOpener({
                    type: "oauth:error",
                    message: "Không nhận được thông tin xác thực từ Google",
                })) {
                    return;
                }
                setError("Không nhận được thông tin xác thực từ Google");
                setTimeout(() => {
                    navigate("/login?error=Không thể đăng nhập bằng Google");
                }, 3000);
            }
        };

        handleGoogleRedirect();
    }, [searchParams, navigate, setTokens, saveAuthToStorage, setUser]);

    const handleSelectRole = async (role: "learner" | "course_manager") => {
        if (!pendingToken || isSubmittingRole) return;
        setIsSubmittingRole(true);
        setError(null);

        try {
            const { apiCompleteGoogleOAuth } = await import("../../services/authClient");
            const result = await apiCompleteGoogleOAuth({
                pendingToken,
                role,
            });

            const authUser = {
                ...result.user,
                primary_role: resolvePrimaryRole(result.user),
            };

            if (postResultToOpener({
                type: "oauth:success",
                accessToken: result.access_token,
                refreshToken: result.refresh_token,
                user: authUser,
            })) {
                return;
            }

            setTokens(result.access_token, result.refresh_token, String(authUser.id), authUser);
            saveAuthToStorage(result.access_token, result.refresh_token, authUser, true);
            setUser(authUser);

            const primaryRole = resolvePrimaryRole(authUser);
            navigateAfterAuth(primaryRole);
        } catch (err: any) {
            const message = err?.message || "Không thể hoàn tất đăng nhập Google.";
            if (postResultToOpener({ type: "oauth:error", message })) {
                return;
            }
            setError(message);
        } finally {
            setIsSubmittingRole(false);
        }
    };

    return (
        <section className="oauth-section">
            <div className="oauth-container">
                <div className="oauth-left">
                    <div className="bg-blur bg-blur-top"></div>
                    <div className="bg-blur bg-blur-bottom"></div>
                    <div className="left-content">
                        <div className="brand">
                            <img src={transLogo} alt="MindBridge logo" />
                        </div>
                        <div className="glass-card">
                            <div className="glass-icon">
                                <Sparkles size={24} />
                            </div>
                            <div className="glass-line line-long"></div>
                            <div className="glass-line line-short"></div>
                        </div>
                        <div className="quote-block">
                            <h2 className="quote-text">Securely connecting your Google account with MindBridge.</h2>
                            <div className="quote-author">
                                <div className="author-divider"></div>
                                <span className="author-name">MindBridge Co.</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="oauth-right">
                    <div className="oauth-form-wrapper">
                        <Link to="/" className="auth-home-link" aria-label="Về trang landing">
                            <House size={16} />
                            <span>Landing</span>
                        </Link>

                        <header className="form-header">
                            <h1 className="form-title">
                                {error ? "Đăng nhập thất bại" : needsRoleSelection ? "Chọn vai trò để tiếp tục" : "Đang xử lý đăng nhập..."}
                            </h1>
                        </header>

                        {error ? (
                            <div className="oauth-state-box error">
                                <p className="form-subtitle">{error}</p>
                                <p className="state-note">Đang chuyển hướng về trang đăng nhập...</p>
                            </div>
                        ) : needsRoleSelection ? (
                            <div className="oauth-state-box">
                                <p className="form-subtitle">
                                    {displayName ? `Xin chào ${displayName}, ` : ""}
                                    bạn muốn dùng tài khoản Google này với vai trò nào?
                                </p>
                                <div className="oauth-role-actions">
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        disabled={isSubmittingRole}
                                        onClick={() => handleSelectRole("learner")}
                                    >
                                        Tôi là học viên
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        disabled={isSubmittingRole}
                                        onClick={() => handleSelectRole("course_manager")}
                                    >
                                        Tôi là giảng viên
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="oauth-state-box">
                                <div className="oauth-loader"></div>
                                <p className="state-note">Vui lòng chờ trong giây lát...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}