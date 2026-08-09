import { useState } from "react";

function CandidateSetup({ onStart }) {
  const [selectedLang, setSelectedLang] = useState("English");

  return (
    <div className="setup-page">
      <main className="setup-container">
        <div className="setup-badge">AI COHORT INTERVIEW</div>

        <h1 className="setup-title">
          Prepare for your technical<br />interview.
        </h1>

        <p className="setup-description">
          Your interview will be personalized around the concepts, missions, and projects you completed during the AI Cohort.
        </p>

        {/* NEW: Language Selection Area */}
        <section className="candidate-profile" style={{ marginTop: '40px' }}>
          <p className="section-label">Interview Language</p>
          <h2 style={{ marginBottom: '20px' }}>Choose your language</h2>
          
          <div className="language-options">
            <button 
              className={`language-option ${selectedLang === "English" ? "selected" : ""}`}
              onClick={() => setSelectedLang("English")}
            >
              <strong>English</strong>
              <span>Professional English interview</span>
            </button>

            <button 
              className={`language-option ${selectedLang === "Hindi" ? "selected" : ""}`}
              onClick={() => setSelectedLang("Hindi")}
            >
              <strong>हिंदी (Hindi)</strong>
              <span>Interview in pure Hindi</span>
            </button>

            <button 
              className={`language-option ${selectedLang === "Hinglish" ? "selected" : ""}`}
              onClick={() => setSelectedLang("Hinglish")}
            >
              <strong>Hinglish</strong>
              <span>Natural Hindi + English terms</span>
            </button>
          </div>
        </section>

        <section className="interview-focus">
          <p className="section-label">Interview Focus</p>
          <div className="setup-topics">
            <span>RAG</span>
            <span>Vector Databases</span>
            <span>Agentic AI</span>
            <span>MCP</span>
            <span>AI Deployment</span>
          </div>
        </section>

        <button
          className="begin-interview-button"
          onClick={() => onStart(selectedLang)} // Pass language up to App.jsx
        >
          Begin Interview
          <span>→</span>
        </button>

        <p className="interview-meta-text">
          Questions and AI evaluation will use your selected language.
        </p>
      </main>
    </div>
  );
}

export default CandidateSetup;