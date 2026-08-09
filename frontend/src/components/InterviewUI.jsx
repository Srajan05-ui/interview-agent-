import { useState, useEffect, useRef } from "react";

const INTERVIEW_QUESTIONS = [
  "Welcome to your AI Cohort technical interview. To start, could you explain how you implemented the Vector Database in your recent RAG project?",
  "That makes sense. What embedding model did you choose for that database, and why?",
  "Interesting. How did you handle chunking the documents to ensure context wasn't lost?",
  "Let's shift to Agentic AI. Describe a time you built an agent that needed to use external tools.",
  "How did you manage the prompt structure to ensure the agent didn't hallucinate tool inputs?",
  "Regarding MCP (Model Context Protocol), how do you see it changing the way we integrate LLMs with local data?",
  "What were the biggest challenges you faced when deploying your AI applications?",
  "Finally, how do you handle monitoring and evaluating the performance of your LLM application post-deployment?"
];

function InterviewUI({ onComplete }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState([
    { role: "ai", text: INTERVIEW_QUESTIONS[0] }
  ]);
  const [inputText, setInputText] = useState("");
  
  // Hardware States
  const [isRecording, setIsRecording] = useState(false); // Mic
  const [isCameraOn, setIsCameraOn] = useState(true);    // Camera
  const [isScreenSharing, setIsScreenSharing] = useState(false); // Screen Share
  const [isAiTyping, setIsAiTyping] = useState(false);

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const prevTextRef = useRef(""); 
  
  // Stream Refs for toggling tracks without re-requesting permissions
  const webcamStreamRef = useRef(null);
  const displayStreamRef = useRef(null);

  // 1. HARDWARE: Webcam Setup
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied or unavailable:", err);
        setIsCameraOn(false);
      }
    };
    startWebcam();

    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 2. HARDWARE: Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true; 

      recognition.onresult = (event) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInputText(prevTextRef.current + currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

  // --- HARDWARE CONTROLS ---

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      prevTextRef.current = inputText.trim() ? inputText.trim() + " " : "";
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const toggleCamera = () => {
    if (webcamStreamRef.current) {
      const videoTrack = webcamStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn;
        setIsCameraOn(!isCameraOn);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop sharing screen
        if (displayStreamRef.current) {
          displayStreamRef.current.getTracks().forEach(track => track.stop());
        }
        // Revert back to webcam
        if (videoRef.current) {
          videoRef.current.srcObject = webcamStreamRef.current;
        }
        setIsScreenSharing(false);
      } else {
        // Request screen share
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        displayStreamRef.current = displayStream;
        
        // Show screen share in the video placeholder
        if (videoRef.current) {
          videoRef.current.srcObject = displayStream;
        }
        setIsScreenSharing(true);

        // Handle if user clicks "Stop sharing" from the browser's native floating bar
        displayStream.getVideoTracks()[0].onended = () => {
          if (videoRef.current) {
            videoRef.current.srcObject = webcamStreamRef.current;
          }
          setIsScreenSharing(false);
        };
      }
    } catch (err) {
      console.error("Error sharing screen", err);
    }
  };

  // --- CHAT LOGIC ---

  const handleSend = () => {
    if (!inputText.trim()) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    const newMessages = [...messages, { role: "candidate", text: inputText.trim() }];
    setMessages(newMessages);
    setInputText("");
    setIsAiTyping(true);

    setTimeout(() => {
      if (currentQuestionIndex < INTERVIEW_QUESTIONS.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        setMessages([...newMessages, { role: "ai", text: INTERVIEW_QUESTIONS[nextIndex] }]);
        setCurrentQuestionIndex(nextIndex);
        setIsAiTyping(false);
      } else {
        setMessages([...newMessages, { role: "ai", text: "Interview complete! Redirecting to your technical scorecard..." }]);
        setIsAiTyping(false);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 2000);
      }
    }, 1500);
  };

  return (
    <div className="interview-page">
      <main className="interview-container">
        
        <div className="interview-top-bar">
          <div className="interview-live-badge">
            <span className="recording-dot"></span>
            INTERVIEW IN PROGRESS ({currentQuestionIndex + 1}/8)
          </div>
        </div>

        {/* 1. Video Section */}
        <section className="video-area">
          <div className="video-feed-placeholder">
            {/* If camera is off and not sharing screen, show placeholder text */}
            {!isCameraOn && !isScreenSharing && (
              <div className="camera-off-state">
                <span className="camera-icon">🚫</span>
                <p>Camera is turned off</p>
              </div>
            )}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="webcam-video"
              style={{ display: (!isCameraOn && !isScreenSharing) ? "none" : "block" }}
            />
          </div>
        </section>

        {/* 2. Meet-Style Hardware Controls */}
        <section className="hardware-control-bar">
          <button 
            className={`control-btn ${!isRecording ? "off" : ""}`}
            onClick={toggleRecording}
            title={isRecording ? "Turn off microphone" : "Turn on microphone"}
          >
            {isRecording ? "🎙️" : "🔇"}
          </button>
          
          <button 
            className={`control-btn ${!isCameraOn ? "off" : ""}`}
            onClick={toggleCamera}
            title={isCameraOn ? "Turn off camera" : "Turn on camera"}
          >
            {isCameraOn ? "📹" : "🚫"}
          </button>

          <button 
            className={`control-btn ${isScreenSharing ? "active" : ""}`}
            onClick={toggleScreenShare}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
          >
            💻
          </button>
        </section>

        {/* 3. Chat / Transcript Section */}
        <section className="chat-area">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-bubble ${msg.role}`}>
              <span className="chat-role">
                {msg.role === "ai" ? "AI Agent" : "You"}
              </span>
              <p>{msg.text}</p>
            </div>
          ))}
          {isAiTyping && (
            <div className="chat-bubble ai">
              <span className="chat-role">AI Agent</span>
              <p className="typing-indicator">Thinking...</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </section>

        {/* 4. Text Input Controls */}
        <section className="input-area">
          <input 
            type="text" 
            className="text-input"
            placeholder={isRecording ? "Listening to your microphone..." : "Type your answer..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          
          <button className="send-button" onClick={handleSend}>
            ➤
          </button>
        </section>

      </main>
    </div>
  );
}

export default InterviewUI;