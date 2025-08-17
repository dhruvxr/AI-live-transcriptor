import { useState, useRef, useEffect } from "react";

type NavigateFunction = (
  page: "dashboard" | "live" | "settings" | "sessions" | "session-detail",
  sessionId?: string
) => void;

interface LiveTranscriptionProps {
  onNavigate: NavigateFunction;
}

interface TranscriptItem {
  id: string;
  content: string;
  timestamp: Date;
  speaker: string;
}

export function SimpleLiveTranscription({
  onNavigate,
}: LiveTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [currentSpeech, setCurrentSpeech] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, currentSpeech]);

  const handleStartSession = () => {
    setTranscript([]);
    setIsRecording(true);
    setIsPaused(false);

    // Add some demo transcript items to show functionality
    setTimeout(() => {
      setTranscript([
        {
          id: "1",
          content: "Welcome to the AI Live Transcriptor demo!",
          timestamp: new Date(),
          speaker: "Demo",
        },
      ]);
    }, 1000);

    setTimeout(() => {
      setTranscript((prev) => [
        ...prev,
        {
          id: "2",
          content:
            "This is a simplified version of the live transcription component.",
          timestamp: new Date(),
          speaker: "Demo",
        },
      ]);
    }, 3000);

    setTimeout(() => {
      setTranscript((prev) => [
        ...prev,
        {
          id: "3",
          content:
            "To enable full functionality, configure your Azure Speech Services in Settings.",
          timestamp: new Date(),
          speaker: "Demo",
        },
      ]);
    }, 5000);
  };

  const handleStopSession = () => {
    setIsRecording(false);
    onNavigate("dashboard");
  };

  const togglePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isRecording) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#0F172A",
          color: "white",
        }}
      >
        <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "2rem" }}>🎙️</div>
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Ready to Transcribe
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#94A3B8",
                marginBottom: "3rem",
              }}
            >
              Press the button to start your live transcription session.
            </p>
            <button
              onClick={handleStartSession}
              style={{
                backgroundColor: "#10B981",
                color: "white",
                padding: "1rem 2rem",
                border: "none",
                borderRadius: "8px",
                fontSize: "1.1rem",
                fontWeight: "bold",
                cursor: "pointer",
                marginRight: "1rem",
              }}
            >
              🎙️ Start Session
            </button>
            <button
              onClick={() => onNavigate("dashboard")}
              style={{
                backgroundColor: "#4B5563",
                color: "white",
                padding: "1rem 2rem",
                border: "none",
                borderRadius: "8px",
                fontSize: "1.1rem",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0F172A",
        color: "white",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          borderBottom: "1px solid #1E293B",
          backgroundColor: "#0F172A",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={() => onNavigate("dashboard")}
            style={{
              backgroundColor: "transparent",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
              🎙️ AI Transcriptor
            </span>
            <span
              style={{
                backgroundColor: "#10B981",
                color: "white",
                padding: "0.25rem 0.75rem",
                borderRadius: "1rem",
                fontSize: "0.875rem",
                fontWeight: "bold",
              }}
            >
              ● Live
            </span>
          </div>
        </div>

        <button
          onClick={handleStopSession}
          style={{
            backgroundColor: "#EF4444",
            color: "white",
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ⏹ Stop Session
        </button>
      </header>

      {/* Status Bar */}
      <div
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#1E293B",
          borderBottom: "1px solid #334155",
          fontSize: "0.875rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {isPaused ? (
              <span
                style={{
                  color: "#F59E0B",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                🎤⏸ Paused
              </span>
            ) : (
              <span
                style={{
                  color: "#10B981",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                🎤 Recording
              </span>
            )}
          </div>
          <div style={{ color: "#94A3B8" }}>
            Demo Mode - Configure Azure Speech Services for full functionality
          </div>
        </div>
      </div>

      {/* Main Transcript Area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div
          ref={scrollRef}
          style={{ height: "100%", overflowY: "auto", padding: "1rem" }}
        >
          {transcript.length === 0 && !isPaused && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                textAlign: "center",
                color: "#94A3B8",
              }}
            >
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎤</div>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: "0.5rem",
                }}
              >
                Listening...
              </h2>
              <p>Demo transcript will appear here.</p>
            </div>
          )}

          {transcript.map((item) => (
            <div key={item.id} style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  padding: "0.5rem",
                  borderRadius: "8px",
                  backgroundColor: "#1E293B",
                }}
              >
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    backgroundColor: "#3B82F6",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "0.875rem",
                    fontWeight: "bold",
                    flexShrink: 0,
                  }}
                >
                  {item.speaker.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span style={{ fontWeight: "bold", color: "white" }}>
                      {item.speaker}:
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  <p style={{ color: "white", margin: 0 }}>{item.content}</p>
                </div>
              </div>
            </div>
          ))}

          {currentSpeech && (
            <div
              style={{
                padding: "0.5rem",
                borderRadius: "8px",
                backgroundColor: "#1E293B",
                border: "1px solid #3B82F6",
                color: "#94A3B8",
                fontStyle: "italic",
              }}
            >
              {currentSpeech}...
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <footer
        style={{
          padding: "1rem",
          borderTop: "1px solid #1E293B",
          backgroundColor: "#0F172A",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
          }}
        >
          <button
            onClick={togglePauseResume}
            style={{
              backgroundColor: isPaused ? "#3B82F6" : "#6B7280",
              color: "white",
              padding: "0.75rem 1.5rem",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {isPaused ? "▶️ Resume" : "⏸️ Pause Mic"}
          </button>

          <button
            onClick={() => {
              const data = transcript
                .map(
                  (item) =>
                    `[${formatTime(item.timestamp)}] ${item.speaker}: ${
                      item.content
                    }`
                )
                .join("\n");

              const blob = new Blob([data], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `transcript_${
                new Date().toISOString().split("T")[0]
              }.txt`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            style={{
              backgroundColor: "#6D28D9",
              color: "white",
              padding: "0.75rem 1.5rem",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            📥 Export Transcript
          </button>
        </div>
      </footer>
    </div>
  );
}
