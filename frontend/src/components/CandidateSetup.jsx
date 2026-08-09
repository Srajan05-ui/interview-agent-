import { useRef, useState } from "react";
import { uploadResume, startInterview } from "../services/api";

function CandidateSetup({ onStart, onBack }) {
  const fileInputRef = useRef(null);

  const [candidateId, setCandidateId] = useState(
    localStorage.getItem("candidate_id") || "CAND-001"
  );

  const [language, setLanguage] = useState(
    localStorage.getItem("interview_language") || "english"
  );

  const [resume, setResume] = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeMessage, setResumeMessage] = useState("");

  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const languages = [
    {
      id: "english",
      title: "English",
      description: "Professional English interview",
    },
    {
      id: "hindi",
      title: "हिंदी",
      description: "Interview in Hindi",
    },
    {
      id: "hinglish",
      title: "Hinglish",
      description: "Natural Hindi + English terms",
    },
  ];

  /* =====================================================
     LANGUAGE
  ===================================================== */

  function handleLanguageChange(value) {
    setLanguage(value);

    localStorage.setItem("interview_language", value);
  }

  /* =====================================================
     CANDIDATE ID
  ===================================================== */

  function handleCandidateIdChange(event) {
    const value = event.target.value;

    setCandidateId(value);

    localStorage.setItem("candidate_id", value);
  }

  /* =====================================================
     RESUME
  ===================================================== */

  function handleResumeChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const extension = file.name.toLowerCase().split(".").pop();

    if (!["pdf", "doc", "docx"].includes(extension)) {
      setError("Please upload a PDF, DOC or DOCX resume.");
      setResume(null);
      setResumeMessage("");
      return;
    }

    setError("");
    setResume(file);

    setResumeMessage(
      "Resume selected. It will be used to personalize your interview."
    );
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  /* =====================================================
     START INTERVIEW
  ===================================================== */

  async function handleStart() {
    if (!candidateId.trim()) {
      setError("Please enter a candidate ID.");
      return;
    }

    setError("");
    setStarting(true);

    try {
      localStorage.setItem("candidate_id", candidateId);
      localStorage.setItem("interview_language", language);

      /*
       * Resume upload is optional.
       *
       * If the backend has the resume endpoint,
       * it will be uploaded.
       *
       * If it doesn't, the interview will still start.
       */

      if (resume) {
        setResumeUploading(true);

        setResumeMessage("Uploading resume...");

        try {
          const resumeResponse = await uploadResume(
            resume,
            candidateId
          );

          if (resumeResponse?.success === false) {
            setResumeMessage(
              "Resume selected. Interview will continue without resume analysis."
            );
          } else {
            setResumeMessage(
              "Resume uploaded successfully. Interview personalized."
            );
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

      /*
       * Start the interview.
       */

      const response = await startInterview({
        candidate_id: candidateId,
        language: language,
      });

      /*
       * Store session ID.
       */

      if (response?.session_id) {
        localStorage.setItem(
          "interview_session_id",
          response.session_id
        );
      }

      /*
       * Store interview information.
       */

      localStorage.setItem(
        "interview_candidate_id",
        candidateId
      );

      localStorage.setItem(
        "interview_language",
        language
      );

      onStart({
        candidateId,
        language,
        resume,
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

  /* =====================================================
     UI
  ===================================================== */

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

      {/* CANDIDATE */}

      <section className="setup-card">

        <div className="section-label">
          CANDIDATE
        </div>

        <h2>Candidate details</h2>

        <p className="section-description">
          Enter your candidate ID to begin your personalized
          interview session.
        </p>

        <label className="input-label">
          Candidate ID
        </label>

        <input
          className="setup-input"
          value={candidateId}
          onChange={handleCandidateIdChange}
          placeholder="CAND-001"
          disabled={starting}
        />

      </section>

      {/* RESUME */}

      <section className="setup-card">

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

                <span>
                  Resume selected
                </span>
              </>
            ) : (
              <>
                <strong>
                  Upload your resume
                </strong>

                <span>
                  PDF, DOC or DOCX
                </span>
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

      </section>

      {/* LANGUAGE */}

      <section className="setup-card">

        <div className="section-label">
          INTERVIEW LANGUAGE
        </div>

        <h2>Choose your language</h2>

        <p className="section-description">
          Questions and AI evaluation will use your selected
          language.
        </p>

        <div className="language-grid">

          {languages.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`language-option ${
                language === item.id
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                handleLanguageChange(item.id)
              }
              disabled={starting}
            >

              <strong>
                {item.title}
              </strong>

              <span>
                {item.description}
              </span>

            </button>
          ))}

        </div>

      </section>

      {/* FOCUS */}

      <section className="setup-card">

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