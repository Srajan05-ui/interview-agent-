const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Common API request helper
 */
async function request(endpoint, options = {}) {
  const config = {
    method: "GET",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {}),
    },
  };

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      config
    );
  } catch (error) {
    throw new Error(
      "Unable to connect to the backend. Make sure the FastAPI server is running on http://127.0.0.1:8000."
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    if (data?.detail) {
      if (typeof data.detail === "string") {
        message = data.detail;
      } else {
        message = JSON.stringify(data.detail);
      }
    } else if (data?.message) {
      message =
        typeof data.message === "string"
          ? data.message
          : JSON.stringify(data.message);
    } else if (data?.error) {
      message =
        typeof data.error === "string"
          ? data.error
          : JSON.stringify(data.error);
    }

    throw new Error(message);
  }

  return data;
}

/* =========================================================
   HEALTH
   ========================================================= */

export async function healthCheck() {
  return request("/health");
}

/* =========================================================
   START INTERVIEW
   ========================================================= */

export async function startInterview({
  candidate_id,
  language = "English",
}) {
  return request("/api/interview/start", {
    method: "POST",
    body: JSON.stringify({
      candidate_id,
      language,
    }),
  });
}

/* =========================================================
   SUBMIT ANSWER
   ========================================================= */

export async function submitAnswer({
  session_id,
  answer,
}) {
  return request("/api/interview/answer", {
    method: "POST",
    body: JSON.stringify({
      session_id,
      answer,
    }),
  });
}

/* =========================================================
   GET INTERVIEW PLAN
   ========================================================= */

export async function getInterviewPlan(candidateId) {
  return request(
    `/api/interview/plan/${encodeURIComponent(candidateId)}`
  );
}

/* =========================================================
   GET SESSION
   ========================================================= */

export async function getSession(sessionId) {
  return request(
    `/api/interview/session/${encodeURIComponent(sessionId)}`
  );
}

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

export default {
  healthCheck,
  startInterview,
  submitAnswer,
  getInterviewPlan,
  getSession,
};