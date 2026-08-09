import { useEffect, useRef, useState } from "react";
import { submitAnswer } from "../services/api";

function InterviewUI({ session, candidateId, language, onExit }) {
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
          "Camera permission denied. Please allow camera access in Chrome."
        );
      } else if (err.name === "NotFoundError") {
        setCameraError(
          "No camera was found on this device."
        );
      } else {
        setCameraError(
          "Unable to access your camera."
        );
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
        setError(
          "Screen sharing is not supported by this browser."
        );
        return;
      }

      const stream =
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

      screenStreamRef.current = stream;

      const videoTrack =
        stream.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }

      setScreenSharing(true);
      setError("");
    } catch (err) {
      console.error(
        "Screen share error:",
        err
      );

      if (err.name !== "AbortError") {
        setError(
          "Unable to start screen sharing."
        );
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
     MICROPHONE
  ===================================================== */

  function getSpeechLocale() {
    if (language === "hindi") {
      return "hi-IN";
    }

    return "en-IN";
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

    const recognition =
      new SpeechRecognition();

    recognition.lang = getSpeechLocale();

    /*
     * Keep microphone active.
     */
    recognition.continuous = true;

    /*
     * Only final results are used.
     */
    recognition.interimResults = false;

    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setMicOn(true);
      setError("");
    };

    recognition.onresult = (event) => {
      let newText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        if (
          event.results[i].isFinal
        ) {
          newText +=
            event.results[i][0].transcript;
        }
      }

      newText = newText.trim();

      if (!newText) {
        return;
      }

      /*
       * Prevent Chrome from inserting the same
       * speech result multiple times.
       */
      const normalized =
        newText
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

      if (
        normalized ===
        lastSpeechTextRef.current
      ) {
        return;
      }

      lastSpeechTextRef.current =
        normalized;

      setAnswer((previous) => {
        const oldText =
          previous.trim();

        if (!oldText) {
          return newText;
        }

        /*
         * Avoid duplicate phrases.
         */
        if (
          oldText
            .toLowerCase()
            .endsWith(normalized)
        ) {
          return oldText;
        }

        return `${oldText} ${newText}`;
      });
    };

    recognition.onerror = (event) => {
      console.warn(
        "Speech recognition:",
        event.error
      );

      if (
        !shouldListenRef.current
      ) {
        return;
      }

      if (
        event.error ===
          "not-allowed"
      ) {
        shouldListenRef.current =
          false;

        setMicOn(false);

        setError(
          "Microphone permission denied. Please allow microphone access in Chrome."
        );
      }
    };

    recognition.onend = () => {
      /*
       * Chrome may automatically stop recognition.
       * Restart it while the candidate still wants
       * microphone ON.
       */
      if (
        shouldListenRef.current
      ) {
        setTimeout(() => {
          if (
            !shouldListenRef.current
          ) {
            return;
          }

          try {
            recognition.start();
          } catch {
            // Recognition may already be running.
          }
        }, 300);

        return;
      }

      setMicOn(false);

      if (
        recognitionRef.current ===
        recognition
      ) {
        recognitionRef.current =
          null;
      }
    };

    return recognition;
  }

  function startMicrophone() {
    if (micOn) {
      return;
    }

    shouldListenRef.current =
      true;

    lastSpeechTextRef.current =
      "";

    const recognition =
      createRecognition();

    if (!recognition) {
      shouldListenRef.current =
        false;

      return;
    }

    recognitionRef.current =
      recognition;

    try {
      recognition.start();

      setMicOn(true);
    } catch (err) {
      console.error(
        "Microphone start:",
        err
      );

      shouldListenRef.current =
        false;

      setMicOn(false);
    }
  }

  function stopMicrophone() {
    shouldListenRef.current =
      false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    recognitionRef.current =
      null;

    lastSpeechTextRef.current =
      "";

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
    if (!response) {
      return null;
    }

    /*
     * Most likely structure:
     *
     * {
     *   evaluation: {...}
     * }
     */
    if (
      response.evaluation &&
      typeof response.evaluation ===
        "object"
    ) {
      return response.evaluation;
    }

    /*
     * Other common backend structures.
     */
    if (
      response.scorecard &&
      typeof response.scorecard ===
        "object"
    ) {
      return response.scorecard;
    }

    if (
      response.result &&
      typeof response.result ===
        "object"
    ) {
      return response.result;
    }

    if (
      response.final_evaluation &&
      typeof response.final_evaluation ===
        "object"
    ) {
      return response.final_evaluation;
    }

    /*
     * If backend directly returns score fields.
     */
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
    const cleanAnswer =
      answer.trim();

    if (
      !cleanAnswer ||
      submitting ||
      completed
    ) {
      return;
    }

    /*
     * IMPORTANT:
     *
     * Do NOT stop microphone here.
     *
     * Candidate microphone remains ON until
     * candidate manually switches it OFF.
     */
    setSubmitting(true);
    setError("");

    try {
      const sessionId =
        session?.session_id ||
        localStorage.getItem(
          "interview_session_id"
        );

      if (!sessionId) {
        throw new Error(
          "Interview session not found."
        );
      }

      /*
       * Clear answer immediately.
       */
      setAnswer("");

      const response =
        await submitAnswer(
          sessionId,
          cleanAnswer
        );

      console.log(
        "ANSWER RESPONSE:",
        response
      );

      /*
       * Extract evaluation if available.
       */
      const receivedEvaluation =
        extractEvaluation(response);

      if (receivedEvaluation) {
        console.log(
          "EVALUATION RECEIVED:",
          receivedEvaluation
        );

        setEvaluation(
          receivedEvaluation
        );
      }

      /*
       * Determine whether interview is complete.
       */
      const isCompleted =
        response?.completed === true ||
        response?.interview_complete ===
          true ||
        response?.status ===
          "completed";

      if (isCompleted) {
        setCompleted(true);

        /*
         * If evaluation came with the response,
         * show it.
         */
        if (receivedEvaluation) {
          setQuestion(
            "Interview completed."
          );
        } else {
          setQuestion(
            "Interview complete. Preparing your evaluation..."
          );
        }

        setQuestionNumber(
          totalQuestions
        );

        return;
      }

      /*
       * Normal next question.
       */
      const nextQuestion =
        response?.next_question ||
        response?.question ||
        response?.current_question;

      if (nextQuestion) {
        setQuestion(
          nextQuestion
        );

        setQuestionNumber(
          response?.question_number ||
            response?.next_question_number ||
            questionNumber + 1
        );
      }

    } catch (err) {
      console.error(
        "Answer submission error:",
        err
      );

      setAnswer(
        cleanAnswer
      );

      setError(
        err?.message ||
          "Failed to submit your answer. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSubmit();
    }
  }

  /* =====================================================
     AUTO ENABLE CAMERA
  ===================================================== */

  useEffect(() => {
    /*
     * Automatically request camera permission
     * when the interview screen opens.
     */
    enableCamera();

    return () => {
      shouldListenRef.current =
        false;

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }

      if (
        screenStreamRef.current
      ) {
        screenStreamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }

      if (
        recognitionRef.current
      ) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

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
              Question{" "}
              {questionNumber} /{" "}
              {totalQuestions}
            </div>
          </div>

        </div>

        <div className="interview-header-right">

          <div className="interview-language">
            {language === "hindi"
              ? "हिंदी"
              : language ===
                "hinglish"
              ? "Hinglish"
              : "English"}
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
                cameraOn
                  ? "camera-status-on"
                  : ""
              }`}
            >
              <span />

              {cameraOn
                ? "Camera On"
                : "Camera Off"}
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
                  onClick={
                    enableCamera
                  }
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
                micOn
                  ? "control-active"
                  : ""
              }`}
              onClick={
                toggleMicrophone
              }
            >
              <span className="control-icon">
                {micOn
                  ? "●"
                  : "○"}
              </span>

              {micOn
                ? "Microphone On"
                : "Microphone Off"}
            </button>

            <button
              type="button"
              className={`interview-control ${
                cameraOn
                  ? "control-active"
                  : ""
              }`}
              onClick={
                toggleCamera
              }
            >
              <span className="control-icon">
                {cameraOn
                  ? "●"
                  : "○"}
              </span>

              {cameraOn
                ? "Camera On"
                : "Camera Off"}
            </button>

            <button
              type="button"
              className={`interview-control ${
                screenSharing
                  ? "control-active"
                  : ""
              }`}
              onClick={
                toggleScreenShare
              }
            >
              <span className="control-icon">
                □
              </span>

              {screenSharing
                ? "Stop Sharing"
                : "Share Screen"}
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

            <div className="ai-question">

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

                    Generating next
                    question...

                  </div>
                ) : (
                  question
                )}

              </div>

            </div>

            {/* =================================================
                EVALUATION / SCORECARD
               ================================================= */}

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

                    <span>
                      /10
                    </span>

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

                {Array.isArray(
                  evaluation?.strengths
                ) &&
                  evaluation.strengths
                    .length > 0 && (
                    <div className="evaluation-section">

                      <div className="evaluation-label">
                        Strong Areas
                      </div>

                      <ul>
                        {evaluation.strengths.map(
                          (
                            item,
                            index
                          ) => (
                            <li
                              key={
                                index
                              }
                            >
                              {typeof item ===
                              "string"
                                ? item
                                : item?.name ||
                                  item?.area ||
                                  JSON.stringify(
                                    item
                                  )}
                            </li>
                          )
                        )}
                      </ul>

                    </div>
                  )}

                {/* WEAK AREAS */}

                {Array.isArray(
                  evaluation?.weak_areas
                ) &&
                  evaluation.weak_areas
                    .length > 0 && (
                    <div className="evaluation-section">

                      <div className="evaluation-label">
                        Areas to Improve
                      </div>

                      <ul>
                        {evaluation.weak_areas.map(
                          (
                            item,
                            index
                          ) => (
                            <li
                              key={
                                index
                              }
                            >
                              {typeof item ===
                              "string"
                                ? item
                                : item?.name ||
                                  item?.area ||
                                  JSON.stringify(
                                    item
                                  )}
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
                      {
                        evaluation.ideal_answer
                      }
                    </p>

                  </details>
                )}

              </div>
            )}

          </div>

          {/* ANSWER */}

          {!completed && (
            <>
              <div className="answer-container">

                <textarea
                  value={answer}
                  onChange={(event) =>
                    setAnswer(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  placeholder={
                    micOn
                      ? "Speak your answer or type here..."
                      : "Type your answer..."
                  }
                  disabled={
                    submitting
                  }
                />

                <button
                  type="button"
                  className="answer-submit"
                  onClick={
                    handleSubmit
                  }
                  disabled={
                    submitting ||
                    !answer.trim()
                  }
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

          {/* FINAL EVALUATION MESSAGE */}

          {completed &&
            !evaluation && (
              <div className="evaluation-waiting">

                <div className="question-loading">

                  <span />
                  <span />
                  <span />

                  Preparing your
                  evaluation...

                </div>

                <p>
                  Your interview has
                  been completed.
                </p>

              </div>
            )}

        </section>

      </main>

    </div>
  );
}

export default InterviewUI;