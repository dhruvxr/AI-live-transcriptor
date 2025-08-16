import { useState } from "react";
import { Dashboard } from "../components/Dashboard";
import { Settings } from "../components/Settings";
import { PastSessions } from "../components/PastSessions";
import { azureSpeechService } from "./services/realAzureSpeechService";
import { questionDetectionService } from "./services/realQuestionDetectionService";
import { exportService } from "./services/realExportService";

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
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
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
  
  // Interactive transcript states
  const [selectedText, setSelectedText] = useState<string>("");
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPromptText, setAiPromptText] = useState("");
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  
  // Export modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'json' | 'csv' | 'pdf' | 'docx'>('txt');
  const [isExporting, setIsExporting] = useState(false);

  // Helper function to calculate text similarity using Levenshtein distance
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance calculation
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Enhanced duplicate detection function with aggressive filtering
  const isDuplicateText = (newText: string): boolean => {
    const cleanText = newText.trim().toLowerCase();
    
    // Skip empty or very short text
    if (cleanText.length < 2) {
      console.log("Skipping: too short -", cleanText);
      return true;
    }
    
    // Get words from new text
    const newWords = cleanText.split(/\s+/);
    
    // Skip single words that are common fillers
    const fillerWords = ['um', 'uh', 'oh', 'ah', 'hmm', 'okay', 'ok', 'yes', 'no', 'yeah', 'well', 'so', 'like', 'the', 'a', 'an', 'and', 'is', 'what'];
    if (newWords.length === 1 && fillerWords.includes(newWords[0])) {
      console.log("Skipping: filler word -", cleanText);
      return true;
    }
    
    // Check against current transcript - much more aggressive
    const currentTranscript = transcript.toLowerCase();
    const currentWords = currentTranscript.split(/\s+/);
    
    // If most words in new text already exist in recent transcript, skip it
    if (currentWords.length > 0) {
      const recentWords = currentWords.slice(-15); // Check last 15 words
      const existingWordCount = newWords.filter(word => recentWords.includes(word)).length;
      const existingRatio = existingWordCount / newWords.length;
      
      if (existingRatio > 0.7) { // If 70% of words already exist recently
        console.log(`Skipping: ${Math.round(existingRatio * 100)}% of words already in recent transcript -`, cleanText);
        return true;
      }
    }
    
    // Check if new text is contained within current transcript
    if (currentTranscript.includes(cleanText)) {
      console.log("Skipping: exact text already in transcript -", cleanText);
      return true;
    }
    
    // Check for patterns where new text is just rearrangement of recent words
    if (currentWords.length > 0) {
      const lastSentence = currentWords.slice(-10).join(' '); // Last 10 words
      const similarity = calculateSimilarity(cleanText, lastSentence);
      if (similarity > 0.5) {
        console.log(`Skipping: too similar (${Math.round(similarity * 100)}%) to recent text -`, cleanText);
        return true;
      }
    }
    
    // Check recent history
    const recentHistory = transcriptHistory.slice(-3); // Only check last 3 entries
    
    // Exact duplicate check
    if (recentHistory.includes(cleanText)) {
      console.log("Skipping: exact duplicate in history -", cleanText);
      return true;
    }
    
    // Similarity check with history
    const hasSimilar = recentHistory.some(item => {
      const similarity = calculateSimilarity(cleanText, item.toLowerCase());
      if (similarity > 0.4) { // Very aggressive threshold
        console.log(`Skipping: similar (${Math.round(similarity * 100)}%) to history item "${item}" -`, cleanText);
        return true;
      }
      return false;
    });
    
    if (hasSimilar) {
      return true;
    }
    
    console.log("Allowing text:", cleanText);
    return false;
  };

  // Clean up repetitive text patterns - now more aggressive
  const cleanRepetitiveText = (text: string): string => {
    const words = text.split(/\s+/);
    const cleanedWords: string[] = [];
    const seenWords: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      
      // Skip if this word was just seen in the last 2 positions
      if (seenWords.slice(-2).includes(word)) {
        console.log("Removing recent duplicate word:", words[i]);
        continue;
      }
      
      // Add word to result and tracking
      cleanedWords.push(words[i]);
      seenWords.push(word);
      
      // Keep only recent words for tracking
      if (seenWords.length > 5) {
        seenWords.shift();
      }
    }
    
    const result = cleanedWords.join(' ');
    if (result !== text) {
      console.log("Cleaned repetitive text:", text, "->", result);
    }
    
    return result;
  };

  // Function to clear transcript (for testing)
  const clearTranscript = () => {
    setTranscript('');
    setTranscriptHistory([]);
    setQuestions([]);
    console.log("Transcript cleared");
  };

  // Handle text selection in transcript
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim();
      setSelectedText(selectedText);
      setShowAIPrompt(true);
      setAiPromptText('');
    }
  };

  // Handle AI prompt submission
  const handleAIPromptSubmit = async () => {
    if (!aiPromptText.trim() || !selectedText) return;
    
    setIsGeneratingAnswer(true);
    try {
      const prompt = `Based on this selected text from a transcript: "${selectedText}"\n\nUser question: ${aiPromptText}\n\nPlease provide a helpful and contextual answer.`;
      
      const aiResponse = await questionDetectionService.generateAnswer(prompt);
      
      // Add to questions array for display
      const newQuestion = {
        text: aiPromptText,
        answer: aiResponse.answer,
        timestamp: new Date().toISOString(),
        confidence: 1.0
      };
      
      setQuestions(prev => [...prev, newQuestion]);
      
      // Close the prompt dialog
      setShowAIPrompt(false);
      setSelectedText('');
      setAiPromptText('');
      
    } catch (error) {
      console.error('Error generating AI answer:', error);
      // Could add error handling UI here
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  // Handle closing AI prompt dialog
  const handleCloseAIPrompt = () => {
    setShowAIPrompt(false);
    setSelectedText('');
    setAiPromptText('');
  };

  // Enhanced transcript processing
  const processTranscriptText = (newText: string) => {
    // First clean up repetitive patterns
    const cleanedText = cleanRepetitiveText(newText.trim());
    
    if (!cleanedText || isDuplicateText(cleanedText)) {
      console.log("Skipping duplicate or invalid text:", cleanedText);
      return;
    }
    
    // Add to history for duplicate detection
    setTranscriptHistory(prev => [...prev.slice(-4), cleanedText.toLowerCase()]);
    
    // Update transcript - be more careful about concatenation
    setTranscript(prev => {
      // Check if this text would create a duplicate in the current transcript
      const currentLower = prev.toLowerCase();
      const newLower = cleanedText.toLowerCase();
      
      // If the new text is already at the end of current transcript, skip it
      if (currentLower.endsWith(newLower) && prev.length > 0) {
        console.log("Skipping text already at end of transcript:", cleanedText);
        return prev;
      }
      
      // Add space only if needed
      const needsSpace = prev.length > 0 && !prev.endsWith(' ') && !cleanedText.startsWith(' ');
      const updated = prev + (needsSpace ? " " : "") + cleanedText;
      
      // Process for questions using AI service
      questionDetectionService.processTranscript(
        cleanedText,
        updated,
        (question) => {
          console.log("🤔 Question detected:", question.text);
          setQuestions((prev) => {
            // Check if this question already exists (prevent duplicates)
            const existingQuestion = prev.find(q => 
              q.text.toLowerCase().trim() === question.text.toLowerCase().trim()
            );
            
            if (existingQuestion) {
              console.log("⚠️ Duplicate question ignored:", question.text);
              return prev; // Don't add duplicate
            }
            
            console.log("✅ Adding new question:", question.text);
            return [...prev, question];
          });
        },
        (question, answer) => {
          console.log("🤖 Answer generated for:", question.text);
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
    
    // Update session stats
    setCurrentSession((prev) => ({
      ...prev,
      duration: prev.duration + 1,
      wordCount: prev.wordCount + cleanedText.split(" ").length,
    }));
  };

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

  // Real recording functionality using Speech Service
  const startRecording = async () => {
    setIsRecording(true);
    setTranscript(""); // Clear previous transcript
    setTranscriptHistory([]); // Clear history for fresh start
    setQuestions([]); // Clear previous questions
    setCurrentSession({
      ...currentSession,
      startTime: new Date(),
    });

    try {
      await azureSpeechService.startRecording(
        (result) => {
          // Handle real-time transcription results with duplicate detection
          console.log("🎤 RAW SPEECH RESULT:", {
            text: result?.text,
            fullResult: result,
            timestamp: new Date().toISOString()
          });
          
          // Process the result text with enhanced duplicate detection
          if (result?.text?.trim()) {
            console.log("📝 PROCESSING TEXT:", result.text);
            processTranscriptText(result.text);
          } else {
            console.log("⚠️ SKIPPING EMPTY/INVALID RESULT:", result);
          }
        },
        (error) => {
          console.error("Speech recognition error:", error);
          setIsRecording(false);
          alert(`Recording error: ${error}\n\nPlease check your microphone permissions and speech service configuration.`);
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

  const stopRecording = () => {
    azureSpeechService.stopRecording();
    setIsRecording(false);
  };

  const exportSession = () => {
    setShowExportModal(true);
  };

  const handleExportWithFormat = async () => {
    setIsExporting(true);
    
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
        format: exportFormat,
        includeTimestamps: true,
        includeQuestions: true,
        includeMetadata: true,
      });
      setShowExportModal(false);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCloseExportModal = () => {
    setShowExportModal(false);
    setExportFormat('txt');
  };

  return (
    <>
      {/* Add custom CSS for animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
            50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); }
          }
          .recording-pulse {
            animation: pulse 2s infinite, glow 2s infinite;
          }
          .glass-effect {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .transcript-text {
            font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
            font-size: 1rem;
            line-height: 1.8;
            letter-spacing: 0.025em;
            color: #F1F5F9;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          }
        `}
      </style>
      
      <div style={{ 
        minHeight: "100vh", 
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        <div style={{ 
          maxWidth: "1400px", 
          margin: "0 auto", 
          padding: "1.5rem",
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "2rem",
          minHeight: "100vh"
        }}>
          {/* Main Content Area */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header */}
            <div className="glass-effect" style={{
              borderRadius: "20px",
              padding: "1.5rem 2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <button
                  onClick={() => onNavigate("dashboard")}
                  style={{
                    background: "rgba(75, 85, 99, 0.8)",
                    color: "white",
                    padding: "0.75rem 1.25rem",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    transition: "all 0.2s ease"
                  }}
                >
                  ← Back to Dashboard
                </button>
                <div style={{
                  width: "48px",
                  height: "48px",
                  background: "linear-gradient(135deg, #10B981, #059669)",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px"
                }}>
                  🎤
                </div>
                <div>
                  <h1 style={{ 
                    color: "white", 
                    fontSize: "1.75rem", 
                    fontWeight: "700",
                    margin: "0",
                    letterSpacing: "-0.025em"
                  }}>
                    Live Transcription
                  </h1>
                  <p style={{ 
                    color: "rgba(255, 255, 255, 0.7)", 
                    margin: "0",
                    fontSize: "0.875rem"
                  }}>
                    AI-powered speech recognition with GPT-4o
                  </p>
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  onClick={exportSession}
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#10B981",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "12px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  📊 Export Session
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
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    color: "#3B82F6",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "12px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  🔗 Share
                </button>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="glass-effect" style={{
              borderRadius: "20px",
              padding: "2.5rem",
              textAlign: "center"
            }}>
              {!isRecording ? (
                <div>
                  <div style={{
                    width: "100px",
                    height: "100px",
                    background: "linear-gradient(135deg, #10B981, #059669)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 2rem",
                    fontSize: "48px",
                    boxShadow: "0 20px 60px rgba(16, 185, 129, 0.3)"
                  }}>
                    🎙️
                  </div>
                  <h2 style={{
                    color: "white",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    margin: "0 0 1rem 0"
                  }}>
                    Ready to Record
                  </h2>
                  
                  {/* Status indicators */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(2, 1fr)", 
                    gap: "1rem", 
                    marginBottom: "2rem",
                    fontSize: "0.875rem"
                  }}>
                    <div style={{ 
                      background: "rgba(16, 185, 129, 0.1)", 
                      padding: "1rem", 
                      borderRadius: "12px",
                      border: "1px solid rgba(16, 185, 129, 0.2)"
                    }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✅</div>
                      <div style={{ color: "#10B981", fontWeight: "600" }}>Speech Service</div>
                      <div style={{ color: "rgba(255, 255, 255, 0.7)" }}>Configured</div>
                    </div>
                    <div style={{ 
                      background: "rgba(16, 185, 129, 0.1)", 
                      padding: "1rem", 
                      borderRadius: "12px",
                      border: "1px solid rgba(16, 185, 129, 0.2)"
                    }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✅</div>
                      <div style={{ color: "#10B981", fontWeight: "600" }}>Speech SDK</div>
                      <div style={{ color: "rgba(255, 255, 255, 0.7)" }}>Loaded</div>
                    </div>
                    <div style={{ 
                      background: compatibility.webSpeech ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", 
                      padding: "1rem", 
                      borderRadius: "12px",
                      border: `1px solid ${compatibility.webSpeech ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                    }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                        {compatibility.webSpeech ? "✅" : "❌"}
                      </div>
                      <div style={{ color: compatibility.webSpeech ? "#10B981" : "#EF4444", fontWeight: "600" }}>Web Speech API</div>
                      <div style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                        {compatibility.webSpeech ? "Supported" : "Not supported"}
                      </div>
                    </div>
                    <div style={{ 
                      background: "rgba(16, 185, 129, 0.1)", 
                      padding: "1rem", 
                      borderRadius: "12px",
                      border: "1px solid rgba(16, 185, 129, 0.2)"
                    }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✅</div>
                      <div style={{ color: "#10B981", fontWeight: "600" }}>Microphone</div>
                      <div style={{ color: "rgba(255, 255, 255, 0.7)" }}>Available</div>
                    </div>
                  </div>

                  {/* Browser compatibility message */}
                  <div style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    marginBottom: "2rem"
                  }}>
                    <p style={{ 
                      color: "#10B981", 
                      margin: "0", 
                      fontSize: "0.875rem",
                      fontWeight: "600"
                    }}>
                      🔥 Modern Browser + Speech SDK: Speech recognition ready! Click "🎤 Start Recording" to begin live transcription.
                    </p>
                  </div>

                  {/* Start Recording Button */}
                  <button
                    onClick={startRecording}
                    style={{
                      background: "linear-gradient(135deg, #10B981, #059669)",
                      color: "white",
                      padding: "1.25rem 3rem",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      fontSize: "1.125rem",
                      fontWeight: "700",
                      boxShadow: "0 10px 40px rgba(16, 185, 129, 0.4)",
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      margin: "0 auto"
                    }}
                  >
                    🎤 Start Recording
                  </button>
                </div>
              ) : (
                <div>
                  <div className="recording-pulse" style={{
                    width: "100px",
                    height: "100px",
                    background: "linear-gradient(135deg, #EF4444, #DC2626)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 2rem",
                    fontSize: "48px"
                  }}>
                    🎙️
                  </div>
                  <h2 style={{
                    color: "white",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    margin: "0 0 1rem 0"
                  }}>
                    Recording in Progress
                  </h2>
                  <p style={{
                    color: "rgba(255, 255, 255, 0.7)",
                    margin: "0 0 2rem 0",
                    fontSize: "1rem"
                  }}>
                    Speak clearly into your microphone
                  </p>
                  <button
                    onClick={stopRecording}
                    style={{
                      background: "linear-gradient(135deg, #EF4444, #DC2626)",
                      color: "white",
                      padding: "1.25rem 3rem",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      fontSize: "1.125rem",
                      fontWeight: "700",
                      boxShadow: "0 10px 40px rgba(239, 68, 68, 0.4)",
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      margin: "0 auto"
                    }}
                  >
                    🛑 Stop Recording
                  </button>
                </div>
              )}
              
              {/* Clear transcript button */}
              {transcript && (
                <button
                  onClick={clearTranscript}
                  style={{
                    background: "rgba(107, 114, 128, 0.15)",
                    border: "1px solid rgba(107, 114, 128, 0.3)",
                    color: "#9CA3AF",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    marginTop: "1.5rem",
                    transition: "all 0.2s ease"
                  }}
                >
                  🗑️ Clear Transcript
                </button>
              )}
            </div>

            {/* Live Transcript */}
            <div className="glass-effect" style={{
              borderRadius: "20px",
              overflow: "hidden",
              flex: "1",
              display: "flex",
              flexDirection: "column"
            }}>
              <div style={{
                padding: "1.5rem 2rem",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.05)"
              }}>
                <h3 style={{
                  color: "white",
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  margin: "0",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem"
                }}>
                  📝 Live Transcript
                  {isRecording && (
                    <span style={{
                      width: "10px",
                      height: "10px",
                      background: "#EF4444",
                      borderRadius: "50%",
                      animation: "pulse 1s infinite"
                    }}></span>
                  )}
                </h3>
              </div>
              <div
                className="transcript-text"
                style={{
                  padding: "2rem",
                  flex: "1",
                  minHeight: "400px",
                  maxHeight: "600px",
                  overflowY: "auto",
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255, 255, 255, 0.2) transparent",
                  cursor: "text"
                }}
                onMouseUp={handleTextSelection}
              >
                {transcript ? (
                  <div style={{ 
                    whiteSpace: "pre-wrap", 
                    wordBreak: "break-word",
                    fontSize: "1.125rem",
                    lineHeight: "1.8",
                    userSelect: "text",
                    WebkitUserSelect: "text",
                    MozUserSelect: "text",
                    msUserSelect: "text"
                  }}>
                    {transcript}
                  </div>
                ) : (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "rgba(255, 255, 255, 0.4)",
                    fontSize: "1rem",
                    textAlign: "center"
                  }}>
                    <div>
                      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💬</div>
                      {isRecording ? "Listening... Start speaking!" : "No transcript yet. Click start recording to begin."}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Session Stats */}
            <div className="glass-effect" style={{
              borderRadius: "20px",
              padding: "2rem"
            }}>
              <h3 style={{
                color: "white",
                fontSize: "1.125rem",
                fontWeight: "700",
                margin: "0 0 1.5rem 0",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                📊 Session Stats
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ 
                  textAlign: "center",
                  background: "rgba(59, 130, 246, 0.1)",
                  padding: "1.5rem",
                  borderRadius: "16px",
                  border: "1px solid rgba(59, 130, 246, 0.2)"
                }}>
                  <div style={{
                    fontSize: "2.5rem",
                    fontWeight: "700",
                    color: "#3B82F6",
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: "0.5rem"
                  }}>
                    {Math.floor(currentSession.duration / 60).toString().padStart(2, '0')}:
                    {(currentSession.duration % 60).toString().padStart(2, '0')}
                  </div>
                  <div style={{ 
                    color: "rgba(255, 255, 255, 0.8)", 
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}>
                    Duration
                  </div>
                </div>
                <div style={{ 
                  textAlign: "center",
                  background: "rgba(16, 185, 129, 0.1)",
                  padding: "1.5rem",
                  borderRadius: "16px",
                  border: "1px solid rgba(16, 185, 129, 0.2)"
                }}>
                  <div style={{
                    fontSize: "2.5rem",
                    fontWeight: "700",
                    color: "#10B981",
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: "0.5rem"
                  }}>
                    {currentSession.wordCount}
                  </div>
                  <div style={{ 
                    color: "rgba(255, 255, 255, 0.8)", 
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}>
                    Words
                  </div>
                </div>
              </div>
            </div>

            {/* GPT-4o Question Detection & Answers */}
            <div className="glass-effect" style={{
              borderRadius: "20px",
              padding: "2rem"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.5rem"
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  background: "linear-gradient(135deg, #10B981, #059669)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px"
                }}>
                  🤖
                </div>
                <h3 style={{
                  color: "white",
                  fontSize: "1.125rem",
                  fontWeight: "700",
                  margin: "0"
                }}>
                  GPT-4o Question Detection & Answers
                </h3>
              </div>

              <div style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "12px",
                padding: "1rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}>
                <span style={{ color: "#10B981", fontSize: "1.25rem" }}>✅</span>
                <span style={{ color: "#10B981", fontWeight: "600", fontSize: "0.875rem" }}>
                  GPT-4o configured and ready
                </span>
              </div>

              {/* Questions Display */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto" }}>
                {questions.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: "0.875rem",
                    fontStyle: "italic",
                    padding: "3rem 1rem"
                  }}>
                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>💭</div>
                    GPT-4o is listening for questions...
                  </div>
                ) : (
                  questions.map((question, index) => (
                    <div key={index} style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "16px",
                      padding: "1.5rem",
                      border: "1px solid rgba(255, 255, 255, 0.1)"
                    }}>
                      {/* Question */}
                      <div style={{
                        background: "rgba(59, 130, 246, 0.1)",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        borderRadius: "12px",
                        padding: "1rem",
                        marginBottom: "1rem"
                      }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.75rem"
                        }}>
                          <span style={{ color: "#3B82F6", fontSize: "1.25rem" }}>❓</span>
                          <span style={{
                            color: "#3B82F6",
                            fontSize: "0.75rem",
                            fontWeight: "600"
                          }}>
                            Question {index + 1} detected at{" "}
                            {new Date(question.timestamp).toLocaleTimeString()}
                          </span>
                          <span style={{
                            background: "rgba(59, 130, 246, 0.2)",
                            color: "#3B82F6",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "8px",
                            fontSize: "0.75rem",
                            fontWeight: "600"
                          }}>
                            {Math.round((question.confidence || 0.8) * 100)}% confidence
                          </span>
                        </div>
                        <div style={{
                          color: "#E2E8F0",
                          fontWeight: "600",
                          fontSize: "1rem",
                          lineHeight: "1.5"
                        }}>
                          "{question.text}"
                        </div>
                      </div>

                      {/* Answer */}
                      <div style={{
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        borderRadius: "12px",
                        padding: "1rem"
                      }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.75rem"
                        }}>
                          <span style={{ color: "#10B981", fontSize: "1.25rem" }}>🤖</span>
                          <span style={{
                            color: "#10B981",
                            fontSize: "0.75rem",
                            fontWeight: "600"
                          }}>
                            GPT-4o Response:
                          </span>
                        </div>
                        <div style={{
                          color: "#E2E8F0",
                          lineHeight: "1.6",
                          fontSize: "0.95rem"
                        }}>
                          {question.answer || (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontStyle: "italic", color: "#10B981" }}>Generating answer...</span>
                              <div style={{ display: "flex", gap: "2px" }}>
                                <div style={{ 
                                  width: "4px", 
                                  height: "4px", 
                                  backgroundColor: "#10B981", 
                                  borderRadius: "50%", 
                                  animation: "pulse 1.5s infinite" 
                                }}></div>
                                <div style={{ 
                                  width: "4px", 
                                  height: "4px", 
                                  backgroundColor: "#10B981", 
                                  borderRadius: "50%", 
                                  animation: "pulse 1.5s infinite 0.2s" 
                                }}></div>
                                <div style={{ 
                                  width: "4px", 
                                  height: "4px", 
                                  backgroundColor: "#10B981", 
                                  borderRadius: "50%", 
                                  animation: "pulse 1.5s infinite 0.4s" 
                                }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Prompt Modal */}
      {showAIPrompt && (
        <div style={{
          position: "fixed",
          top: "0",
          left: "0",
          right: "0",
          bottom: "0",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: "1000",
          padding: "2rem"
        }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "24px",
            padding: "2rem",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem"
            }}>
              <h3 style={{
                color: "white",
                fontSize: "1.25rem",
                fontWeight: "700",
                margin: "0",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                🤖 Ask AI about Selected Text
              </h3>
              <button
                onClick={handleCloseAIPrompt}
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#EF4444",
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>

            {/* Selected Text Display */}
            <div style={{
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "12px",
              padding: "1rem",
              marginBottom: "1.5rem"
            }}>
              <div style={{
                color: "#3B82F6",
                fontSize: "0.875rem",
                fontWeight: "600",
                marginBottom: "0.5rem"
              }}>
                Selected Text:
              </div>
              <div style={{
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: "0.95rem",
                lineHeight: "1.5",
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                "{selectedText}"
              </div>
            </div>

            {/* Question Input */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "0.875rem",
                fontWeight: "600",
                display: "block",
                marginBottom: "0.5rem"
              }}>
                Your Question:
              </label>
              <textarea
                value={aiPromptText}
                onChange={(e) => setAiPromptText(e.target.value)}
                placeholder="Ask a question about the selected text..."
                style={{
                  width: "100%",
                  height: "120px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "12px",
                  padding: "1rem",
                  color: "white",
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(59, 130, 246, 0.5)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={handleCloseAIPrompt}
                style={{
                  background: "rgba(107, 114, 128, 0.15)",
                  border: "1px solid rgba(107, 114, 128, 0.3)",
                  color: "#9CA3AF",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "500"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAIPromptSubmit}
                disabled={!aiPromptText.trim() || isGeneratingAnswer}
                style={{
                  background: isGeneratingAnswer 
                    ? "rgba(59, 130, 246, 0.5)" 
                    : "linear-gradient(135deg, #3B82F6, #2563EB)",
                  color: "white",
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  borderRadius: "12px",
                  cursor: isGeneratingAnswer ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  opacity: !aiPromptText.trim() ? 0.5 : 1
                }}
              >
                {isGeneratingAnswer ? (
                  <>
                    <div style={{ display: "flex", gap: "2px" }}>
                      <div style={{ 
                        width: "4px", 
                        height: "4px", 
                        backgroundColor: "white", 
                        borderRadius: "50%", 
                        animation: "pulse 1.5s infinite" 
                      }}></div>
                      <div style={{ 
                        width: "4px", 
                        height: "4px", 
                        backgroundColor: "white", 
                        borderRadius: "50%", 
                        animation: "pulse 1.5s infinite 0.2s" 
                      }}></div>
                      <div style={{ 
                        width: "4px", 
                        height: "4px", 
                        backgroundColor: "white", 
                        borderRadius: "50%", 
                        animation: "pulse 1.5s infinite 0.4s" 
                      }}></div>
                    </div>
                    Generating...
                  </>
                ) : (
                  <>
                    🚀 Ask AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      {showExportModal && (
        <div style={{
          position: "fixed",
          top: "0",
          left: "0",
          right: "0",
          bottom: "0",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: "1000",
          padding: "2rem"
        }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "24px",
            padding: "2rem",
            maxWidth: "500px",
            width: "100%"
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem"
            }}>
              <h3 style={{
                color: "white",
                fontSize: "1.25rem",
                fontWeight: "700",
                margin: "0",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                📊 Export Session
              </h3>
              <button
                onClick={handleCloseExportModal}
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#EF4444",
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>

            {/* Format Selection */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "0.875rem",
                fontWeight: "600",
                display: "block",
                marginBottom: "1rem"
              }}>
                Choose Export Format:
              </label>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Text Format */}
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  padding: "1rem",
                  borderRadius: "12px",
                  background: exportFormat === 'txt' ? "rgba(59, 130, 246, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${exportFormat === 'txt' ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                  transition: "all 0.2s ease"
                }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="txt"
                    checked={exportFormat === 'txt'}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    style={{ accentColor: "#3B82F6" }}
                  />
                  <div>
                    <div style={{ color: "white", fontWeight: "600", fontSize: "1rem" }}>📄 Text File (.txt)</div>
                    <div style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.875rem" }}>
                      Clean, readable format with transcript and questions
                    </div>
                  </div>
                </label>

                {/* CSV Format */}
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  padding: "1rem",
                  borderRadius: "12px",
                  background: exportFormat === 'csv' ? "rgba(59, 130, 246, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${exportFormat === 'csv' ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                  transition: "all 0.2s ease"
                }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    style={{ accentColor: "#3B82F6" }}
                  />
                  <div>
                    <div style={{ color: "white", fontWeight: "600", fontSize: "1rem" }}>📊 CSV File (.csv)</div>
                    <div style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.875rem" }}>
                      Structured data format for spreadsheet analysis
                    </div>
                  </div>
                </label>

                {/* JSON Format */}
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  padding: "1rem",
                  borderRadius: "12px",
                  background: exportFormat === 'json' ? "rgba(59, 130, 246, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${exportFormat === 'json' ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                  transition: "all 0.2s ease"
                }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    style={{ accentColor: "#3B82F6" }}
                  />
                  <div>
                    <div style={{ color: "white", fontWeight: "600", fontSize: "1rem" }}>🔧 JSON File (.json)</div>
                    <div style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.875rem" }}>
                      Developer-friendly format with all metadata
                    </div>
                  </div>
                </label>

                {/* PDF Format */}
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  padding: "1rem",
                  borderRadius: "12px",
                  background: exportFormat === 'pdf' ? "rgba(59, 130, 246, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${exportFormat === 'pdf' ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                  transition: "all 0.2s ease"
                }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="pdf"
                    checked={exportFormat === 'pdf'}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    style={{ accentColor: "#3B82F6" }}
                  />
                  <div>
                    <div style={{ color: "white", fontWeight: "600", fontSize: "1rem" }}>📕 PDF Document (.pdf)</div>
                    <div style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.875rem" }}>
                      Professional document format for sharing
                    </div>
                  </div>
                </label>

                {/* DOCX Format */}
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  padding: "1rem",
                  borderRadius: "12px",
                  background: exportFormat === 'docx' ? "rgba(59, 130, 246, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${exportFormat === 'docx' ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                  transition: "all 0.2s ease"
                }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="docx"
                    checked={exportFormat === 'docx'}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    style={{ accentColor: "#3B82F6" }}
                  />
                  <div>
                    <div style={{ color: "white", fontWeight: "600", fontSize: "1rem" }}>📝 Word Document (.docx)</div>
                    <div style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.875rem" }}>
                      Editable Microsoft Word format
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={handleCloseExportModal}
                style={{
                  background: "rgba(107, 114, 128, 0.15)",
                  border: "1px solid rgba(107, 114, 128, 0.3)",
                  color: "#9CA3AF",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "500"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExportWithFormat}
                disabled={isExporting}
                style={{
                  background: isExporting 
                    ? "rgba(16, 185, 129, 0.5)" 
                    : "linear-gradient(135deg, #10B981, #059669)",
                  color: "white",
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  borderRadius: "12px",
                  cursor: isExporting ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                {isExporting ? (
                  <>
                    <div style={{ display: "flex", gap: "2px" }}>
                      <div style={{ 
                        width: "4px", 
                        height: "4px", 
                        backgroundColor: "white", 
                        borderRadius: "50%", 
                        animation: "pulse 1.5s infinite" 
                      }}></div>
                      <div style={{ 
                        width: "4px", 
                        height: "4px", 
                        backgroundColor: "white", 
                        borderRadius: "50%", 
                        animation: "pulse 1.5s infinite 0.2s" 
                      }}></div>
                      <div style={{ 
                        width: "4px", 
                        height: "4px", 
                        backgroundColor: "white", 
                        borderRadius: "50%", 
                        animation: "pulse 1.5s infinite 0.4s" 
                      }}></div>
                    </div>
                    Exporting...
                  </>
                ) : (
                  <>
                    💾 Export as {exportFormat.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
