function App() {
  return (
    <main className="landing-page">
      <nav className="navbar">
        <div className="brand">
          <div className="brand-mark">AI</div>
          <span>Interview Agent</span>
        </div>

        <div className="nav-status">
          <span className="status-dot"></span>
          AI Cohort
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge">
          <span>✦</span>
          Personalized Technical Interview
        </div>

        <h1>
          Your AI interview.
          <br />
          <span>Built around your journey.</span>
        </h1>

        <p className="hero-description">
          Practice technical interviews based on the concepts, projects,
          and engineering decisions you explored throughout the 31-day
          AI Cohort.
        </p>

        <button className="start-button">
          Start Interview
          <span>→</span>
        </button>

        <div className="topics">
          <span>RAG</span>
          <span>Vector Databases</span>
          <span>Agentic AI</span>
          <span>MCP</span>
          <span>AI Deployment</span>
        </div>
      </section>

      <section className="feature-row">
        <div className="feature">
          <div className="feature-number">01</div>
          <div>
            <h3>Personalized</h3>
            <p>
              Questions adapt to your completed cohort missions.
            </p>
          </div>
        </div>

        <div className="feature">
          <div className="feature-number">02</div>
          <div>
            <h3>Conversational</h3>
            <p>
              Follow-up questions respond to what you actually say.
            </p>
          </div>
        </div>

        <div className="feature">
          <div className="feature-number">03</div>
          <div>
            <h3>Actionable</h3>
            <p>
              Finish with a technical scorecard and improvement plan.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;