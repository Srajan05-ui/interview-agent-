import { useState } from "react";
import CandidateSetup from "./components/CandidateSetup";
import InterviewUI from "./components/InterviewUI";
import ResultsDashboard from "./components/ResultsDashboard";

function App() {
  const [screen, setScreen] = useState("landing");
  const [interviewData, setInterviewData] = useState(null);

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
        data={interviewData}
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

      {/* Header */}
      <header className="landing-header">

        <div className="brand">
          <div className="brand-mark">
            AI
          </div>

          <div>
            <div className="brand-name">
              Interview Agent
            </div>

            <div className="brand-subtitle">
              AI Technical Interviewer
            </div>
          </div>
        </div>

        <div className="header-status">
          <span className="status-dot"></span>
          System Ready
        </div>

      </header>

      {/* Main */}
      <main className="landing-content">

        <div className="landing-eyebrow">
          AI COHORT INTERVIEW
        </div>

        <h1>
          Prepare for your
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

          <div className="landing-feature">
            <div className="feature-icon">
              AI
            </div>

            <div>
              <strong>AI Interviewer</strong>
              <span>
                Adaptive technical questions
              </span>
            </div>
          </div>

          <div className="landing-feature">
            <div className="feature-icon">
              CV
            </div>

            <div>
              <strong>Resume Based</strong>
              <span>
                Questions based on your skills
              </span>
            </div>
          </div>

          <div className="landing-feature">
            <div className="feature-icon">
              ✓
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
          className="landing-start-button"
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
        <span>AI Interview Agent</span>
        <span>•</span>
        <span>Personalized Technical Interview Platform</span>
      </footer>

    </div>
  );
}

export default App;