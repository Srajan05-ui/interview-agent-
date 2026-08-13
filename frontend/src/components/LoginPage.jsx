import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";


// =========================================================
// SVG ICONS (inline to avoid extra deps)
// =========================================================

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="22" height="22">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}


// =========================================================
// LOGIN PAGE COMPONENT
// =========================================================

export default function LoginPage() {

  const { signInWithGoogle, signInWithGitHub } = useAuth();

  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  // -------------------------------------------------------
  // Handle Sign In
  // -------------------------------------------------------

  async function handleGoogle() {

    setError(null);
    setLoading(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGitHub() {

    setError(null);
    setLoading(true);

    try {
      await signInWithGitHub();
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  }

  function handleAuthError(err) {

    const code = err?.code || "";

    if (code === "auth/popup-closed-by-user") {
      return;              // user just closed the popup
    }

    if (code === "auth/account-exists-with-different-credential") {
      setError(
        "An account already exists with this email using a different sign-in method. Try the other provider."
      );
      return;
    }

    if (code === "auth/popup-blocked") {
      setError(
        "The sign-in popup was blocked. Please allow popups for this site."
      );
      return;
    }

    setError(
      err?.message || "Sign-in failed. Please try again."
    );
  }

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <div className="login-page">

      {/* Background glows */}
      <div className="login-glow login-glow-one"></div>
      <div className="login-glow login-glow-two"></div>
      <div className="login-glow login-glow-three"></div>

      {/* Floating particles */}
      <div className="particles-container">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>

      {/* Login card */}
      <div className="login-card glass-card">

        {/* Brand */}
        <div className="login-brand">

          <div className="login-brand-mark">
            IA
          </div>

          <div className="login-brand-text">
            <div className="login-brand-name">
              Interview Acer
            </div>

            <div className="login-brand-subtitle">
              AI Technical Interviewer
            </div>
          </div>

        </div>

        {/* Heading */}
        <h1 className="login-heading">
          Welcome back
        </h1>

        <p className="login-subheading">
          Sign in to access your personalized
          technical interview practice.
        </p>

        {/* Error */}
        {error && (
          <div className="login-error">
            <span className="login-error-icon">!</span>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="login-buttons">

          <button
            className="login-social-button login-google"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <button
            className="login-social-button login-github"
            onClick={handleGitHub}
            disabled={loading}
          >
            <GitHubIcon />
            <span>Continue with GitHub</span>
          </button>

        </div>

        {/* Loading */}
        {loading && (
          <div className="login-loading">
            <div className="login-spinner"></div>
            <span>Authenticating…</span>
          </div>
        )}

        {/* Divider */}
        <div className="login-divider">
          <span>Secure Authentication</span>
        </div>

        {/* Footer */}
        <p className="login-footer-text">
          By continuing, you agree to our terms of service.
          Your data is securely handled via Firebase.
        </p>

      </div>

    </div>
  );
}
