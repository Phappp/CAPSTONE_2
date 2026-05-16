import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiForgotPassword } from "../../services/authClient";
import "./LoginPage.css";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await apiForgotPassword({ email });
      setSuccess(
        "The password reset link has been sent. Please check your email."
      );
    } catch (err: any) {
      setError(err?.message ?? "Unable to send request, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1 className="auth-title">Forgot Your Password? We’ve Got You Covered</h1>
        <p className="auth-subtitle">
          Enter the email address associated with your account and we’ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group text-black">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input text-black placeholder-gray-400"
              placeholder="Enter your email address"
            />
          </div>

          {error && <div className="error-box">{error}</div>}
          {success && <div className="success-box">{success}</div>}

          <button type="submit" disabled={loading} className="primary-button">
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="auth-redirect">
          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/login")}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
