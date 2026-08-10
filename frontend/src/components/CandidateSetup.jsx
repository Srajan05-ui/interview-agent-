import { useRef, useState } from "react";
import { uploadResume, startInterview } from "../services/api";
import History from "./History";


// =========================================================
// ALL SUPPORTED LANGUAGES
// =========================================================

const ALL_LANGUAGES = [
  { id: "english",    title: "English",     native: "English",    description: "Professional English interview" },
  { id: "hindi",      title: "Hindi",       native: "हिंदी",       description: "Interview in Hindi" },
  { id: "hinglish",   title: "Hinglish",    native: "Hinglish",   description: "Hindi + English mix" },
  { id: "spanish",    title: "Spanish",     native: "Español",    description: "Interview in Spanish" },
  { id: "french",     title: "French",      native: "Français",   description: "Interview in French" },
  { id: "german",     title: "German",      native: "Deutsch",    description: "Interview in German" },
  { id: "japanese",   title: "Japanese",    native: "日本語",      description: "Interview in Japanese" },
  { id: "chinese",    title: "Chinese",     native: "中文",        description: "Interview in Chinese" },
  { id: "korean",     title: "Korean",      native: "한국어",      description: "Interview in Korean" },
  { id: "arabic",     title: "Arabic",      native: "العربية",    description: "Interview in Arabic" },
  { id: "portuguese", title: "Portuguese",  native: "Português",  description: "Interview in Portuguese" },
  { id: "russian",    title: "Russian",     native: "Русский",    description: "Interview in Russian" },
  { id: "tamil",      title: "Tamil",       native: "தமிழ்",       description: "Interview in Tamil" },
  { id: "telugu",     title: "Telugu",      native: "తెలుగు",      description: "Interview in Telugu" },
  { id: "bengali",    title: "Bengali",     native: "বাংলা",       description: "Interview in Bengali" },
];


// =========================================================
// COMPONENT
// =========================================================

