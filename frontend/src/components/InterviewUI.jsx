import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  startInterview,
  submitAnswer,
} from "../services/api";


function InterviewUI({
  candidateId = "CAND-001",
  language = "English",
  resumeFile = null,
  onComplete,
  onExit,
}) {
  /* =====================================================
     STATE
     ===================================================== */

  const [sessionId, setSessionId] = useState(null);

  const [question, setQuestion] = useState("");

  const [questionNumber, setQuestionNumber] =
    useState(1);

  const [totalQuestions, setTotalQuestions] =
    useState(10);

  const [answer, setAnswer] = useState("");

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const [evaluation, setEvaluation] =
    useState(null);

  const [cameraOn, setCameraOn] =
    useState(false);

  const [micOn, setMicOn] =
    useState(false);

  const [listening, setListening] =
    useState(false);

  const [cameraError, setCameraError] =
    useState("");

  /* =====================================================
     REFS
     ===================================================== */

  const videoRef = useRef(null);

  const streamRef = useRef(null);

  const recognitionRef = useRef(null);

  const startingRef = useRef(false);

  const mountedRef = useRef(true);

  /* =====================================================
     LANGUAGE
     ===================================================== */

  const speechLocale =
    language === "Hindi"
      ? "hi-IN"
      : "en-IN";

  /* =====================================================
     CLEANUP
     ===================================================== */

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (mountedRef.current) {
      setCameraOn(false);
    }
  }, []);

  const stopSpeechRecognition =
    useCallback(() => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Recognition may already be stopped.
        }
      }

      recognitionRef.current = null;

      if (mountedRef.current) {
        setListening(false);
        setMicOn(false);
      }
    }, []);

  /* =====================================================
     COMPONENT CLEANUP
     ===================================================== */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup error.
        }
      }
    };
  }, []);

  /* =====================================================
     START INTERVIEW
     ===================================================== */

  useEffect(() => {
    if (startingRef.current) {
      return;
    }

    startingRef.current = true;

    const initializeInterview = async () => {
      try {
        setLoading(true);
        setError("");

        const result = await startInterview({
          candidate_id: candidateId,
          language,
        });

        if (!mountedRef.current) {
          return;
        }

        const newSessionId =
          result?.session_id ||
          result?.session?.session_id ||
          result?.id;

        if (!newSessionId) {
          throw new Error(
            "Backend did not return a session ID."
          );
        }

        setSessionId(newSessionId);

        const firstQuestion =
          result?.next_question ||
          result?.question ||
          result?.current_question ||
          result?.session?.current_question;

        if (!firstQuestion) {
          throw new Error(
            "Backend did not return the first interview question."
          );
        }

        setQuestion(firstQuestion);

        const number =
          Number(
            result?.question_number ||
            result?.current_question_number ||
            result?.session?.question_number ||
            1
          );

        setQuestionNumber(number);

        const total =
          Number(
            result?.total_questions ||
            result?.question_count ||
            result?.session?.total_questions ||
            10
          );

        setTotalQuestions(
          total > 0 ? total : 10
        );

      } catch (err) {
        console.error(
          "Failed to start interview:",
          err
        );

        if (mountedRef.current) {
          setError(
            err?.message ||
            "Unable to start interview."
          );
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeInterview();
  }, [candidateId, language]);

  /* =====================================================
     CAMERA
     ===================================================== */

  const enableCamera = async () => {
    try {
      setCameraError("");

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          "Camera access is not supported by this browser."
        );
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
        } catch {
          // Browser may start playback automatically.
        }
      }

      setCameraOn(true);

    } catch (err) {
      console.error(
        "Camera permission error:",
        err
      );

      setCameraOn(false);

      if (
        err?.name ===
        "NotAllowedError"
      ) {
        setCameraError(
          "Camera permission was denied. Please allow camera access in your browser."
        );
      } else if (
        err?.name ===
        "NotFoundError"
      ) {
        setCameraError(
          "No camera was found on this device."
        );
      } else if (
        err?.name ===
        "NotReadableError"
      ) {
        setCameraError(
          "Camera is being used by another application."
        );
      } else {
        setCameraError(
          "Unable to access the camera."
        );
      }
    }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      stopCamera();
    } else {
      await enableCamera();
    }
  };

  /* =====================================================
     MICROPHONE / SPEECH RECOGNITION
     ===================================================== */

  const toggleMicrophone = () => {
    if (listening) {
      stopSpeechRecognition();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Voice input is not supported in this browser. Please use Chrome or type your answer."
      );

      return;
    }

    setError("");

    const recognition =
      new SpeechRecognition();

    recognition.lang = speechLocale;

    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setMicOn(true);
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const transcript =
          event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += transcript + " ";
        } else {
          interimText += transcript;
        }
      }

      setAnswer((previous) => {
        const base =
          previous.trim();

        if (finalText.trim()) {
          return `${base}${
            base ? " " : ""
          }${finalText.trim()}`;
        }

        return (
          base +
          (interimText
            ? ` ${interimText}`
            : "")
        ).trim();
      });
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      setListening(false);
      setMicOn(false);

      if (
        event.error ===
        "not-allowed"
      ) {
        setError(
          "Microphone permission was denied."
        );
      }
    };

    recognition.onend = () => {
      setListening(false);
      setMicOn(false);
      recognitionRef.current = null;
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error(
        "Unable to start microphone:",
        err
      );

      setListening(false);
      setMicOn(false);
    }
  };

  /* =====================================================
     EXTRACT EVALUATION
     ===================================================== */

  const extractEvaluation = (
    response
  ) => {
    return (
      response?.evaluation ||
      response?.result ||
      response?.feedback ||
      null
    );
  };

  /* =====================================================
     COMPLETE INTERVIEW
     ===================================================== */

  const completeInterview = (
    response
  ) => {
    const result = {
      ...response,

      score:
        response?.score ??
        response?.overall_score ??
        response?.evaluation?.score ??
        0,

      feedback:
        response?.feedback ??
        response?.overall_feedback ??
        response?.evaluation?.feedback ??
        "",

      strengths:
        response?.strengths ??
        response?.strong_areas ??
        response?.evaluation?.strengths ??
        response?.evaluation?.strong_areas ??
        [],

      weak_areas:
        response?.weak_areas ??
        response?.evaluation?.weak_areas ??
        [],

      ideal_answer:
        response?.ideal_answer ??
        response?.evaluation?.ideal_answer ??
        "",
    };

    if (onComplete) {
      onComplete(result);
    }
  };

  /* =====================================================
     SUBMIT ANSWER
     ===================================================== */

  const handleSubmit = async () => {
    const cleanAnswer =
      answer.trim();

    if (!cleanAnswer) {
      setError(
        "Please enter an answer before submitting."
      );

      return;
    }

    if (!sessionId) {
      setError(
        "Interview session is not ready yet."
      );

      return;
    }

    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      stopSpeechRecognition();

      const response =
        await submitAnswer({
          session_id: sessionId,
          answer: cleanAnswer,
        });

      if (!mountedRef.current) {
        return;
      }

      /*
       * Different backend versions may use
       * different completion fields.
       */
      const completed =
        response?.completed === true ||
        response?.interview_completed === true ||
        response?.status === "completed" ||
        response?.is_complete === true;

      if (completed) {
        completeInterview(response);
        return;
      }

      /*
       * Save evaluation for the current answer
       * while waiting for the next question.
       */
      const currentEvaluation =
        extractEvaluation(response);

      if (currentEvaluation) {
        setEvaluation(
          currentEvaluation
        );
      }

      /*
       * Get the next question.
       */
      const nextQuestion =
        response?.next_question ||
        response?.question ||
        response?.current_question ||
        response?.next?.question;

      /*
       * Some backend implementations return
       * completed=true only after the last
       * answer, while others return no question.
       */
      if (!nextQuestion) {
        if (
          response?.score !== undefined ||
          response?.overall_score !== undefined ||
          response?.weak_areas ||
          response?.strong_areas
        ) {
          completeInterview(response);
          return;
        }

        throw new Error(
          "Backend did not return the next question."
        );
      }

      setQuestion(
        nextQuestion
      );

      const nextNumber =
        Number(
          response?.question_number ||
          response?.next_question_number ||
          response?.next?.question_number ||
          questionNumber + 1
        );

      setQuestionNumber(
        nextNumber
      );

      const backendTotal =
        Number(
          response?.total_questions ||
          response?.question_count ||
          totalQuestions
        );

      if (backendTotal > 0) {
        setTotalQuestions(
          backendTotal
        );
      }

      setAnswer("");
      setEvaluation(null);

    } catch (err) {
      console.error(
        "Failed to submit answer:",
        err
      );

      setError(
        err?.message ||
        "Failed to submit answer. Please try again."
      );
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  /* =====================================================
     KEYBOARD SUBMIT
     ===================================================== */

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSubmit();
    }
  };

  /* =====================================================
     EXIT
     ===================================================== */

  const handleExit = () => {
    stopCamera();
    stopSpeechRecognition();

    if (onExit) {
      onExit();
    }
  };

  /* =====================================================
     LOADING SCREEN
     ===================================================== */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#070b12",
          color: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: "420px",
            padding: "42px",
            border:
              "1px solid #1e293b",
            borderRadius: "20px",
            background:
              "linear-gradient(145deg,#0d1420,#090e17)",
            textAlign: "center",
            boxShadow:
              "0 24px 70px rgba(0,0,0,.35)",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              margin: "0 auto 22px",
              border:
                "3px solid #243149",
              borderTopColor:
                "#7c9cff",
              borderRadius: "50%",
              animation:
                "spin 1s linear infinite",
            }}
          />

          <h2
            style={{
              margin: "0 0 10px",
              fontSize: "22px",
            }}
          >
            Preparing your interview
          </h2>

          <p
            style={{
              margin: 0,
              color: "#94a3b8",
            }}
          >
            The AI interviewer is preparing
            your first question.
          </p>
        </div>

        <style>
          {`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    );
  }

  /* =====================================================
     MAIN UI
     ===================================================== */

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top,#111a2b 0,#070b12 42%,#05080d 100%)",
        color: "#f8fafc",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "24px 30px 30px",
        boxSizing: "border-box",
      }}
    >

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header
        style={{
          height: "64px",
          border:
            "1px solid #1c293d",
          borderRadius: "16px",
          background:
            "rgba(10,16,27,.92)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          marginBottom: "22px",
          boxShadow:
            "0 12px 35px rgba(0,0,0,.18)",
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >

          <span
            style={{
              width: "8px",
              height: "8px",
              background: "#4ade80",
              borderRadius: "50%",
              boxShadow:
                "0 0 12px rgba(74,222,128,.7)",
            }}
          />

          <div>
            <div
              style={{
                fontSize: "12px",
                letterSpacing: "1.5px",
                color: "#94a3b8",
                fontWeight: 700,
              }}
            >
              INTERVIEW IN PROGRESS
            </div>

            <div
              style={{
                fontSize: "14px",
                color: "#f8fafc",
                marginTop: "3px",
              }}
            >
              Question {questionNumber} /{" "}
              {totalQuestions}
            </div>
          </div>

        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >

          <div
            style={{
              padding: "8px 13px",
              border:
                "1px solid #263653",
              borderRadius: "9px",
              color: "#a9c2ff",
              fontSize: "13px",
            }}
          >
            {language}
          </div>

          <button
            type="button"
            onClick={handleExit}
            style={{
              background:
                "transparent",
              border:
                "1px solid #263653",
              color: "#cbd5e1",
              borderRadius: "9px",
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            ← Exit Interview
          </button>

        </div>

      </header>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          style={{
            marginBottom: "18px",
            padding: "13px 16px",
            background:
              "rgba(127,29,29,.18)",
            border:
              "1px solid rgba(248,113,113,.3)",
            color: "#fca5a5",
            borderRadius: "12px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {/* =================================================
          WORKSPACE
      ================================================= */}

      <main
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0,1.05fr) minmax(0,.95fr)",
          gap: "22px",
          maxWidth: "1700px",
          margin: "0 auto",
        }}
      >

        {/* =================================================
            CAMERA PANEL
        ================================================= */}

        <section
          style={{
            minHeight: "680px",
            border:
              "1px solid #1d293a",
            borderRadius: "20px",
            background:
              "linear-gradient(145deg,#0c131e,#080d15)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow:
              "0 20px 60px rgba(0,0,0,.22)",
          }}
        >

          <div
            style={{
              padding: "22px 24px",
              borderBottom:
                "1px solid #182333",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >

            <div>
              <div
                style={{
                  color: "#83a7ff",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "2px",
                  marginBottom: "7px",
                }}
              >
                CANDIDATE CAMERA
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: 650,
                }}
              >
                Interview Workspace
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "7px 11px",
                borderRadius: "9px",
                background: cameraOn
                  ? "rgba(34,197,94,.1)"
                  : "rgba(148,163,184,.08)",
                color: cameraOn
                  ? "#86efac"
                  : "#94a3b8",
                fontSize: "12px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: cameraOn
                    ? "#4ade80"
                    : "#64748b",
                }}
              />

              {cameraOn
                ? "Camera On"
                : "Camera Off"}
            </div>

          </div>

          {/* VIDEO */}

          <div
            style={{
              flex: 1,
              minHeight: "450px",
              position: "relative",
              background:
                "#050a11",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >

            {cameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "450px",
                  objectFit: "cover",
                  transform:
                    "scaleX(-1)",
                }}
              />
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "#64748b",
                }}
              >

                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    margin:
                      "0 auto 18px",
                    border:
                      "1px solid #263653",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "#0d1522",
                    color: "#64748b",
                    fontSize: "28px",
                  }}
                >
                  ◉
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    marginBottom: "14px",
                  }}
                >
                  Camera is turned off
                </div>

                <button
                  type="button"
                  onClick={enableCamera}
                  style={{
                    border:
                      "1px solid #4566a5",
                    background:
                      "rgba(65,96,160,.14)",
                    color: "#a9c2ff",
                    padding:
                      "10px 16px",
                    borderRadius: "9px",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Enable Camera
                </button>

                {cameraError && (
                  <div
                    style={{
                      maxWidth:
                        "350px",
                      margin:
                        "15px auto 0",
                      color:
                        "#fca5a5",
                      fontSize:
                        "12px",
                      lineHeight: 1.5,
                    }}
                  >
                    {cameraError}
                  </div>
                )}

              </div>
            )}

          </div>

          {/* CONTROLS */}

          <div
            style={{
              borderTop:
                "1px solid #182333",
              padding:
                "16px 20px",
              display: "flex",
              justifyContent:
                "center",
              gap: "10px",
            }}
          >

            <button
              type="button"
              onClick={toggleMicrophone}
              style={{
                minWidth: "115px",
                border:
                  listening
                    ? "1px solid #5d7ed1"
                    : "1px solid #263653",
                background:
                  listening
                    ? "rgba(75,111,191,.18)"
                    : "#0d1522",
                color:
                  listening
                    ? "#b8cbff"
                    : "#cbd5e1",
                padding:
                  "11px 15px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {listening
                ? "● Listening"
                : "Microphone"}
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              style={{
                minWidth: "115px",
                border:
                  cameraOn
                    ? "1px solid #5d7ed1"
                    : "1px solid #263653",
                background:
                  cameraOn
                    ? "rgba(75,111,191,.18)"
                    : "#0d1522",
                color:
                  cameraOn
                    ? "#b8cbff"
                    : "#cbd5e1",
                padding:
                  "11px 15px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {cameraOn
                ? "Camera"
                : "Camera Off"}
            </button>

          </div>

        </section>

        {/* =================================================
            AI INTERVIEWER
        ================================================= */}

        <section
          style={{
            minHeight: "680px",
            border:
              "1px solid #1d293a",
            borderRadius: "20px",
            background:
              "linear-gradient(145deg,#0c131e,#080d15)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow:
              "0 20px 60px rgba(0,0,0,.22)",
          }}
        >

          <div
            style={{
              padding: "22px 24px",
              borderBottom:
                "1px solid #182333",
            }}
          >

            <div
              style={{
                color: "#83a7ff",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "2px",
                marginBottom: "7px",
              }}
            >
              AI INTERVIEWER
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
              }}
            >

              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: 650,
                }}
              >
                Technical Interview
              </h2>

              <div
                style={{
                  color: "#86efac",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background:
                      "#4ade80",
                  }}
                />
                Online
              </div>

            </div>

          </div>

          {/* QUESTION */}

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "26px",
            }}
          >

            <div
              style={{
                border:
                  "1px solid #263653",
                background:
                  "#121b2a",
                borderRadius: "15px",
                padding: "22px",
                lineHeight: 1.7,
              }}
            >

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >

                <span
                  style={{
                    width: "30px",
                    height: "30px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    background:
                      "#1c2b4c",
                    color: "#91adff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  AI
                </span>

                <span
                  style={{
                    color: "#9db9ff",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing:
                      "1.5px",
                  }}
                >
                  AI AGENT
                </span>

              </div>

              <div
                style={{
                  fontSize: "16px",
                  color: "#e2e8f0",
                  whiteSpace:
                    "pre-wrap",
                }}
              >
                {question}
              </div>

            </div>

            {/* CURRENT EVALUATION */}

            {evaluation && (
              <div
                style={{
                  marginTop: "18px",
                  border:
                    "1px solid #263653",
                  background:
                    "rgba(18,27,42,.7)",
                  borderRadius: "14px",
                  padding: "18px",
                }}
              >

                <div
                  style={{
                    color:
                      "#91adff",
                    fontSize:
                      "11px",
                    fontWeight:
                      800,
                    letterSpacing:
                      "1.5px",
                    marginBottom:
                      "10px",
                  }}
                >
                  EVALUATION
                </div>

                <div
                  style={{
                    color:
                      "#cbd5e1",
                    fontSize:
                      "14px",
                    lineHeight:
                      1.6,
                  }}
                >
                  {typeof evaluation ===
                  "string"
                    ? evaluation
                    : evaluation?.feedback ||
                      evaluation?.comments ||
                      "Answer evaluated successfully."}
                </div>

              </div>
            )}

          </div>

          {/* ANSWER AREA */}

          <div
            style={{
              borderTop:
                "1px solid #182333",
              padding:
                "18px 20px",
            }}
          >

            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems:
                  "flex-end",
              }}
            >

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
                disabled={submitting}
                rows={3}
                placeholder={
                  language === "Hindi"
                    ? "अपना उत्तर यहाँ लिखें..."
                    : language === "Hinglish"
                    ? "Apna answer yahan type karein..."
                    : "Type your answer..."
                }
                style={{
                  flex: 1,
                  resize: "none",
                  border:
                    "1px solid #263653",
                  background:
                    "#0a111d",
                  color:
                    "#f8fafc",
                  borderRadius:
                    "12px",
                  padding:
                    "14px 15px",
                  outline: "none",
                  fontSize: "14px",
                  lineHeight: 1.5,
                  boxSizing:
                    "border-box",
                }}
              />

              <button
                type="button"
                onClick={
                  handleSubmit
                }
                disabled={
                  submitting ||
                  !answer.trim()
                }
                style={{
                  width: "58px",
                  height: "58px",
                  border: "none",
                  borderRadius:
                    "12px",
                  background:
                    submitting ||
                    !answer.trim()
                      ? "#263653"
                      : "#607ed5",
                  color: "#fff",
                  cursor:
                    submitting ||
                    !answer.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "24px",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                {submitting
                  ? "..."
                  : "→"}
              </button>

            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginTop: "9px",
                color: "#64748b",
                fontSize: "11px",
              }}
            >

              <span>
                {listening
                  ? `Listening in ${speechLocale}`
                  : "Enter to submit • Shift + Enter for new line"}
              </span>

              <span>
                Voice: {language}
              </span>

            </div>

          </div>

        </section>

      </main>

      {/* =================================================
          RESPONSIVE
      ================================================= */}

      <style>
        {`
          @media (max-width: 900px) {
            main {
              grid-template-columns: 1fr !important;
            }

            section {
              min-height: 520px !important;
            }

            header {
              height: auto !important;
              min-height: 64px !important;
              gap: 12px !important;
            }
          }

          textarea:focus {
            border-color: #5273c4 !important;
            box-shadow: 0 0 0 3px rgba(82,115,196,.12);
          }

          button {
            transition:
              background .15s ease,
              border-color .15s ease,
              transform .15s ease;
          }

          button:not(:disabled):hover {
            transform: translateY(-1px);
          }
        `}
      </style>

    </div>
  );
}

export default InterviewUI;