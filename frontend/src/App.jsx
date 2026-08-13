import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import LoginPage from "./components/LoginPage";
import CandidateSetup from "./components/CandidateSetup";
import InterviewUI from "./components/InterviewUI";
import ResultsDashboard from "./components/ResultsDashboard";

function App() {

  const { user, loading, logout } = useAuth();

  const [screen, setScreen] = useState("landing");
  const [interviewData, setInterviewData] = useState(null);

  // --------------------------------------------------
  // AUTH LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner"></div>
        <p>Loading…</p>
      </div>
    );
  }

  // --------------------------------------------------
  // NOT LOGGED IN
  // --------------------------------------------------

  if (!user) {
    return <LoginPage />;
  }

  // --------------------------------------------------
  // START INTERVIEW
  // --------------------------------------------------

  function handleStartInterview(data) {
    console.log("Interview started:", data);
    setInterviewData(data);
    setScreen("interview");
  }

  // --------------------------------------------------
  // EXIT INTERVIEW
  // --------------------------------------------------

  function handleExitInterview() {
    setScreen("setup");
  }

  // --------------------------------------------------
  // INTERVIEW COMPLETE
  // --------------------------------------------------

  function handleCompleteInterview(results) {
    setInterviewData((previous) => ({
      ...(previous || {}),
      results,
    }));

    setScreen("results");
  }

  // ==================================================
  // CANDIDATE SETUP
  // ==================================================

  if (screen === "setup") {
    return (
      <CandidateSetup
        user={user}
        onBack={() => setScreen("landing")}
        onStart={handleStartInterview}
      />
    );
  }

  // ==================================================
  // INTERVIEW
  // ==================================================

  if (screen === "interview") {
    return (
      <InterviewUI
        interviewData={interviewData}
        onExit={handleExitInterview}
        onComplete={handleCompleteInterview}
      />
    );
  }

  // ==================================================
  // RESULTS
  // ==================================================

  if (screen === "results") {
    return (
      <ResultsDashboard
        evaluation={interviewData?.results || {}}
        interviewData={interviewData}
        onRestart={() => setScreen("setup")}
      />
    );
  }

  // ==================================================
  // LANDING PAGE
  // ==================================================

  return (
    <div className="landing-page">

      {/* Background decoration */}
      <div className="landing-glow landing-glow-one"></div>
      <div className="landing-glow landing-glow-two"></div>

      {/* Floating particles */}
      <div className="particles-container">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>

      {/* Header */}
      <header className="landing-header">

        <div className="brand">
          <div className="brand-mark">
            IA
          </div>

          <div>
            <div className="brand-name">
              Interview Acer
            </div>

            <div className="brand-subtitle">
              AI Technical Interviewer
            </div>
          </div>
        </div>

        {/* User profile + logout */}
        <div className="header-user">

          <div className="header-user-info">
            {user.photoURL && (
              <img
                className="header-avatar"
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
              />
            )}

            {!user.photoURL && (
              <div className="header-avatar-fallback">
                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
              </div>
            )}

            <span className="header-user-name">
              {user.displayName || user.email || "User"}
            </span>
          </div>

          <button
            className="header-logout-button"
            onClick={logout}
          >
            Sign out
          </button>
        </div>

      </header>

      {/* Main */}
      <main className="landing-content">

        <div className="landing-eyebrow">
          AI-POWERED INTERVIEW PLATFORM
        </div>

        <h1 className="landing-title-shimmer">
          Ace your next
          <br />
          <span>technical interview.</span>
        </h1>

        <p className="landing-description">
          Practice realistic technical interviews personalized
          around your skills, projects, experience and
          engineering knowledge.
        </p>

        {/* Feature cards */}

        <div className="landing-features">

          <div className="landing-feature glass-card">
            <div className="feature-icon">
              🤖
            </div>

            <div>
              <strong>AI Interviewer</strong>
              <span>
                Adaptive technical questions
              </span>
            </div>
          </div>

          <div className="landing-feature glass-card">
            <div className="feature-icon">
              📄
            </div>

            <div>
              <strong>Resume Based</strong>
              <span>
                Questions based on your skills
              </span>
            </div>
          </div>

          <div className="landing-feature glass-card">
            <div className="feature-icon">
              📊
            </div>

            <div>
              <strong>Detailed Scorecard</strong>
              <span>
                Strengths and weak areas
              </span>
            </div>
          </div>

        </div>

        {/* Start */}

        <button
          className="landing-start-button glow-button"
          onClick={() => setScreen("setup")}
        >
          <span>Configure Interview</span>
          <span className="button-arrow">→</span>
        </button>

        <div className="landing-note">
          No setup required. Choose your preferences and begin.
        </div>

      </main>

      {/* Footer */}

      <footer className="landing-footer">
        <span>Interview Acer</span>
        <span>•</span>
        <span>Personalized Technical Interview Platform</span>
      </footer>

    </div>
  );
}

export default App;