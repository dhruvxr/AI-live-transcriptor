import { useState } from "react";
import { Dashboard } from "../components/Dashboard";
import { Settings } from "../components/Settings";
import { PastSessions } from "../components/PastSessions";
import { azureSpeechService } from "./services/realAzureSpeechService";
import { questionDetectionService } from "./services/realQuestionDetectionService";
import { exportService } from "./services/realExportService";
import {
  config,
  isAzureSpeechConfigured,
  isAzureOpenAIConfigured,
} from "./config/environment";

// Simple test component for Sessions Page
function SimpleSessionsPage({ onNavigate }: { onNavigate: any }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0F172A",
        color: "white",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem",
          }}
        >
          <button
            onClick={() => onNavigate("dashboard")}
            style={{
              backgroundColor: "#4B5563",
              color: "white",
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
            Session History
          </h1>
        </div>

        <div
          style={{
            backgroundColor: "#1E293B",
            padding: "2rem",
            borderRadius: "12px",
            marginBottom: "2rem",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            Recent Sessions
          </h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {[1, 2, 3].map((session) => (
              <div
                key={session}
                style={{
                  backgroundColor: "#334155",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Session {session}
                    </h3>
                    <p style={{ color: "#94A3B8", fontSize: "0.875rem" }}>
                      Duration: {10 + session} minutes • Created: Jan{" "}
                      {session + 10}, 2024
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      style={{
                        backgroundColor: "#3B82F6",
                        color: "white",
                        padding: "0.5rem 1rem",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      View
                    </button>
                    <button
                      style={{
                        backgroundColor: "#10B981",
                        color: "white",
                        padding: "0.5rem 1rem",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      Export
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#1E293B",
            padding: "2rem",
            borderRadius: "12px",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            Session Statistics
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <div
              style={{
                backgroundColor: "#334155",
                padding: "1rem",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "#3B82F6",
                }}
              >
                12
              </div>
              <div style={{ color: "#94A3B8", fontSize: "0.875rem" }}>
                Total Sessions
              </div>
            </div>
            <div
              style={{
                backgroundColor: "#334155",
                padding: "1rem",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "#10B981",
                }}
              >
                4.2h
              </div>
              <div style={{ color: "#94A3B8", fontSize: "0.875rem" }}>
                Total Time
              </div>
            </div>
            <div
              style={{
                backgroundColor: "#334155",
                padding: "1rem",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "#F59E0B",
                }}
              >
                247
              </div>
              <div style={{ color: "#94A3B8", fontSize: "0.875rem" }}>
                Questions Asked
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Live Transcription Component
function EnhancedLiveTranscription({ onNavigate }: { onNavigate: any }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [currentSession, setCurrentSession] = useState({
    id: Date.now().toString(),
    startTime: new Date(),
    duration: 0,
    wordCount: 0,
  });
  const [questions, setQuestions] = useState<
    Array<{
      text: string;
      timestamp: string;
      confidence?: number;
      answer?: string;
    }>
  >([]);

  // Check browser compatibility
  const getBrowserCompatibility = () => {
    const hasWebSpeech =
      "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
    const hasAzureSDK = true; // SDK is now imported directly, always available
    const hasMediaDevices =
      "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices;
    const userAgent = navigator.userAgent.toLowerCase();

    const browser = {
      isFirefox: userAgent.includes("firefox"),
      isChrome: userAgent.includes("chrome"),
      isSafari: userAgent.includes("safari") && !userAgent.includes("chrome"),
      isEdge: userAgent.includes("edge"),
    };

    return {
      azureSDK: hasAzureSDK,
      webSpeech: hasWebSpeech,
      microphone: hasMediaDevices,
      overall: hasAzureSDK || hasWebSpeech,
      browser,
      canRequestMicrophone: hasMediaDevices,
    };
  };

  const compatibility = getBrowserCompatibility();
  const [settings, setSettings] = useState({
    language: "en-US",
    autoSave: true,
    questionDetection: true,
  });

  // Real recording functionality using Azure Speech Service
  const startRecording = async () => {
    setIsRecording(true);
    setCurrentSession({
      ...currentSession,
      startTime: new Date(),
    });

    try {
      await azureSpeechService.startRecording(
        (result) => {
          // Handle real-time transcription results
          const newText = result.text;
          setTranscript((prev) => {
            const updated = prev + (prev ? " " : "") + newText;

            // Process for questions using AI service
            questionDetectionService.processTranscript(
              newText,
              updated,
              (question) => {
                setQuestions((prev) => [...prev, question]);
              },
              (question, answer) => {
                setQuestions((prev) =>
                  prev.map((q) =>
                    q.text === question.text
                      ? { ...q, answer: answer.answer }
                      : q
                  )
                );
              }
            );

            return updated;
          });

          setCurrentSession((prev) => ({
            ...prev,
            duration: prev.duration + 1,
            wordCount: prev.wordCount + newText.split(" ").length,
          }));
        },
        (error) => {
          console.error("Speech recognition error:", error);
          setIsRecording(false);

          // If all else fails, offer demo mode
          if (
            confirm(
              `Recording error: ${error}\n\nWould you like to try Demo Mode instead?`
            )
          ) {
            startDemoMode();
          }
        }
      );
    } catch (error) {
      console.error("Failed to start recording:", error);
      setIsRecording(false);
      alert(
        "Failed to start recording. Please check your settings and microphone permissions."
      );
    }
  };

  const startDemoMode = () => {
    setIsRecording(true);
    setCurrentSession({
      ...currentSession,
      startTime: new Date(),
    });

    // Demo transcription with realistic delays
    const demoText = [
      "Welcome to the AI Live Transcriptor demonstration.",
      "This system provides real-time speech-to-text conversion using Azure Speech Services.",
      "Can you explain how machine learning algorithms work?",
      "Machine learning algorithms learn patterns from data to make predictions about new, unseen data.",
      "What are the main types of machine learning?",
      "The main types include supervised learning, unsupervised learning, and reinforcement learning.",
      "How does natural language processing relate to this project?",
      "NLP helps the system understand and process human language effectively, enabling features like question detection.",
      "What are some practical applications of this technology?",
      "This technology can be used for meeting transcription, lecture notes, accessibility support, and real-time translation.",
    ];

    let wordIndex = 0;
    const interval = setInterval(() => {
      if (wordIndex < demoText.length && isRecording) {
        const newText = demoText[wordIndex];
        setTranscript((prev) => prev + (prev ? " " : "") + newText);

        // Process questions in demo mode too
        questionDetectionService.processTranscript(
          newText,
          transcript + " " + newText,
          (question) => {
            setQuestions((prev) => [...prev, question]);
          },
          (question, answer) => {
            setQuestions((prev) =>
              prev.map((q) =>
                q.text === question.text ? { ...q, answer: answer.answer } : q
              )
            );
          }
        );

        setCurrentSession((prev) => ({
          ...prev,
          duration: prev.duration + 2,
          wordCount: prev.wordCount + newText.split(" ").length,
        }));

        wordIndex++;
      } else {
        clearInterval(interval);
        setIsRecording(false);
      }
    }, 3000); // Slower pace for demo
  };

  const stopRecording = () => {
    azureSpeechService.stopRecording();
    setIsRecording(false);
  };

  const exportSession = async () => {
    const sessionData = {
      id: currentSession.id,
      title: `Session ${new Date().toLocaleDateString()}`,
      startTime: currentSession.startTime,
      endTime: new Date(),
      duration: currentSession.duration,
      transcript,
      questions: questions.map((q) => ({
        text: q.text,
        timestamp: q.timestamp,
        confidence: q.confidence || 0.8,
        answer: q.answer,
      })),
      wordCount: currentSession.wordCount,
      language: "en-US",
    };

    try {
      await exportService.exportSession(sessionData, {
        format: "json",
        includeTimestamps: true,
        includeQuestions: true,
        includeMetadata: true,
      });
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0F172A",
        color: "white",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem",
          }}
        >
          <button
            onClick={() => onNavigate("dashboard")}
            style={{
              backgroundColor: "#4B5563",
              color: "white",
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
            Live Transcription
          </h1>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={exportSession}
              style={{
                backgroundColor: "#10B981",
                color: "white",
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              📥 Export Session
            </button>
            <button
              onClick={async () => {
                const sessionData = {
                  id: currentSession.id,
                  title: `Session ${new Date().toLocaleDateString()}`,
                  startTime: currentSession.startTime,
                  endTime: new Date(),
                  duration: currentSession.duration,
                  transcript,
                  questions: questions.map((q) => ({
                    text: q.text,
                    timestamp: q.timestamp,
                    confidence: q.confidence || 0.8,
                    answer: q.answer,
                  })),
                  wordCount: currentSession.wordCount,
                  language: "en-US",
                };
                await exportService.shareSession(sessionData);
              }}
              style={{
                backgroundColor: "#3B82F6",
                color: "white",
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              📤 Share
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "2rem",
          }}
        >
          {/* Main Transcription Area */}
          <div>
            {/* Recording Controls */}
            <div
              style={{
                backgroundColor: "#1E293B",
                padding: "2rem",
                borderRadius: "12px",
                marginBottom: "2rem",
                textAlign: "center",
              }}
            >
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: "4rem",
                    marginBottom: "1rem",
                    color: isRecording ? "#EF4444" : "#6B7280",
                  }}
                >
                  🎤
                </div>
                <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
                  {isRecording ? "Recording in Progress..." : "Ready to Record"}
                </h3>

                {/* Compatibility Status */}
                <div style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
                  <div
                    style={{
                      color: isAzureSpeechConfigured() ? "#10B981" : "#94A3B8",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {isAzureSpeechConfigured() ? "✅" : "⚠️"} Azure Speech
                    Service:{" "}
                    {isAzureSpeechConfigured()
                      ? "Configured"
                      : "Not configured"}
                  </div>
                  <div
                    style={{
                      color: compatibility.azureSDK ? "#10B981" : "#94A3B8",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {compatibility.azureSDK ? "✅" : "⚠️"} Azure Speech SDK:{" "}
                    {compatibility.azureSDK ? "Loaded" : "Loading..."}
                  </div>
                  <div
                    style={{
                      color: compatibility.webSpeech ? "#10B981" : "#94A3B8",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {compatibility.webSpeech ? "✅" : "❌"} Web Speech API:{" "}
                    {compatibility.webSpeech ? "Supported" : "Not supported"}
                  </div>
                  <div
                    style={{
                      color: compatibility.canRequestMicrophone
                        ? "#10B981"
                        : "#F59E0B",
                      marginBottom: "1rem",
                    }}
                  >
                    {compatibility.canRequestMicrophone ? "✅" : "⚠️"}{" "}
                    Microphone Access:{" "}
                    {compatibility.canRequestMicrophone
                      ? "Available"
                      : "Check permissions"}
                  </div>

                  {/* Firefox-specific guidance */}
                  {compatibility.browser.isFirefox &&
                    !compatibility.azureSDK && (
                      <div
                        style={{
                          backgroundColor: "#E0E7FF",
                          color: "#3730A3",
                          padding: "0.75rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          marginBottom: "1rem",
                          border: "1px solid #C7D2FE",
                        }}
                      >
                        🦊 <strong>Firefox User:</strong> Loading Azure Speech
                        SDK for full compatibility... If recording fails, try
                        refreshing the page or use Demo Mode to see all
                        features!
                      </div>
                    )}

                  {compatibility.browser.isFirefox &&
                    compatibility.azureSDK && (
                      <div
                        style={{
                          backgroundColor: "#D1FAE5",
                          color: "#065F46",
                          padding: "0.75rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          marginBottom: "1rem",
                          border: "1px solid #A7F3D0",
                        }}
                      >
                        🦊✅ <strong>Firefox + Azure SDK:</strong> Speech
                        recognition ready! Click "🎤 Start Recording" to begin
                        live transcription.
                      </div>
                    )}

                  {!compatibility.overall &&
                    !compatibility.browser.isFirefox && (
                      <div
                        style={{
                          backgroundColor: "#FEF3C7",
                          color: "#92400E",
                          padding: "0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          marginBottom: "1rem",
                        }}
                      >
                        ⚠️ Speech recognition not available. Please use Chrome,
                        Edge, or Safari, or try Demo Mode.
                      </div>
                    )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "1rem",
                  }}
                >
                  {!isRecording ? (
                    <>
                      <button
                        onClick={startRecording}
                        disabled={!compatibility.canRequestMicrophone}
                        style={{
                          backgroundColor: compatibility.canRequestMicrophone
                            ? "#EF4444"
                            : "#6B7280",
                          color: "white",
                          padding: "1rem 2rem",
                          border: "none",
                          borderRadius: "8px",
                          cursor: compatibility.canRequestMicrophone
                            ? "pointer"
                            : "not-allowed",
                          fontSize: "1rem",
                          fontWeight: "bold",
                          opacity: compatibility.canRequestMicrophone ? 1 : 0.6,
                        }}
                        title={
                          compatibility.browser.isFirefox &&
                          !compatibility.azureSDK
                            ? "Request microphone permissions (Azure SDK loading...)"
                            : compatibility.browser.isFirefox &&
                              compatibility.azureSDK
                            ? "Start live recording with Azure Speech SDK"
                            : !compatibility.canRequestMicrophone
                            ? "Microphone access not available"
                            : "Start live recording"
                        }
                      >
                        🎤{" "}
                        {compatibility.browser.isFirefox &&
                        !compatibility.azureSDK
                          ? "Request Microphone"
                          : "Start Recording"}
                      </button>
                      <button
                        onClick={startDemoMode}
                        style={{
                          backgroundColor: "#3B82F6",
                          color: "white",
                          padding: "1rem 2rem",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "1rem",
                          fontWeight: "bold",
                        }}
                        title="Try demo mode to see all features working"
                      >
                        🎭 Demo Mode
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={stopRecording}
                      style={{
                        backgroundColor: "#6B7280",
                        color: "white",
                        padding: "1rem 2rem",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "1rem",
                        fontWeight: "bold",
                      }}
                    >
                      Stop Recording
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live Transcript */}
            <div
              style={{
                backgroundColor: "#1E293B",
                padding: "2rem",
                borderRadius: "12px",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
                Live Transcript
              </h2>
              <div
                style={{
                  backgroundColor: "#0F172A",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  minHeight: "300px",
                  maxHeight: "400px",
                  overflowY: "auto",
                  fontFamily: "monospace",
                  lineHeight: "1.6",
                }}
              >
                {transcript || (
                  <span style={{ color: "#6B7280", fontStyle: "italic" }}>
                    Transcript will appear here when recording starts...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Session Stats */}
            <div
              style={{
                backgroundColor: "#1E293B",
                padding: "1.5rem",
                borderRadius: "12px",
                marginBottom: "2rem",
              }}
            >
              <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
                Session Stats
              </h3>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#3B82F6",
                    }}
                  >
                    {Math.floor(currentSession.duration / 60)}:
                    {(currentSession.duration % 60).toString().padStart(2, "0")}
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: "0.875rem" }}>
                    Duration
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#10B981",
                    }}
                  >
                    {currentSession.wordCount}
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: "0.875rem" }}>
                    Words
                  </div>
                </div>
              </div>
            </div>

            {/* Detected Questions */}
            <div
              style={{
                backgroundColor: "#1E293B",
                padding: "1.5rem",
                borderRadius: "12px",
              }}
            >
              <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
                🤖 AI Question Detection & Answers
              </h3>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#94A3B8",
                  marginBottom: "1rem",
                }}
              >
                {isAzureOpenAIConfigured()
                  ? "✅ Azure OpenAI configured from environment"
                  : "❌ Configure Azure OpenAI API key in .env file"}
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {questions.length > 0 ? (
                  questions.map((q, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: "#334155",
                        padding: "1rem",
                        borderRadius: "6px",
                        marginBottom: "0.5rem",
                        border: "1px solid #475569",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "#F59E0B",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Question {index + 1} at {q.timestamp}
                      </div>
                      <div
                        style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
                      >
                        {q.text}
                      </div>
                      {q.confidence && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#94A3B8",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Confidence: {Math.round(q.confidence * 100)}%
                        </div>
                      )}
                      {q.answer ? (
                        <div
                          style={{
                            backgroundColor: "#1E293B",
                            padding: "0.75rem",
                            borderRadius: "4px",
                            border: "1px solid #10B981",
                            marginTop: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#10B981",
                              marginBottom: "0.25rem",
                            }}
                          >
                            🤖 AI Answer:
                          </div>
                          <div style={{ fontSize: "0.875rem" }}>{q.answer}</div>
                        </div>
                      ) : (
                        questionDetectionService.isConfigured() && (
                          <div
                            style={{
                              backgroundColor: "#1E293B",
                              padding: "0.75rem",
                              borderRadius: "4px",
                              border: "1px solid #6B7280",
                              marginTop: "0.5rem",
                              fontStyle: "italic",
                              color: "#6B7280",
                            }}
                          >
                            Generating answer...
                          </div>
                        )
                      )}
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      color: "#6B7280",
                      fontStyle: "italic",
                      fontSize: "0.875rem",
                    }}
                  >
                    No questions detected yet...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const navigate = (page: string) => {
    setCurrentPage(page);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={navigate} />;
      case "live":
        return <EnhancedLiveTranscription onNavigate={navigate} />;
      case "transcription":
        return <EnhancedLiveTranscription onNavigate={navigate} />;
      case "settings":
        return <Settings onNavigate={navigate} />;
      case "sessions":
        return <SimpleSessionsPage onNavigate={navigate} />;
      case "past-sessions":
        return <PastSessions onNavigate={navigate} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return renderCurrentPage();
}

export default App;
