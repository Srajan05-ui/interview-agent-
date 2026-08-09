import { useState } from "react";
import CandidateSetup from "./components/CandidateSetup";
import InterviewUI from "./components/InterviewUI";

function App() {
  const [screen, setScreen] = useState("landing");

  // =========================
  // CANDIDATE SETUP SCREEN
  // =========================
  if (screen === "setup") {
    return (
      <CandidateSetup
        onStart={() => setScreen("interview")}
      />
    );
  }

  // =========================
  // INTERVIEW SCREEN
  // =========================
  if (screen === "interview") {
    return <InterviewUI />;
  }

  // =========================
  // LANDING SCREEN
  // =========================
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <span className="brand-mark">AI</span>
          <span className="brand-name">
            Interview Agent
          </span>
        </div>

        <div className="cohort-status">
          <span className="status-dot"></span>
          AI Cohort
        </div>
      </header>

      {/* Hero Section */}
      <main className="hero-section">
        <div className="hero-content">

          <div className="hero-badge">
            ✦ Personalized Technical Interview
          </div>

          <h1>
            Your AI Interview.
            <br />
            <span>Built around your</span>
            <br />
            <span>journey.</span>
          </h1>

          <p className="hero-description">
            Practice technical interviews based on the concepts,
            projects, and engineering decisions you explored
            throughout the 31-day AI Cohort.
          </p>

          <button
            className="primary-button"
            onClick={() => setScreen("setup")}
          >
            Start Interview
            <span>→</span>
          </button>

          <div className="topic-list">
            <span>RAG</span>
            <span>Vector Databases</span>
            <span>Agentic AI</span>
            <span>MCP</span>
            <span>AI Deployment</span>
          </div>

          <section className="features">

            <div className="feature-card">
              <div className="feature-number">01</div>
              <div>
                <h3>Personalized</h3>
                <p>
                  Questions adapt to your completed cohort
                  missions.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-number">02</div>
              <div>
                <h3>Conversational</h3>
                <p>
                  Follow-up questions respond to what you
                  actually say.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-number">03</div>
              <div>
                <h3>Actionable</h3>
                <p>
                  Finish with a technical scorecard and
                  improvement plan.
                </p>
              </div>
            </div>

          </section>

        </div>
      </main>
    </div>
  );
}

export default App;