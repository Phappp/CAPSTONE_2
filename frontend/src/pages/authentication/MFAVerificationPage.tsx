import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/Auth";
import "./MFAVerificationPage.css";

type LocationState = {
  email?: string;
  remember?: boolean;
};

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function MFAVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyMfa } = useAuth();

  const state = (location.state || {}) as LocationState;
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!state.email) {
      navigate("/login", { replace: true });
    }
  }, [state.email, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (idx: number, value: string) => {
    const ch = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = ch;
      return next;
    });
    if (ch && idx < OTP_LENGTH - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) inputsRef.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < OTP_LENGTH - 1) inputsRef.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputsRef.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = digits.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    if (!state.email) {
      setError("Session expired. Please sign in again.");
      navigate("/login", { replace: true });
      return;
    }
    setLoading(true);
    try {
      await verifyMfa({
        email: state.email,
        code,
        remember: state.remember ?? false,
      });
      // verifyMfa redirects via redirectByRole on success.
    } catch (err: any) {
      setError(err?.message ?? "Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (resendIn > 0) return;
    // Backend không có endpoint resend OTP riêng — OTP chỉ phát lại khi gọi
    // /api/auth/login. Quay về trang login để người dùng nhập lại mật khẩu
    // và nhận mã mới.
    navigate("/login", { replace: true });
  };

  const formatTimer = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="mb-public mfa-page">
      <main className="min-h-screen flex flex-col md:flex-row">
        <section className="hidden md:flex md:w-[40%] bg-[#0F172A] relative flex-col justify-center items-center px-12 text-center overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-teal-400/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-cyan-500/30 rounded-full blur-[80px]"></div>
          <div className="relative z-10 space-y-8">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
                <span className="material-symbols-outlined text-teal-300 text-5xl mfa-icon-filled">
                  psychology
                </span>
              </div>
            </div>
            <h2 className="font-headline text-3xl font-extrabold text-white tracking-tight leading-tight">
              Securing your intellectual journey.
            </h2>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              Advanced encryption and multi-factor authentication protecting your MindBridge workspace.
            </p>
          </div>
        </section>

        <section className="flex-1 bg-white flex flex-col items-center justify-center p-8 md:p-24">
          <div className="md:hidden mb-12 flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-600 text-3xl mfa-icon-filled">
              psychology
            </span>
            <span className="font-headline font-extrabold text-2xl tracking-tighter text-primary">
              MindBridge
            </span>
          </div>
          <div className="w-full max-w-md space-y-10">
            <header className="text-center md:text-left space-y-3">
              <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-primary tracking-tight">
                Check your email
              </h1>
              <p className="text-on-surface-variant text-base">
                We sent a 6-digit verification code{state.email ? ` to ${state.email}` : ""}. Please enter it below to continue.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="flex justify-between gap-3 md:gap-4">
                {digits.map((d, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputsRef.current[idx] = el; }}
                    className="mfa-otp-input"
                    maxLength={1}
                    type="text"
                    inputMode="numeric"
                    value={d}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                  />
                ))}
              </div>

              {error && <div className="mfa-error">{error}</div>}

              <div className="space-y-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer w-full py-4 bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2 group disabled:opacity-60"
                >
                  {loading ? "Verifying…" : "Verify Code"}
                  <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </button>
                <div className="text-center">
                  <p className="text-on-surface-variant text-sm">
                    Didn&apos;t receive the code?{" "}
                    {resendIn > 0 ? (
                      <span className="text-primary font-semibold ml-1 cursor-default">
                        Resend in {formatTimer(resendIn)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="cursor-pointer text-teal-600 font-semibold ml-1 hover:underline"
                        onClick={handleResend}
                      >
                        Resend code
                      </button>
                    )}
                  </p>
                </div>
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="w-full bg-white border-t border-surface-container px-6 py-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-on-surface-variant font-medium">
          <div className="order-2 md:order-1">
            <span className="font-headline font-extrabold text-primary tracking-tight">MindBridge</span>
          </div>
          <div className="flex items-center gap-6 order-1 md:order-2">
            <a className="hover:text-primary transition-colors" href="/privacy">Privacy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-primary transition-colors" href="/contact">Help Center</a>
          </div>
          <div className="order-3">
            <span>© 2024 MindBridge. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
