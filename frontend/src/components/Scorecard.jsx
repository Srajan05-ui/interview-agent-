import React from "react";

function Scorecard({ result = {}, onBack }) {
  const score =
    result.score ??
    result.overall_score ??
    result.total_score ??
    0;

  const strengths =
    result.strengths ||
    result.strong_areas ||
    [];

  const weakAreas =
    result.weak_areas ||
    result.weakAreas ||
    [];

  const feedback =
    result.feedback ||
    result.overall_feedback ||
    result.evaluation ||
    "";

  const idealAnswer =
    result.ideal_answer ||
    result.idealAnswer ||
    "";

  return (
    <div className="scorecard-page">

      <div className="scorecard-container">

        {/* HEADER */}
        <div className="scorecard-top">

          <div>
            <div className="scorecard-eyebrow">
              INTERVIEW COMPLETE
            </div>

            <h1>
              Technical Interview
              <span> Scorecard</span>
            </h1>

            <p>
              Here's your performance summary and
              areas to improve.
            </p>
          </div>

          <div className="score-circle">
            <strong>{score}</strong>
            <span>/100</span>
          </div>

        </div>

        {/* OVERALL PERFORMANCE */}
        <section className="scorecard-section">

          <div className="section-heading">
            <span className="section-number">01</span>

            <div>
              <h2>Overall Performance</h2>
              <p>
                Your overall technical interview assessment.
              </p>
            </div>
          </div>

          <div className="feedback-card">
            {feedback ? (
              <p>{feedback}</p>
            ) : (
              <p>
                Your interview has been evaluated successfully.
              </p>
            )}
          </div>

        </section>

        {/* STRENGTHS */}
        <section className="scorecard-section">

          <div className="section-heading">
            <span className="section-number">02</span>

            <div>
              <h2>Strong Areas</h2>
              <p>
                Topics where you demonstrated good understanding.
              </p>
            </div>
          </div>

          <div className="result-grid">

            {strengths.length > 0 ? (
              strengths.map((strength, index) => (
                <div
                  className="result-item strength-item"
                  key={index}
                >
                  <span className="result-icon">✓</span>
                  <span>{strength}</span>
                </div>
              ))
            ) : (
              <div className="empty-result">
                No specific strengths were returned.
              </div>
            )}

          </div>

        </section>

        {/* WEAK AREAS */}
        <section className="scorecard-section">

          <div className="section-heading">
            <span className="section-number">03</span>

            <div>
              <h2>Areas to Improve</h2>
              <p>
                Topics that need more practice or revision.
              </p>
            </div>
          </div>

          <div className="result-grid">

            {weakAreas.length > 0 ? (
              weakAreas.map((area, index) => (
                <div
                  className="result-item weak-item"
                  key={index}
                >
                  <span className="result-icon">!</span>
                  <span>{area}</span>
                </div>
              ))
            ) : (
              <div className="empty-result">
                No major weak areas were identified.
              </div>
            )}

          </div>

        </section>

        {/* IDEAL ANSWER */}
        {idealAnswer && (
          <section className="scorecard-section">

            <details className="ideal-answer-card">

              <summary>
                <span>
                  See a strong answer
                </span>

                <span className="summary-arrow">
                  +
                </span>
              </summary>

              <div className="ideal-answer-content">
                <p>{idealAnswer}</p>
              </div>

            </details>

          </section>
        )}

        {/* ACTIONS */}
        <div className="scorecard-actions">

          <button
            className="secondary-action"
            onClick={onBack}
          >
            ← Back to Setup
          </button>

          <button
            className="primary-action"
            onClick={() => window.location.reload()}
          >
            Take Another Interview →
          </button>

        </div>

      </div>

    </div>
  );
}

export default Scorecard;