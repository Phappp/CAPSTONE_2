// components/GoogleLoginButton.tsx
import { useState } from "react";
import { apiGetGoogleAuthUrl } from "../services/authClient";
import GoogleIcon from "@mui/icons-material/Google";

interface GoogleLoginButtonProps {
    onError?: (error: string) => void;
    className?: string;
    text?: string;
}

export default function GoogleLoginButton({
    onError,
    className = "",
    text = "Đăng nhập với Google"
}: GoogleLoginButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            // Lấy URL xác thực Google từ server
            const authUrl = await apiGetGoogleAuthUrl();
            // Chuyển hướng đến Google OAuth
            window.location.href = authUrl;
        } catch (error: any) {
            onError?.(error.message || "Không thể kết nối đến Google");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`google-login-button ${className}`}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "10px 16px",
                backgroundColor: "#fff",
                color: "#757575",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f8f8f8";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#fff";
            }}
        >
            <GoogleIcon fontSize="small" />
            {loading ? "Đang chuyển hướng..." : text}
        </button>
    );
}