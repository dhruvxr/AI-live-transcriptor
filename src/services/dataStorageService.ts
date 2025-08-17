export interface TranscriptionSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration: string;
  type: "lecture" | "meeting" | "interview" | "other";
  transcript: TranscriptItem[];
  questionsCount: number;
  wordsCount: number;
  summary?: string;
  tags?: string[];
}

export interface TranscriptItem {
  id: string;
  type: "speech" | "question" | "ai_response";
  content: string;
  timestamp: string;
  confidence?: number;
  speaker?: string;
}

// LocalStorage helpers
const STORAGE_KEY = "ai-transcriptor-sessions";

const saveToLocalStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Failed to save sessions to localStorage:", error);
  }
};

const loadFromLocalStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsedSessions = JSON.parse(stored);
      if (Array.isArray(parsedSessions)) {
        sessions = parsedSessions;
      }
    }
  } catch (error) {
    console.error("Failed to load sessions from localStorage:", error);
  }
};

// In-memory storage for now (can be replaced with IndexedDB or API calls)
let sessions: TranscriptionSession[] = [];

// Initialize by loading from localStorage
const initializeSessions = () => {
  // First, clear any existing dummy data keys from localStorage
  const dummyKeys = [
    "ai-transcriptor-sessions",
    "transcription-sessions",
    "ai-transcriptor",
    "transcription",
  ];

  dummyKeys.forEach((key) => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          const hasDummyData = data.some(
            (session) =>
              session.title === "Biology Lecture - Cell Structure" ||
              session.title === "Team Meeting - Project Review" ||
              session.title === "Session 1" ||
              session.title === "Session 2" ||
              session.title === "Session 3" ||
              session.id === "1" ||
              session.id === "2" ||
              session.id === "3"
          );

          if (hasDummyData) {
            console.log(`Clearing dummy data from localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        // If parsing fails, remove the corrupted data
        localStorage.removeItem(key);
      }
    }
  });

  // Now load fresh data from localStorage
  loadFromLocalStorage();
};

// Initialize on module load
initializeSessions();

// Create a new session
export const createSession = (
  sessionData: Omit<
    TranscriptionSession,
    "id" | "questionsCount" | "wordsCount"
  >
): TranscriptionSession => {
  const newSession: TranscriptionSession = {
    ...sessionData,
    id: Date.now().toString(),
    questionsCount: sessionData.transcript.filter(
      (item) => item.type === "question"
    ).length,
    wordsCount: sessionData.transcript.reduce(
      (count, item) => count + item.content.split(" ").length,
      0
    ),
  };

  sessions.unshift(newSession);
  saveToLocalStorage();
  return newSession;
};

// Get all sessions
export const getAllSessions = (): TranscriptionSession[] => {
  loadFromLocalStorage();
  return sessions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

// Get session by ID
export const getSessionById = (id: string): TranscriptionSession | null => {
  loadFromLocalStorage();
  return sessions.find((session) => session.id === id) || null;
};

// Update session
export const updateSession = (
  id: string,
  updates: Partial<TranscriptionSession>
): TranscriptionSession | null => {
  loadFromLocalStorage();
  const sessionIndex = sessions.findIndex((session) => session.id === id);
  if (sessionIndex === -1) return null;

  sessions[sessionIndex] = { ...sessions[sessionIndex], ...updates };
  saveToLocalStorage();
  return sessions[sessionIndex];
};

// Delete session
export const deleteSession = (id: string): boolean => {
  loadFromLocalStorage();
  const initialLength = sessions.length;
  sessions = sessions.filter((session) => session.id !== id);
  if (sessions.length < initialLength) {
    saveToLocalStorage();
    return true;
  }
  return false;
};

// Add transcript item to session
export const addTranscriptItem = (
  sessionId: string,
  item: Omit<TranscriptItem, "id">
): TranscriptItem | null => {
  loadFromLocalStorage();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;

  const newItem: TranscriptItem = {
    ...item,
    id: Date.now().toString(),
  };

  session.transcript.push(newItem);
  session.questionsCount = session.transcript.filter(
    (i) => i.type === "question"
  ).length;
  session.wordsCount = session.transcript.reduce(
    (count, i) => count + i.content.split(" ").length,
    0
  );

  saveToLocalStorage();
  return newItem;
};

// Export session data
export const exportSession = (
  sessionId: string,
  format: "txt" | "json" | "csv"
): string => {
  const session = getSessionById(sessionId);
  if (!session) return "";

  switch (format) {
    case "txt":
      return session.transcript
        .map(
          (item) =>
            `[${item.timestamp}] ${item.type === "ai_response" ? "AI: " : ""}${
              item.content
            }`
        )
        .join("\n");

    case "json":
      return JSON.stringify(session, null, 2);

    case "csv":
      const csvHeader = "Timestamp,Type,Content,Confidence\n";
      const csvRows = session.transcript
        .map(
          (item) =>
            `"${item.timestamp}","${item.type}","${item.content.replace(
              /"/g,
              '""'
            )}","${item.confidence || ""}"`
        )
        .join("\n");
      return csvHeader + csvRows;

    default:
      return "";
  }
};

// Search sessions
export const searchSessions = (query: string): TranscriptionSession[] => {
  loadFromLocalStorage();
  const lowercaseQuery = query.toLowerCase();
  return sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(lowercaseQuery) ||
      session.summary?.toLowerCase().includes(lowercaseQuery) ||
      session.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery)) ||
      session.transcript.some((item) =>
        item.content.toLowerCase().includes(lowercaseQuery)
      )
  );
};

// Get session statistics
export const getSessionStats = () => {
  loadFromLocalStorage();
  const totalSessions = sessions.length;
  const totalQuestions = sessions.reduce(
    (sum, session) => sum + session.questionsCount,
    0
  );
  const totalWords = sessions.reduce(
    (sum, session) => sum + session.wordsCount,
    0
  );
  const totalDuration = sessions.reduce((sum, session) => {
    const [hours, minutes] = session.duration
      .replace(/[hm]/g, "")
      .split(" ")
      .map(Number);
    return sum + hours * 60 + minutes;
  }, 0);

  return {
    totalSessions,
    totalQuestions,
    totalWords,
    totalHours: Math.round((totalDuration / 60) * 10) / 10,
    averageWordsPerSession: Math.round(totalWords / Math.max(totalSessions, 1)),
    averageQuestionsPerSession: Math.round(
      totalQuestions / Math.max(totalSessions, 1)
    ),
  };
};

// Utility function to completely clear dummy data (for debugging)
export const clearAllDummyData = () => {
  console.log("Manually clearing all dummy data...");

  // Clear all localStorage keys that might contain session data
  const allKeys = Object.keys(localStorage);
  allKeys.forEach((key) => {
    if (
      key.includes("ai-transcriptor") ||
      key.includes("transcription") ||
      key.includes("session")
    ) {
      console.log(`Removing localStorage key: ${key}`);
      localStorage.removeItem(key);
    }
  });

  // Reset in-memory sessions
  sessions = [];

  // Save empty array to localStorage
  saveToLocalStorage();

  console.log("All dummy data cleared successfully");
};
