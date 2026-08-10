import { useEffect, useState } from "react";
import { getInterviewHistory } from "../services/api";

function History({ candidateId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchHistory() {
      if (!candidateId) return;
      try {
        setLoading(true);
        const res = await getInterviewHistory(candidateId);
        if (res && res.history) {
          setHistory(res.history.reverse()); // Show newest first
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError("Could not load interview history.");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [candidateId]);

  if (loading) {
    return <div style={{ color: "#7fa5ff", padding: "1rem 0" }}>Loading history...</div>;
  }

  if (error) {
    return <div style={{ color: "#f87171", padding: "1rem 0" }}>{error}</div>;
  }

  if (history.length === 0) {
    return (
      <div style={{ color: "#edf3fb", padding: "2rem", backgroundColor: "#080e18", borderRadius: "8px", border: "1px solid #293750", textAlign: "center" }}>
        <p>No past interviews found. Start your first interview!</p>
      </div>
    );
  }

  return (
    <div className="history-section" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {history.map((session, index) => (
        <div key={session.session_id || index} style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          padding: "1.5rem", 
          backgroundColor: "#080e18", 
          borderRadius: "8px", 
          border: "1px solid #293750" 
        }}>
          <div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#edf3fb", fontSize: "1.1rem" }}>
              {session.mode} Interview
            </h3>
            <p style={{ margin: 0, color: "#7fa5ff", fontSize: "0.9rem" }}>
              {session.date} • {session.language}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#edf3fb" }}>
              {session.overall_score.toFixed(1)}<span style={{ fontSize: "1rem", color: "#7fa5ff", fontWeight: "normal" }}>/10</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#7fa5ff", marginTop: "0.2rem" }}>Overall Score</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default History;
