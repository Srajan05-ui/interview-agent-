import ProgressBar from "./ProgressBar";

function ResultDashboard({
  evaluation = {},
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