function CandidateSetup({ onStart, onBack }) {
  const fileInputRef = useRef(null);

  // Automatically assign UUID for Candidate ID if not present
  const [candidateId] = useState(() => {
    let id = localStorage.getItem("candidate_id");
    if (!id) {
      id = "CAND-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      localStorage.setItem("candidate_id", id);
    }
    return id;
  });

  const [language, setLanguage] = useState("english");
  const [mode, setMode] = useState("Technical");

  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [langSearch, setLangSearch] = useState("");

  const [resume, setResume] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeMessage, setResumeMessage] = useState("");
  const [atsScore, setAtsScore] = useState(null);
  const [atsFeedback, setAtsFeedback] = useState("");

  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  // -------------------------------------------------------
  // Language
  // -------------------------------------------------------

  const selectedLang =
    ALL_LANGUAGES.find((l) => l.id === language) || ALL_LANGUAGES[0];

  const filteredLanguages = langSearch.trim()
    ? ALL_LANGUAGES.filter(
        (l) =>
          l.title.toLowerCase().includes(langSearch.toLowerCase()) ||
          l.native.toLowerCase().includes(langSearch.toLowerCase())
      )
    : ALL_LANGUAGES;

  function selectLanguage(id) {
    setLanguage(id);
    setLangDropdownOpen(false);
    setLangSearch("");
    localStorage.setItem("interview_language", id);
  }

  // -------------------------------------------------------
  // Resume
  // -------------------------------------------------------

  async function handleResumeChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const extension = file.name.toLowerCase().split(".").pop();

    if (!["pdf", "doc", "docx"].includes(extension)) {
      setError("Please upload a PDF, DOC or DOCX resume.");
      setResume(null);
      setResumeMessage("");
      setAtsScore(null);
      setAtsFeedback("");
      return;
    }

    setError("");
    setResume(file);
    setResumeMessage("Uploading resume to analyze ATS score...");
    setResumeUploading(true);

    try {
      const resumeResponse = await uploadResume(file, candidateId);

      if (resumeResponse?.success === false) {
        setResumeMessage(
          "Resume selected. Interview will continue without resume analysis."
        );
      } else {
        setResumeMessage(
          "Resume analyzed successfully. Interview personalized."
        );
        if (resumeResponse.text) {
          setResumeText(resumeResponse.text);
        }
        if (resumeResponse.ats_score !== undefined) {
          setAtsScore(resumeResponse.ats_score);
          setAtsFeedback(resumeResponse.ats_feedback || "");
        }
      }
    } catch (resumeError) {
      console.warn("Resume upload unavailable:", resumeError);
      setResumeMessage(
        "Resume selected. Interview will continue normally."
      );
    } finally {
      setResumeUploading(false);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  // -------------------------------------------------------
  // Start Interview
  // -------------------------------------------------------

  async function handleStart() {
    setError("");
    setStarting(true);

    try {
      const response = await startInterview({
        candidate_id: candidateId,
        language,
        mode,
        resume_text: resumeText,
      });

      if (response?.session_id) {
        localStorage.setItem(
          "interview_session_id",
          response.session_id
        );
      }

      localStorage.setItem("interview_candidate_id", candidateId);
      localStorage.setItem("interview_language", language);

      onStart({
        candidateId,
        language,
        mode,
        resume,
        resumeText,
        session: response,
      });
    } catch (err) {
      console.error("START INTERVIEW ERROR:", err);
      setError(
        err?.message ||
          "Unable to start interview. Please make sure the FastAPI backend is running."
      );
    } finally {
      setStarting(false);
    }
  }

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------

  return (
    <main className="setup-page">

      {/* BACK BUTTON */}

      {onBack && (
        <button
          type="button"
          className="setup-back-button"
          onClick={onBack}
          disabled={starting}
        >
          ← Back
        </button>
      )}

      {/* HEADER */}

      <section className="setup-hero">

        <div className="setup-badge">
          AI COHORT INTERVIEW
        </div>

        <h1>
          Prepare for your technical
          <br />
          <span>interview.</span>
        </h1>

        <p>
          Your interview will be personalized around your
          skills, experience, projects and technical knowledge.
        </p>

      </section>

      {/* RESUME */}

      <section className="setup-card setup-card-animated">

        <div className="section-label">
          RESUME ANALYSIS
        </div>

        <h2>Upload your resume</h2>

        <p className="section-description">
          Upload your PDF, DOC or DOCX resume so the AI can
          analyze your skills, technologies and experience.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleResumeChange}
          style={{ display: "none" }}
        />

        <div className="resume-upload-box">

          <div className="resume-icon">
            ↑
          </div>

          <div className="resume-information">

            {resume ? (
              <>
                <strong>{resume.name}</strong>
                <span>Resume selected</span>
              </>
            ) : (
              <>
                <strong>Upload your resume</strong>
                <span>PDF, DOC or DOCX</span>
              </>
            )}

          </div>

          <button
            type="button"
            className="browse-button"
            onClick={openFilePicker}
            disabled={starting || resumeUploading}
          >
            {resume ? "Change" : "Browse"}
          </button>

        </div>

        {resumeMessage && (
          <div className="resume-success">
            {resumeMessage}
          </div>
        )}

        {atsScore !== null && (
          <div className="ats-score-box" style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#166534" }}>ATS Score: {atsScore}/100</h3>
            <p style={{ margin: 0, color: "#15803d", fontSize: "0.9rem" }}>{atsFeedback}</p>
          </div>
        )}

      </section>

      {/* LANGUAGE — SCROLLABLE DROPDOWN */}

      <section className="setup-card setup-card-animated" style={{ zIndex: 10 }}>

        <div className="section-label">
          INTERVIEW LANGUAGE
        </div>

        <h2>Choose your language</h2>

        <p className="section-description">
          Questions and AI evaluation will use your selected
          language. Choose from 15+ supported languages.
        </p>

        <div className="lang-dropdown-wrapper">

          {/* Trigger button */}
          <button
            type="button"
            className="lang-dropdown-trigger"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            disabled={starting}
          >
            <div className="lang-trigger-content">
              <span className="lang-trigger-native">
                {selectedLang.native}
              </span>

              <span className="lang-trigger-title">
                {selectedLang.title}
              </span>
            </div>

            <span className={`lang-trigger-arrow ${langDropdownOpen ? "open" : ""}`}>
              ▾
            </span>
          </button>

          {/* Dropdown panel */}
          {langDropdownOpen && (
            <div className="lang-dropdown-panel">

              {/* Search */}
              <div className="lang-search-box">
                <input
                  type="text"
                  className="lang-search-input"
                  placeholder="Search language..."
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Scrollable list */}
              <div className="lang-dropdown-list">

                {filteredLanguages.length === 0 && (
                  <div className="lang-no-results">
                    No languages found
                  </div>
                )}

                {filteredLanguages.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`lang-dropdown-item ${
                      language === item.id ? "lang-selected" : ""
                    }`}
                    onClick={() => selectLanguage(item.id)}
                  >
                    <span className="lang-item-native">
                      {item.native}
                    </span>

                    <span className="lang-item-title">
                      {item.title}
                    </span>

                    <span className="lang-item-desc">
                      {item.description}
                    </span>

                    {language === item.id && (
                      <span className="lang-item-check">✓</span>
                    )}
                  </button>
                ))}

              </div>

            </div>
          )}

        </div>

      </section>

      {/* MODE */}

      <section className="setup-card setup-card-animated">
        <div className="section-label">INTERVIEW MODE</div>
        <h2>Select Interview Type</h2>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button 
            type="button"
            onClick={() => setMode("Technical")}
            style={{ 
              flex: 1, 
              padding: "15px", 
              borderRadius: "10px", 
              border: `2px solid ${mode === "Technical" ? "#628cf1" : "#293750"}`,
              background: mode === "Technical" ? "rgba(98, 140, 241, 0.1)" : "#080e18",
              color: mode === "Technical" ? "#7fa5ff" : "#edf3fb",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Technical Interview
          </button>
          <button 
            type="button"
            onClick={() => setMode("Coding")}
            style={{ 
              flex: 1, 
              padding: "15px", 
              borderRadius: "10px", 
              border: `2px solid ${mode === "Coding" ? "#628cf1" : "#293750"}`,
              background: mode === "Coding" ? "rgba(98, 140, 241, 0.1)" : "#080e18",
              color: mode === "Coding" ? "#7fa5ff" : "#edf3fb",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Coding Interview
          </button>
        </div>
      </section>

      {/* FOCUS */}

      <section className="setup-card setup-card-animated">

        <div className="section-label">
          INTERVIEW FOCUS
        </div>

        <h2>Technical areas</h2>

        <div className="topic-list">

          <span>RAG</span>
          <span>Vector Databases</span>
          <span>Agentic AI</span>
          <span>MCP</span>
          <span>AI Deployment</span>

        </div>

      </section>

      {/* HISTORY */}

      <section className="setup-card setup-card-animated">
        <div className="section-label">
          PAST INTERVIEWS
        </div>
        <h2>Your History</h2>
        <div style={{ marginTop: "1rem" }}>
          <History candidateId={candidateId} />
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div className="setup-error">

          <strong>
            Unable to start interview
          </strong>

          <span>
            {error}
          </span>

        </div>
      )}

      {/* START */}

      <button
        type="button"
        className="begin-interview-button"
        onClick={handleStart}
        disabled={starting || resumeUploading}
      >

        {starting
          ? "Starting Interview..."
          : "Begin Interview"}

        {!starting && (
          <span>
            →
          </span>
        )}

      </button>

      <p className="setup-footer">
        Your selected language will be remembered for your
        next interview.
      </p>

    </main>
  );
}

export default CandidateSetup;