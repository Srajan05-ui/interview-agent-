import { useState } from "react";

import CandidateSetup from "./components/CandidateSetup";
import InterviewUI from "./components/InterviewUI";
import Scorecard from "./components/Scorecard";

function App() {
  const [screen, setScreen] = useState("landing");

  const [interviewData, setInterviewData] = useState({
    candidateId: "CAND-001",
    language: "English",
    resumeFile: null,
  });

  const [interviewResult, setInterviewResult] = useState(null);

  // =====================================================
  // START INTERVIEW
  // =====================================================

  const handleStartInterview = (data) => {
    if (data) {
      setInterviewData((previous) => ({
        ...previous,
        ...data,
      }));
    }

    setScreen("interview");
  };

  // =====================================================
  // INTERVIEW COMPLETED
  // =====================================================

  const handleInterviewComplete = (result) => {
    console.log("Final interview result:", result);

    setInterviewResult(result || {});
    setScreen("scorecard");
  };

  // =====================================================
  // EXIT INTERVIEW
  // =====================================================

  const handleExitInterview = () => {
    setScreen("setup");
  };

  // =====================================================
  // LANDING
  // =====================================================

  if (screen === "landing") {
    return (
      <div className="app">

        <header className="app-header">

          <div className="brand">
            <div className="brand-mark">
              AI
            </div>

            <div>
              <div className="brand-name">
                Interview Agent
              </div>

              <div className="brand-subtitle">
                AI-powered technical interviews
              </div>
            </div>
          </div>

          <div className="cohort-status">
            <span className="status-dot"></span>
            AI Cohort
          </div>

        </header>

        <main className="hero-section">

          <div className="hero-content">

            <div className="hero-badge">
              ✦ Personalized Technical Interview
            </div>

            <h1>
              Your AI Interview.
              <br />

              <span>
                Built around your
              </span>

              <br />

              <span>
                journey.
              </span>
            </h1>

            <p className="hero-description">
              Practice technical interviews based on
              your skills, projects and learning journey
              with an adaptive AI interviewer.
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
                <div className="feature-number">
                  01
                </div>

                <div>
                  <h3>
                    Personalized
                  </h3>

                  <p>
                    Questions adapt to your
                    skills and learning journey.
                  </p>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-number">
                  02
                </div>

                <div>
                  <h3>
                    Conversational
                  </h3>

                  <p>
                    Follow-up questions respond
                    to your answers.
                  </p>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-number">
                  03
                </div>

                <div>
                  <h3>
                    Actionable
                  </h3>

                  <p>
                    Finish with a technical
                    scorecard and improvement plan.
                  </p>
                </div>
              </div>

            </section>

          </div>

        </main>

      </div>
    );
  }

  // =====================================================
  // SETUP
  // =====================================================

  if (screen === "setup") {
    return (
      <CandidateSetup
        onStart={handleStartInterview}
      />
    );
  }

  // =====================================================
  // INTERVIEW
  // =====================================================

  if (screen === "interview") {
    return (
      <InterviewUI
        candidateId={
          interviewData.candidateId
        }

        language={
          interviewData.language
        }

        resumeFile={
          interviewData.resumeFile
        }

        onComplete={
          handleInterviewComplete
        }

        onExit={
          handleExitInterview
        }
      />
    );
  }

  // =====================================================
  // SCORECARD
  // =====================================================

  if (screen === "scorecard") {
    return (
      <Scorecard
        result={interviewResult}
        onBack={() => setScreen("setup")}
      />
    );
  }

  return null;
}

export default App;