import { useState } from "react";
import { Dashboard } from "../components/Dashboard";
import { Settings } from "../components/Settings";
import { PastSessions } from "../components/PastSessions";
import { SimpleLiveTranscription } from "../components/SimpleLiveTranscription";

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
            📋 Past Sessions
          </h1>
          <div></div>
        </div>

        <div
          style={{
            backgroundColor: "#1E293B",
            padding: "2rem",
            borderRadius: "12px",
            border: "1px solid #334155",
          }}
        >
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              marginBottom: "1rem",
            }}
          >
            Recent Sessions
          </h3>
          <div style={{ color: "#94A3B8" }}>
            <p>No sessions found. Start your first transcription session!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple test component for Settings
function SimpleSettingsPage({ onNavigate }: { onNavigate: any }) {
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
          <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>⚙️ Settings</h1>
          <div></div>
        </div>

        <div
          style={{
            backgroundColor: "#1E293B",
            padding: "2rem",
            borderRadius: "12px",
            border: "1px solid #334155",
          }}
        >
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              marginBottom: "1rem",
            }}
          >
            Azure Configuration
          </h3>
          <div style={{ color: "#94A3B8" }}>
            <p>
              Configure your Azure Speech Services and OpenAI settings here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Dashboard
function SimpleDashboard({ onNavigate }: { onNavigate: any }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0F172A",
        padding: "2rem",
        color: "white",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          🎙️ AI Live Transcriptor
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
            marginBottom: "3rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#1E293B",
              padding: "1.5rem",
              borderRadius: "8px",
              border: "1px solid #334155",
            }}
          >
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              Total Sessions
            </h3>
            <p
              style={{ fontSize: "2rem", fontWeight: "bold", color: "#3B82F6" }}
            >
              12
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#1E293B",
              padding: "1.5rem",
              borderRadius: "8px",
              border: "1px solid #334155",
            }}
          >
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              Hours Transcribed
            </h3>
            <p
              style={{ fontSize: "2rem", fontWeight: "bold", color: "#10B981" }}
            >
              45.5
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#1E293B",
              padding: "1.5rem",
              borderRadius: "8px",
              border: "1px solid #334155",
            }}
          >
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              Words Processed
            </h3>
            <p
              style={{ fontSize: "2rem", fontWeight: "bold", color: "#F59E0B" }}
            >
              125,430
            </p>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => onNavigate("live")}
            style={{
              backgroundColor: "#3B82F6",
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
            🎙️ Start Live Transcription
          </button>

          <button
            onClick={() => onNavigate("sessions")}
            style={{
              backgroundColor: "#6D28D9",
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
            📋 View Sessions
          </button>

          <button
            onClick={() => onNavigate("settings")}
            style={{
              backgroundColor: "#059669",
              color: "white",
              padding: "1rem 2rem",
              border: "none",
              borderRadius: "8px",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>
    </div>
  );
}

type NavigateFunction = (
  page: "dashboard" | "live" | "settings" | "sessions" | "session-detail",
  sessionId?: string
) => void;

function App() {
  const [currentPage, setCurrentPage] = useState<
    "dashboard" | "live" | "settings" | "sessions" | "session-detail"
  >("dashboard");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );

  const navigate: NavigateFunction = (page, sessionId) => {
    console.log(
      `Navigating to: ${page}`,
      sessionId ? `with sessionId: ${sessionId}` : ""
    );
    setCurrentPage(page);
    if (sessionId) {
      setSelectedSessionId(sessionId);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={navigate} />;
      case "live":
        return <SimpleLiveTranscription onNavigate={navigate} />;
      case "settings":
        return <Settings onNavigate={navigate} />;
      case "sessions":
        return <PastSessions onNavigate={navigate} />;
      case "session-detail":
        return <SimpleSessionsPage onNavigate={navigate} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return <div className="min-h-screen bg-[#0F172A]">{renderCurrentPage()}</div>;
}

export default App;
