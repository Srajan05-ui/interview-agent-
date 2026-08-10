import { useEffect, useRef, useState } from "react";
import { submitAnswer } from "../services/api";

function InterviewUI({ interviewData, onExit, onComplete }) {

  // -------------------------------------------------------
  // Destructure interviewData
  // -------------------------------------------------------

  const session     = interviewData?.session || interviewData;
  const candidateId = interviewData?.candidateId || session?.candidate_id || "";
  const language    = interviewData?.language || session?.language || "english";

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const lastSpeechTextRef = useRef("");

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const [micOn, setMicOn] = useState(false);

  const [screenSharing, setScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [completed, setCompleted] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  const [question, setQuestion] = useState(
    session?.question ||
      session?.current_question ||
      session?.next_question ||
      "Preparing your first interview question..."
  );

  const [questionNumber, setQuestionNumber] = useState(
    session?.question_number || 1
  );

  const [questionFading, setQuestionFading] = useState(false);

  const [totalSeconds, setTotalSeconds] = useState(0);
  const [questionSeconds, setQuestionSeconds] = useState(0);

  const totalQuestions = session?.total_questions || 10;

  /* =====================================================
     CAMERA
  ===================================================== */

  async function enableCamera() {
    try {
      setCameraError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera is not supported by this browser.");
        return;
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCameraOn(true);
    } catch (err) {
      console.error("Camera error:", err);
      setCameraOn(false);

      if (err.name === "NotAllowedError") {
        setCameraError(
          "Camera permission denied. Please allow camera access in your browser settings."
        );
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera was found on this device.");
      } else {
        setCameraError("Unable to access your camera.");
      }
    }
  }

  function disableCamera() {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
  }

  function toggleCamera() {
    if (cameraOn) {
      disableCamera();
    } else {
      enableCamera();
    }
  }

  /* =====================================================
     SCREEN SHARE
  ===================================================== */

  async function startScreenShare() {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setError("Screen sharing is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }

      setScreenSharing(true);
      setError("");
    } catch (err) {
      console.error("Screen share error:", err);

      if (err.name !== "AbortError") {
        setError("Unable to start screen sharing.");
      }
    }
  }

  function stopScreenShare() {
    if (screenStreamRef.current) {
      screenStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setScreenSharing(false);
  }

  function toggleScreenShare() {
    if (screenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }

  /* =====================================================
     MICROPHONE (Speech-to-Text)
  ===================================================== */

  function getSpeechLocale() {
    const lang = (language || "english").toLowerCase();

    const localeMap = {
      english:    "en-US",
      hindi:      "hi-IN",
      hinglish:   "hi-IN",
      spanish:    "es-ES",
      french:     "fr-FR",
      german:     "de-DE",
      japanese:   "ja-JP",
      chinese:    "zh-CN",
      korean:     "ko-KR",
      arabic:     "ar-SA",
      portuguese: "pt-BR",
      russian:    "ru-RU",
      tamil:      "ta-IN",
      telugu:     "te-IN",
      bengali:    "bn-IN",
    };

    return localeMap[lang] || "en-US";
  }

  function createRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported. Please use Google Chrome."
      );
      return null;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = getSpeechLocale();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setMicOn(true);
      setError("");
    };

    recognition.onresult = (event) => {
      let newText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newText += event.results[i][0].transcript;
        }
      }

      newText = newText.trim();

      if (!newText) return;

      const normalized = newText.replace(/\s+/g, " ").trim().toLowerCase();

      if (normalized === lastSpeechTextRef.current) return;

      lastSpeechTextRef.current = normalized;

      setAnswer((previous) => {
        const oldText = previous.trim();

        if (!oldText) return newText;

        if (oldText.toLowerCase().endsWith(normalized)) return oldText;

        return `${oldText} ${newText}`;
      });
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition:", event.error);

      if (!shouldListenRef.current) return;

      if (event.error === "not-allowed") {
        shouldListenRef.current = false;
        setMicOn(false);
        setError(
          "Microphone permission denied. Please allow microphone access in your browser settings."
        );
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        setTimeout(() => {
          if (!shouldListenRef.current) return;

          try {
            recognition.start();
          } catch {
            // Recognition may already be running
          }
        }, 300);

        return;
      }

      setMicOn(false);

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };

    return recognition;
  }

  function startMicrophone() {
    if (micOn) return;

    shouldListenRef.current = true;
    lastSpeechTextRef.current = "";

    const recognition = createRecognition();

    if (!recognition) {
      shouldListenRef.current = false;
      return;
    }

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setMicOn(true);
    } catch (err) {
      console.error("Microphone start:", err);
      shouldListenRef.current = false;
      setMicOn(false);
    }
  }

  function stopMicrophone() {
    shouldListenRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    recognitionRef.current = null;
    lastSpeechTextRef.current = "";
    setMicOn(false);
  }

  function toggleMicrophone() {
    if (micOn) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  }

  /* =====================================================
     EXTRACT EVALUATION
  ===================================================== */

  function extractEvaluation(response) {
    if (!response) return null;

    if (response.evaluation && typeof response.evaluation === "object") {
      return response.evaluation;
    }

    if (response.scorecard && typeof response.scorecard === "object") {
      return response.scorecard;
    }

    if (response.result && typeof response.result === "object") {
      return response.result;
    }

    if (response.final_evaluation && typeof response.final_evaluation === "object") {
      return response.final_evaluation;
    }

    if (
      response.score !== undefined ||
      response.overall_score !== undefined ||
      response.total_score !== undefined
    ) {
      return response;
    }

    return null;
  }

  /* =====================================================
     SUBMIT ANSWER
  ===================================================== */

  async function handleSubmit() {
    const cleanAnswer = answer.trim();

    if (!cleanAnswer || submitting || completed) return;

    setSubmitting(true);
    setError("");

    try {
      const sessionId =
        session?.session_id ||
        localStorage.getItem("interview_session_id");

      if (!sessionId) {
        throw new Error("Interview session not found.");
      }

      setAnswer("");

      const response = await submitAnswer(sessionId, cleanAnswer);

      console.log("ANSWER RESPONSE:", response);

      const receivedEvaluation = extractEvaluation(response);

      if (receivedEvaluation) {
        console.log("EVALUATION RECEIVED:", receivedEvaluation);
        setEvaluation(receivedEvaluation);
      }

      const isCompleted =
        response?.completed === true ||
        response?.interview_complete === true ||
        response?.status === "completed";

      if (isCompleted) {
        setCompleted(true);

        setQuestion("Interview completed.");
        setQuestionNumber(totalQuestions);

        // Call onComplete to navigate to results
        if (onComplete) {
          onComplete(receivedEvaluation || response?.scorecard || response);
        }

        return;
      }

      // Normal next question — animate transition
      const nextQuestion =
        response?.next_question ||
        response?.question ||
        response?.current_question;

      if (nextQuestion) {
        setQuestionFading(true);

        setTimeout(() => {
          setQuestion(nextQuestion);

          setQuestionNumber(
            response?.question_number ||
            response?.next_question_number ||
            questionNumber + 1
          );

          setQuestionSeconds(0);
          setQuestionFading(false);
        }, 250);
      }
    } catch (err) {
      console.error("Answer submission error:", err);
      setAnswer(cleanAnswer);
      setError(
        err?.message || "Failed to submit your answer. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  /* =====================================================
     AUTO ENABLE CAMERA ON MOUNT
  ===================================================== */

  useEffect(() => {
    enableCamera();

    return () => {
      shouldListenRef.current = false;

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }

      if (screenStreamRef.current) {
        screenStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  /* =====================================================
     TIMERS
  ===================================================== */

  useEffect(() => {
    let interval = null;
    if (!completed) {
      interval = setInterval(() => {
        setTotalSeconds(prev => prev + 1);
        setQuestionSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [completed]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  /* =====================================================
     LANGUAGE DISPLAY
  ===================================================== */

  const LANGUAGE_LABELS = {
    english: "English",
    hindi: "हिंदी",
    hinglish: "Hinglish",
    spanish: "Español",
    french: "Français",
    german: "Deutsch",
    japanese: "日本語",
    chinese: "中文",
    korean: "한국어",
    arabic: "العربية",
    portuguese: "Português",
    russian: "Русский",
    tamil: "தமிழ்",
    telugu: "తెలుగు",
    bengali: "বাংলা",
  };

  const displayLanguage =
    LANGUAGE_LABELS[(language || "english").toLowerCase()] || language;

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="interview-page">

      {/* HEADER */}

      <header className="interview-header">

        <div className="interview-status">

          <span className="interview-live-dot" />

          <div>
            <div className="interview-status-title">
              INTERVIEW IN PROGRESS
            </div>

            <div className="interview-question-count">
              Question {questionNumber} / {totalQuestions}
            </div>
          </div>
          
          <div style={{ marginLeft: "2rem", borderLeft: "1px solid #293750", paddingLeft: "2rem", display: "flex", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#7fa5ff", fontWeight: 600, letterSpacing: "1px" }}>THIS QUESTION</div>
              <div style={{ fontSize: "1.1rem", color: "#edf3fb", fontWeight: "bold", fontFamily: "monospace" }}>{formatTime(questionSeconds)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#7fa5ff", fontWeight: 600, letterSpacing: "1px" }}>TOTAL TIME</div>
              <div style={{ fontSize: "1.1rem", color: "#edf3fb", fontWeight: "bold", fontFamily: "monospace" }}>{formatTime(totalSeconds)}</div>
            </div>
          </div>

        </div>

        <div className="interview-header-right">

          <div className="interview-language">
            {displayLanguage}
          </div>

          <button
            type="button"
            className="interview-exit-button"
            onClick={onExit}
          >
            ← Exit Interview
          </button>

        </div>

      </header>

      {/* ERROR */}

      {error && (
        <div className="interview-error">
          <span>!</span>
          {error}
        </div>
      )}

      {/* MAIN */}

      <main className="interview-main">

        {/* CAMERA */}

        <section className="interview-card camera-card">

          <div className="interview-card-header">

            <div>
              <div className="interview-eyebrow">
                CANDIDATE CAMERA
              </div>

              <h2>
                Interview Workspace
              </h2>
            </div>

            <div
              className={`camera-status ${
                cameraOn ? "camera-status-on" : ""
              }`}
            >
              <span />
              {cameraOn ? "Camera On" : "Camera Off"}
            </div>

          </div>

          <div className="camera-view">

            {cameraOn ? (
              <video
                ref={videoRef}
                className="candidate-video"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <div className="camera-disabled">

                <div className="camera-disabled-icon">
                  ◉
                </div>

                <div className="camera-disabled-title">
                  Camera is turned off
                </div>

                <button
                  type="button"
                  className="enable-camera-button"
                  onClick={enableCamera}
                >
                  Enable Camera
                </button>

                {cameraError && (
                  <div className="camera-permission-error">
                    {cameraError}
                  </div>
                )}

              </div>
            )}

          </div>

          {/* CONTROLS */}

          <div className="interview-controls">

            <button
              type="button"
              className={`interview-control ${
                micOn ? "control-active" : ""
              }`}
              onClick={toggleMicrophone}
            >
              <span className="control-icon">
                {micOn ? "●" : "○"}
              </span>
              {micOn ? "Mic On" : "Mic Off"}
            </button>

            <button
              type="button"
              className={`interview-control ${
                cameraOn ? "control-active" : ""
              }`}
              onClick={toggleCamera}
            >
              <span className="control-icon">
                {cameraOn ? "●" : "○"}
              </span>
              {cameraOn ? "Cam On" : "Cam Off"}
            </button>

            <button
              type="button"
              className={`interview-control ${
                screenSharing ? "control-active" : ""
              }`}
              onClick={toggleScreenShare}
            >
              <span className="control-icon">
                □
              </span>
              {screenSharing ? "Stop Share" : "Share Screen"}
            </button>

          </div>

        </section>

        {/* AI INTERVIEWER */}

        <section className="interview-card ai-card">

          <div className="interview-card-header">

            <div>
              <div className="interview-eyebrow">
                AI INTERVIEWER
              </div>

              <h2>
                Technical Interview
              </h2>
            </div>

            <div className="ai-online">
              <span />
              Online
            </div>

          </div>

          <div className="ai-content">

            <div className={`ai-question ${questionFading ? "question-fade-out" : ""}`}>

              <div className="ai-question-label">
                <span>AI</span>
                AI AGENT
              </div>

              <div className="ai-question-text">

                {submitting ? (
                  <div className="question-loading">
                    <span />
                    <span />
                    <span />
                    Generating next question...
                  </div>
                ) : (
                  question
                )}

              </div>

            </div>

            {/* EVALUATION / SCORECARD */}

            {evaluation && (
              <div className="evaluation-result">

                <div className="evaluation-result-header">

                  <div>
                    <div className="interview-eyebrow">
                      INTERVIEW EVALUATION
                    </div>

                    <h3>
                      Performance Score
                    </h3>
                  </div>

                  <div className="evaluation-score">
                    {evaluation?.score ??
                      evaluation?.overall_score ??
                      evaluation?.total_score ??
                      "--"}
                    <span>/10</span>
                  </div>

                </div>

                {/* FEEDBACK */}

                {(evaluation?.feedback ||
                  evaluation?.overall_feedback ||
                  evaluation?.summary) && (
                  <div className="evaluation-section">

                    <div className="evaluation-label">
                      Overall Feedback
                    </div>

                    <p>
                      {evaluation?.feedback ||
                        evaluation?.overall_feedback ||
                        evaluation?.summary}
                    </p>

                  </div>
                )}

                {/* STRENGTHS */}

                {Array.isArray(evaluation?.strengths) &&
                  evaluation.strengths.length > 0 && (
                    <div className="evaluation-section">

                      <div className="evaluation-label">
                        Strong Areas
                      </div>

                      <ul>
                        {evaluation.strengths.map(
                          (item, index) => (
                            <li key={index}>
                              {typeof item === "string"
                                ? item
                                : item?.name ||
                                  item?.area ||
                                  JSON.stringify(item)}
                            </li>
                          )
                        )}
                      </ul>

                    </div>
                  )}

                {/* WEAK AREAS */}

                {Array.isArray(evaluation?.weak_areas) &&
                  evaluation.weak_areas.length > 0 && (
                    <div className="evaluation-section">

                      <div className="evaluation-label">
                        Areas to Improve
                      </div>

                      <ul>
                        {evaluation.weak_areas.map(
                          (item, index) => (
                            <li key={index}>
                              {typeof item === "string"
                                ? item
                                : item?.name ||
                                  item?.area ||
                                  JSON.stringify(item)}
                            </li>
                          )
                        )}
                      </ul>

                    </div>
                  )}

                {/* IDEAL ANSWER */}

                {evaluation?.ideal_answer && (
                  <details className="ideal-answer">

                    <summary>
                      See a strong answer
                    </summary>

                    <p>
                      {evaluation.ideal_answer}
                    </p>

                  </details>
                )}

              </div>
            )}

          </div>

          {/* ANSWER */}

          {!completed && (
            <>
              {session?.mode === "Coding" ? (
                <div style={{ padding: "0 1.5rem", marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: "0.85rem", color: "#7fa5ff", marginBottom: "0.5rem", fontWeight: "600", letterSpacing: "1px" }}>CODE EDITOR</div>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Tab") {
                        e.preventDefault();
                        const start = e.target.selectionStart;
                        const end = e.target.selectionEnd;
                        setAnswer(answer.substring(0, start) + "  " + answer.substring(end));
                        // Set cursor position back slightly delayed
                        setTimeout(() => {
                          e.target.selectionStart = e.target.selectionEnd = start + 2;
                        }, 0);
                      }
                      if (e.key === "Enter" && e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    style={{
                      width: "100%",
                      minHeight: "300px",
                      backgroundColor: "#050914",
                      color: "#e2e8f0",
                      fontFamily: "'Fira Code', 'Courier New', Courier, monospace",
                      fontSize: "14px",
                      padding: "1rem",
                      border: "1px solid #293750",
                      borderRadius: "8px",
                      outline: "none",
                      resize: "vertical",
                      lineHeight: "1.5",
                      tabSize: 2
                    }}
                    placeholder="// Write your code here...&#10;// Use Tab to indent&#10;// Shift+Enter to submit"
                    disabled={submitting}
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleSubmit}
                    disabled={submitting || !answer.trim()}
                    style={{ marginTop: "1rem", width: "100%", padding: "1rem", fontSize: "1rem" }}
                  >
                    Submit Code →
                  </button>
                </div>
              ) : (
                <>
                  <div className="answer-container">
                    <textarea
                      value={answer}
                      onChange={(event) =>
                        setAnswer(event.target.value)
                      }
                      onKeyDown={handleKeyDown}
                      placeholder={
                        micOn
                          ? "Speak your answer or type here..."
                          : "Type your answer..."
                      }
                      disabled={submitting}
                    />

                    <button
                      type="button"
                      className="answer-submit"
                      onClick={handleSubmit}
                      disabled={submitting || !answer.trim()}
                    >
                      →
                    </button>
                  </div>

                  <div className="answer-hint">
                    <span>
                      Enter to submit
                    </span>

                    <span>
                      {micOn
                        ? "● Microphone listening"
                        : "Microphone off"}
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          {/* FINAL EVALUATION MESSAGE */}

          {completed && !evaluation && (
            <div className="evaluation-waiting">

              <div className="question-loading">
                <span />
                <span />
                <span />
                Preparing your evaluation...
              </div>

              <p>
                Your interview has been completed.
              </p>

            </div>
          )}

        </section>

      </main>

    </div>
  );
}

export default InterviewUI;