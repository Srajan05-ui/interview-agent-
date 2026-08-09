const API_BASE_URL = "http://127.0.0.1:8000";

/**
 * Generic API request helper
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : {
              "Content-Type": "application/json",
            }),
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error(
      "Cannot connect to FastAPI backend. Make sure it is running on http://127.0.0.1:8000"
    );
  }

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      detail: text || "Unknown server response",
    };
  }

  if (!response.ok) {
    const error = new Error(
      data?.detail ||
        data?.message ||
        `Backend request failed (${response.status})`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

/* =========================================================
   HEALTH
========================================================= */

export async function checkHealth() {
  return request("/health");
}

/* =========================================================
   INTERVIEW HEALTH
========================================================= */

export async function interviewHealth() {
  return request("/api/interview/health");
}

/* =========================================================
   START INTERVIEW
========================================================= */

export async function startInterview(payload) {
  /*
   * Primary endpoint used by the current FastAPI project.
   */
  try {
    return await request("/api/interview/start", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    /*
     * Some versions of the backend may expose the route
     * without the /api prefix.
     *
     * Only retry on 404.
     */
    if (error.status !== 404) {
      throw error;
    }

    try {
      return await request("/interview/start", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (secondError) {
      if (secondError.status !== 404) {
        throw secondError;
      }

      throw new Error(
        "Interview start endpoint was not found. Please restart the FastAPI backend and make sure POST /api/interview/start is registered."
      );
    }
  }
}

/* =========================================================
   SUBMIT ANSWER
========================================================= */

export async function submitAnswer(sessionId, answer) {
  const payload = {
    session_id: sessionId,
    answer,
  };

  try {
    return await request("/api/interview/answer", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    return request("/interview/answer", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

/* =========================================================
   INTERVIEW PLAN
========================================================= */

export async function getInterviewPlan(candidateId) {
  return request(`/api/interview/plan/${encodeURIComponent(candidateId)}`);
}

/* =========================================================
   RESUME UPLOAD
========================================================= */

/*
 * IMPORTANT:
 *
 * Resume upload is optional.
 *
 * The current backend may not have a dedicated
 * /api/resume/upload endpoint.
 *
 * Therefore a missing resume endpoint will NOT prevent
 * the candidate from starting the interview.
 */

const RESUME_UPLOAD_ENDPOINTS = [
  "/api/resume/upload",
  "/api/interview/resume/upload",
  "/resume/upload",
];

export async function uploadResume(file, candidateId) {
  if (!file) {
    throw new Error("Please select a resume first.");
  }

  const extension = file.name.toLowerCase().split(".").pop();

  const allowedExtensions = ["pdf", "doc", "docx"];

  if (!allowedExtensions.includes(extension)) {
    throw new Error("Only PDF, DOC and DOCX files are supported.");
  }

  let lastError = null;

  for (const endpoint of RESUME_UPLOAD_ENDPOINTS) {
    try {
      const formData = new FormData();

      formData.append("file", file);

      if (candidateId) {
        formData.append("candidate_id", candidateId);
      }

      return await request(endpoint, {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      lastError = error;

      /*
       * If the endpoint exists but has another problem,
       * don't hide that actual error.
       */
      if (error.status !== 404) {
        throw error;
      }
    }
  }

  /*
   * The resume endpoint does not exist in the current backend.
   * Return a controlled response instead of crashing the UI.
   */
  return {
    success: false,
    unavailable: true,
    message:
      "Resume upload endpoint is not available in the current backend.",
    error: lastError?.message || "Resume endpoint not found",
  };
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  checkHealth,
  interviewHealth,
  startInterview,
  submitAnswer,
  getInterviewPlan,
  uploadResume,
};