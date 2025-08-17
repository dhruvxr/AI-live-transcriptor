// Utility script to clear localStorage data
// Run this in browser console: localStorage.removeItem('ai-transcriptor-sessions')

export const clearAllSessions = () => {
  const STORAGE_KEY = "ai-transcriptor-sessions";
  localStorage.removeItem(STORAGE_KEY);
  console.log("All sessions cleared from localStorage");
};

// Auto-clear on import (for development)
if (typeof window !== "undefined") {
  clearAllSessions();
}
