import { useState } from "react";
import ProgressBar from "./ProgressBar";
import ReactMarkdown from "react-markdown";
import { generateRoadmap, improveResume } from "../services/api";

function ResultDashboard({
  evaluation = {},
  interviewData = {},
  onRestart,
}) {
  const {
    overall_score = 0,
    technical_accuracy = 0,
    depth = 0,
    clarity = 0,
    strengths = [],
    weak_areas = [],
    feedback = "",
    improvement_plan = [],
    topic_breakdown = [],
  } = evaluation;

  const [activeTab, setActiveTab] = useState("scorecard");
  const [roadmap, setRoadmap] = useState("");
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [improvedResume, setImprovedResume] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  const handleGenerateRoadmap = async () => {
    if (roadmap || roadmapLoading) return;
    setRoadmapLoading(true);
    try {
      const res = await generateRoadmap(weak_areas);
      if (res?.roadmap) {
        setRoadmap(res.roadmap);
      }
    } catch (err) {
      console.error(err);
      setRoadmap("Failed to generate roadmap. Please try again.");
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleImproveResume = async () => {
    if (improvedResume || resumeLoading) return;
    setResumeLoading(true);
    try {
      const res = await improveResume(interviewData.resumeText || "");
      if (res?.improved_resume) {
        setImprovedResume(res.improved_resume);
      }
    } catch (err) {
      console.error(err);
      setImprovedResume("Failed to generate resume. Please try again.");
    } finally {
      setResumeLoading(false);
    }
  };

  const handleCopyResume = () => {
    if (improvedResume) {
      navigator.clipboard.writeText(improvedResume);
      alert("Resume copied to clipboard!");
    }
  };

  // ---------------------------------------------------------
  // Convert 0-10 score into percentage
  // ---------------------------------------------------------

  const scorePercentage = (score) => {
    return Math.min(
      100,
      Math.max(
        0,
        (Number(score) / 10) * 100
      )
    );
  };

  // ---------------------------------------------------------
  // Format score
  // ---------------------------------------------------------

  const formatScore = (score) => {
    const number = Number(score);

    if (Number.isNaN(number)) {
      return "0.0";
    }

    return number.toFixed(1);
  };

  // ---------------------------------------------------------
  // Safe arrays
  // ---------------------------------------------------------

  const safeStrengths = Array.isArray(strengths)
    ? strengths
    : [];

  const safeWeakAreas = Array.isArray(weak_areas)
    ? weak_areas
    : [];

  const safeImprovementPlan =
    Array.isArray(improvement_plan)
      ? improvement_plan
      : [];

  const safeTopicBreakdown =
    Array.isArray(topic_breakdown)
      ? topic_breakdown
      : [];

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div className="results-page">

      <main className="results-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <section className="results-header">

          <div className="results-badge">
            INTERVIEW COMPLETED
          </div>

          <h1>
            Your Technical
            <br />
            <span>Scorecard</span>
          </h1>

          <p>
            Here is your AI-generated interview
            evaluation and improvement plan.
          </p>

        </section>


        {/* =================================================
            TABS
        ================================================= */}

        <nav className="results-tabs">
          <button className={`tab-button ${activeTab === "scorecard" ? "active" : ""}`} onClick={() => setActiveTab("scorecard")}>Scorecard</button>
          <button className={`tab-button ${activeTab === "roadmap" ? "active" : ""}`} onClick={() => { setActiveTab("roadmap"); handleGenerateRoadmap(); }}>Learning Roadmap</button>
          <button className={`tab-button ${activeTab === "resume" ? "active" : ""}`} onClick={() => { setActiveTab("resume"); handleImproveResume(); }}>ATS Resume Maker</button>
          <button className={`tab-button ${activeTab === "jobs" ? "active" : ""}`} onClick={() => setActiveTab("jobs")}>Job Search</button>
        </nav>

        {activeTab === "scorecard" && (
          <>
            {/* =================================================
                OVERALL SCORE
            ================================================= */}

        <section className="overall-score-card">

          <div className="score-circle">

            <div className="score-value">
              {formatScore(overall_score)}
            </div>

            <div className="score-total">
              / 10
            </div>

          </div>

          <div className="overall-score-content">

            <h2>
              Overall Technical Score
            </h2>

            <p>
              Your overall performance across
              technical accuracy, depth and clarity.
            </p>

          </div>

        </section>


        {/* =================================================
            PERFORMANCE METRICS
        ================================================= */}

        <section className="metrics-section">

          <div className="section-heading">

            <span className="section-number">
              01
            </span>

            <h2>
              Performance
            </h2>

          </div>


          <div className="metrics-grid">

            {/* Technical Accuracy */}

            <div className="metric-card">

              <div className="metric-card-header">

                <h3>
                  Technical Accuracy
                </h3>

                <strong>
                  {formatScore(
                    technical_accuracy
                  )}/10
                </strong>

              </div>

              <ProgressBar
                value={scorePercentage(
                  technical_accuracy
                )}
                max={100}
                showPercentage={false}
              />

            </div>


            {/* Depth */}

            <div className="metric-card">

              <div className="metric-card-header">

                <h3>
                  Depth
                </h3>

                <strong>
                  {formatScore(depth)}/10
                </strong>

              </div>

              <ProgressBar
                value={scorePercentage(depth)}
                max={100}
                showPercentage={false}
              />

            </div>


            {/* Clarity */}

            <div className="metric-card">

              <div className="metric-card-header">

                <h3>
                  Clarity
                </h3>

                <strong>
                  {formatScore(clarity)}/10
                </strong>

              </div>

              <ProgressBar
                value={scorePercentage(clarity)}
                max={100}
                showPercentage={false}
              />

            </div>

          </div>

        </section>


        {/* =================================================
            TOPIC BREAKDOWN
        ================================================= */}

        {safeTopicBreakdown.length > 0 && (

          <section className="topic-section">

            <div className="section-heading">

              <span className="section-number">
                02
              </span>

              <h2>
                Topic Performance
              </h2>

            </div>


            <div className="topic-list">

              {safeTopicBreakdown.map(
                (topic, index) => {

                  const topicName =
                    topic.topic ||
                    topic.name ||
                    `Topic ${index + 1}`;

                  const topicScore =
                    Number(
                      topic.score ?? 0
                    );

                  return (

                    <div
                      className="topic-card"
                      key={index}
                    >

                      <div className="topic-card-header">

                        <span>
                          {topicName}
                        </span>

                        <strong>
                          {formatScore(
                            topicScore
                          )}/10
                        </strong>

                      </div>

                      <ProgressBar
                        value={scorePercentage(
                          topicScore
                        )}
                        max={100}
                        showPercentage={false}
                      />

                      {topic.feedback && (
                        <p>
                          {topic.feedback}
                        </p>
                      )}

                    </div>

                  );
                }
              )}

            </div>

          </section>

        )}


        {/* =================================================
            STRENGTHS & WEAK AREAS
        ================================================= */}

        <section className="feedback-grid">

          {/* Strengths */}

          <div className="feedback-card strengths-card">

            <div className="feedback-card-header">

              <span>
                03
              </span>

              <h2>
                Strengths
              </h2>

            </div>


            {safeStrengths.length > 0 ? (

              <ul>

                {safeStrengths.map(
                  (strength, index) => (

                    <li key={index}>
                      {strength}
                    </li>

                  )
                )}

              </ul>

            ) : (

              <p>
                No specific strengths were
                recorded.
              </p>

            )}

          </div>


          {/* Weak Areas */}

          <div className="feedback-card weaknesses-card">

            <div className="feedback-card-header">

              <span>
                04
              </span>

              <h2>
                Areas to Improve
              </h2>

            </div>


            {safeWeakAreas.length > 0 ? (

              <ul>

                {safeWeakAreas.map(
                  (area, index) => (

                    <li key={index}>
                      {area}
                    </li>

                  )
                )}

              </ul>

            ) : (

              <p>
                No major weak areas were
                identified.
              </p>

            )}

          </div>

        </section>


        {/* =================================================
            AI FEEDBACK
        ================================================= */}

        {feedback && (

          <section className="ai-feedback-section">

            <div className="section-heading">

              <span className="section-number">
                05
              </span>

              <h2>
                AI Interview Feedback
              </h2>

            </div>

            <div className="ai-feedback-card">

              <p>
                {feedback}
              </p>

            </div>

          </section>

        )}


        {/* =================================================
            IMPROVEMENT PLAN
        ================================================= */}

        {safeImprovementPlan.length > 0 && (

          <section className="improvement-section">

            <div className="section-heading">

              <span className="section-number">
                06
              </span>

              <h2>
                Improvement Plan
              </h2>

            </div>


            <div className="improvement-list">

              {safeImprovementPlan.map(
                (item, index) => (

                  <div
                    className="improvement-item"
                    key={index}
                  >

                    <div className="improvement-number">
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    <p>
                      {typeof item === "string"
                        ? item
                        : item.description ||
                          item.action ||
                          item.title ||
                          JSON.stringify(item)}
                    </p>

                  </div>

                )
              )}

            </div>

          </section>

        )}


          </>
        )}

        {/* =================================================
            TAB: AI LEARNING ROADMAP
        ================================================= */}

        {activeTab === "roadmap" && (
          <section className="roadmap-section" style={{ padding: "2rem", borderRadius: "8px", border: "1px solid #293750", marginTop: "2rem", backgroundColor: "#080e18" }}>
            <h2 style={{ color: "#edf3fb" }}>Day-wise Learning Roadmap</h2>
            <p style={{ color: "#7fa5ff", marginBottom: "1.5rem" }}>Based on your weak areas: {weak_areas.join(", ") || "None identified"}</p>
            
            {roadmapLoading ? (
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", color: "#7fa5ff" }}>
                <div className="auth-loading-spinner" style={{ width: "24px", height: "24px", borderWidth: "3px" }}></div>
                <span>Generating your personalized roadmap... this may take up to 30 seconds.</span>
              </div>
            ) : (
              <div className="markdown-content" style={{ color: "#edf3fb", lineHeight: 1.6, padding: "1.5rem", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid #293750", borderRadius: "8px" }}>
                {roadmap ? <ReactMarkdown>{roadmap}</ReactMarkdown> : "No roadmap generated."}
              </div>
            )}
          </section>
        )}

        {/* =================================================
            TAB: ATS RESUME MAKER
        ================================================= */}

        {activeTab === "resume" && (
          <section className="resume-section" style={{ padding: "2rem", borderRadius: "8px", border: "1px solid #293750", marginTop: "2rem", backgroundColor: "#080e18" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ color: "#edf3fb" }}>ATS-Optimized Resume</h2>
              {improvedResume && !resumeLoading && (
                <button onClick={handleCopyResume} className="primary-button" style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}>
                  Copy to Clipboard
                </button>
              )}
            </div>
            
            {resumeLoading ? (
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", color: "#7fa5ff" }}>
                <div className="auth-loading-spinner" style={{ width: "24px", height: "24px", borderWidth: "3px" }}></div>
                <span>Rewriting your resume... this may take up to 30 seconds.</span>
              </div>
            ) : (
              <div className="markdown-content" style={{ color: "#edf3fb", lineHeight: 1.6, padding: "1.5rem", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid #293750", borderRadius: "8px" }}>
                {improvedResume ? <ReactMarkdown>{improvedResume}</ReactMarkdown> : "Could not generate improved resume."}
              </div>
            )}
          </section>
        )}

        {/* =================================================
            TAB: JOB SEARCH
        ================================================= */}

        {activeTab === "jobs" && (
          <section className="jobs-section" style={{ padding: "2rem", borderRadius: "8px", border: "1px solid #293750", marginTop: "2rem", backgroundColor: "#080e18" }}>
            <h2 style={{ color: "#edf3fb" }}>Find Jobs Matching Your Skills</h2>
            <p style={{ color: "#7fa5ff", marginBottom: "1.5rem" }}>We found these key skills based on your interview: <strong>{(interviewData?.session?.skills || []).join(", ") || "General Software Engineering"}</strong></p>
            
            <div style={{ display: "flex", gap: "1rem" }}>
              <a 
                href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent((interviewData?.session?.skills || []).join(" ") || "Software Engineer")}`} 
                target="_blank" 
                rel="noreferrer"
                style={{ flex: 1, padding: "1.5rem", border: "1px solid #628cf1", borderRadius: "8px", textDecoration: "none", color: "#628cf1", fontWeight: "bold", textAlign: "center", backgroundColor: "rgba(98, 140, 241, 0.1)" }}
              >
                Search on LinkedIn
              </a>
              <a 
                href={`https://www.naukri.com/${(interviewData?.session?.skills || []).join("-") || "software-engineer"}-jobs`} 
                target="_blank" 
                rel="noreferrer"
                style={{ flex: 1, padding: "1.5rem", border: "1px solid #00f2fe", borderRadius: "8px", textDecoration: "none", color: "#00f2fe", fontWeight: "bold", textAlign: "center", backgroundColor: "rgba(0, 242, 254, 0.1)" }}
              >
                Search on Naukri.com
              </a>
            </div>
          </section>
        )}

        {/* =================================================
            ACTIONS
        ================================================= */}

        <section className="results-actions">

          {onRestart && (

            <button
              className="primary-button"
              onClick={onRestart}
            >
              Start Another Interview
              <span>→</span>
            </button>

          )}

        </section>

      </main>

    </div>
  );
}

export default ResultDashboard;