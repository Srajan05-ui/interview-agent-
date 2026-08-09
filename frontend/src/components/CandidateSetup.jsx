function CandidateSetup({ onStart }) {
  return (
    <div className="setup-page">
      <main className="setup-container">

        <div className="setup-badge">
          AI COHORT INTERVIEW
        </div>

        <h1 className="setup-title">
          Prepare for your technical
          <br />
          interview.
        </h1>

        <p className="setup-description">
          Your interview will be personalized around the concepts, missions, and projects you completed during the AI Cohort.
        </p>

        <section className="candidate-profile">
          <p className="section-label">
            Candidate Profile
          </p>

          <h2>
            AI Cohort Learner
          </h2>

          <p className="candidate-role">
            AI
          </p>
        </section>

        <section className="interview-focus">
          <p className="section-label">
            Interview Focus
          </p>

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
          onClick={onStart}
        >
          Begin Interview
          <span>→</span>
        </button>
        
        <p className="interview-meta-text">
          The interview contains 8 technical questions.
        </p>

      </main>
    </div>
  );
}

export default CandidateSetup;