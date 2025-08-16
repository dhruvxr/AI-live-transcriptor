import { useState } from "react";
import { Dashboard } from "../components/Dashboard";
import { LiveTranscription } from "../components/LiveTranscription";
import { Settings } from "../components/Settings";
import { PastSessions } from "../components/PastSessions";
import { SessionDetail } from "../components/SessionDetail";

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
        return <LiveTranscription onNavigate={navigate} />;
      case "settings":
        return <Settings onNavigate={navigate} />;
      case "sessions":
        return <PastSessions onNavigate={navigate} />;
      case "session-detail":
        return (
          <SessionDetail onNavigate={navigate} sessionId={selectedSessionId} />
        );
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return <div className="min-h-screen bg-[#0F172A]">{renderCurrentPage()}</div>;
}

export default App;
