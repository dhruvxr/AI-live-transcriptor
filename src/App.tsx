import { useState } from "react";
import { Dashboard } from "../components/Dashboard";
import { PastSessions } from "../components/PastSessions";
import { LiveTranscription } from "../components/LiveTranscription";
import { SessionDetail } from "../components/SessionDetail";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const navigate = (page: string, sessionId?: string) => {
    setCurrentPage(page);
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={navigate} />;
      case "live":
        return <LiveTranscription onNavigate={navigate} />;
      case "transcription":
        return <LiveTranscription onNavigate={navigate} />;
      case "sessions":
        return <PastSessions onNavigate={navigate} />;
      case "past-sessions":
        return <PastSessions onNavigate={navigate} />;
      case "session-detail":
        return <SessionDetail onNavigate={navigate} sessionId={currentSessionId} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return renderCurrentPage();
}

export default App;
