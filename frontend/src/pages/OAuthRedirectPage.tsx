// pages/OAuthRedirectPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/Auth";

function resolvePrimaryRole(primaryRole?: string | null, roles?: string[]) {
    const normalizedPrimaryRole = String(primaryRole ?? "").trim().toLowerCase();
    const list = (roles ?? [])
        .map((r) => String(r).trim().toLowerCase())
        .filter(Boolean);
    if (normalizedPrimaryRole) return normalizedPrimaryRole;
    if (list.includes("admin")) return "admin";
    if (list.includes("course_manager")) return "course_manager";
    if (list.includes("teacher")) return "teacher";
    if (list.includes("learner")) return "learner";
    if (list.includes("student")) return "student";
    return list[0] || "learner";
}

export default function OAuthRedirectPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setTokens, saveAuthToStorage, setUser } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleGoogleRedirect = async () => {
            const accessToken = searchParams.get("access_token");
            const refreshToken = searchParams.get("refresh_token");
            const uid = searchParams.get("uid");
            const errorMsg = searchParams.get("error");

            console.log("OAuthRedirectPage - Params:", {
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken,
                uid
            });

            if (errorMsg) {
                setError(decodeURIComponent(errorMsg));
                setTimeout(() => {
                    navigate("/login?error=" + encodeURIComponent(errorMsg));
                }, 3000);
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
                        const { apiGetCurrentUser } = await import("../services/authClient");
                        const userData = await apiGetCurrentUser(accessToken);
                        console.log("User data from API:", userData);

                        const resolvedUser = {
                            ...tempUser,
                            ...userData,
                            roles: userData.roles?.length ? userData.roles : tempUser.roles,
                            primary_role: resolvePrimaryRole(userData.primary_role, userData.roles)
                        };

                        // Lưu token và user
                        setTokens(accessToken, refreshToken, uid, resolvedUser);
                        saveAuthToStorage(accessToken, refreshToken, resolvedUser, true);
                        setUser(resolvedUser);

                        // Redirect theo role
                        const role = resolvePrimaryRole(resolvedUser.primary_role, resolvedUser.roles);
                        if (role === "teacher" || role === "course_manager") {
                            navigate("/teacher/dashboard", { replace: true });
                        } else {
                            navigate("/student/dashboard", { replace: true });
                        }
                    } catch (apiError) {
                        console.warn("Unable to load user profile after Google OAuth:", apiError);
                        setError("Không thể tải quyền tài khoản. Vui lòng đăng nhập lại.");
                        setTimeout(() => {
                            navigate("/login?error=Không thể xác định quyền tài khoản Google", { replace: true });
                        }, 2000);
                    }
                } catch (err: any) {
                    console.error("Failed to process login:", err);
                    setError("Không thể xử lý đăng nhập");
                    setTimeout(() => {
                        navigate("/login?error=Không thể đăng nhập bằng Google");
                    }, 3000);
                }
            } else {
                setError("Không nhận được thông tin xác thực từ Google");
                setTimeout(() => {
                    navigate("/login?error=Không thể đăng nhập bằng Google");
                }, 3000);
            }
        };

        handleGoogleRedirect();
    }, [searchParams, navigate, setTokens, saveAuthToStorage, setUser]);

    return (
        <div className="auth-layout">
            <div className="auth-card" style={{ textAlign: "center" }}>
                <h1 className="auth-title">
                    {error ? "Đăng nhập thất bại" : "Đang xử lý đăng nhập..."}
                </h1>
                {error ? (
                    <>
                        <p className="auth-subtitle" style={{ color: "#f44336" }}>
                            {error}
                        </p>
                        <p>Đang chuyển hướng về trang đăng nhập...</p>
                    </>
                ) : (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>Vui lòng chờ trong giây lát...</p>
                    </div>
                )}
            </div>
        </div>
    );
}