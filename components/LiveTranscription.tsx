import { useState, useEffect, useRef } from "react";
// import logoUrl from "../src/assets/Logo.svg";
import {
  startTranscription,
  stopTranscription,
} from "../src/services/azureSpeechService";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Switch } from "./ui/switch";
import {
  Mic,
  MicOff,
  Square,
  Download,
  Bot,
  MessageSquare,
  ArrowLeft,
  Clock,
  HelpCircle,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { getAIResponseStream } from "../src/services/aiService";
import {
  detectQuestionWithConfidence,
  generateQuestionResponse,
} from "../src/services/questionDetectionService";
import {
  createSession,
} from "../src/services/dataStorageService";
import {
  downloadAsText,
  downloadAsPdf,
  downloadAsWord,
  TranscriptData,
} from "../src/services/downloadService";

type NavigateFunction = (
  page: "dashboard" | "live" | "settings" | "sessions" | "session-detail",
  sessionId?: string
) => void;

interface LiveTranscriptionProps {
  onNavigate: NavigateFunction;
}

interface TranscriptItem {
  id: string;
  type: "speech" | "question" | "answer";
  speaker?: string;
  content: string;
  timestamp: Date;
  confidence?: number;
  isQuestion?: boolean;
  aiResponse?: string;
  questionConfidence?: number;
}

export function LiveTranscription({ onNavigate }: LiveTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [voiceAnswerEnabled, setVoiceAnswerEnabled] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentSpeech, setCurrentSpeech] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");

  // Recording duration tracking
  const [currentRecordingTime, setCurrentRecordingTime] = useState<string>("");

  // Enhanced AI interaction state
  const [
    selectedTranscriptForClarification,
    setSelectedTranscriptForClarification,
  ] = useState<TranscriptItem | null>(null);
  const [isClarificationPanelOpen, setIsClarificationPanelOpen] =
    useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [isGeneratingClarification, setIsGeneratingClarification] =
    useState(false);

  // Quick question state (for asking about recent content)
  const [isQuickQuestionOpen, setIsQuickQuestionOpen] = useState(false);
  const [quickQuestion, setQuickQuestion] = useState("");
  const [quickAnswer, setQuickAnswer] = useState("");
  const [isGeneratingQuickAnswer, setIsGeneratingQuickAnswer] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, currentSpeech]);

  // Duration tracking effect - show current time during recording
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording) {
      // Update current time every second
      const updateCurrentTime = () => {
        const now = new Date();
        setCurrentRecordingTime(
          now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      };

      updateCurrentTime(); // Set initial time
      interval = setInterval(updateCurrentTime, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Enhanced clarification handler
  const handleClarificationRequest = async () => {
    if (!selectedTranscriptForClarification || !clarificationQuestion) return;

    setIsGeneratingClarification(true);
    setClarificationAnswer("");

    const prompt = `Based on the following transcribed text, please answer the user's question clearly and concisely.
    
    Context: "${selectedTranscriptForClarification.content}"
    Question: "${clarificationQuestion}"
    
    Please provide a helpful explanation or clarification.`;

    getAIResponseStream(
      prompt,
      (chunk) => {
        setClarificationAnswer((prev) => prev + chunk);
      },
      () => {
        setIsGeneratingClarification(false);
      },
      (error) => {
        console.error("Error getting AI clarification:", error);
        setClarificationAnswer(
          "Sorry, I encountered an error while generating the answer."
        );
        setIsGeneratingClarification(false);
      }
    );
  };

  // Quick question handler (for asking about recent transcript)
  const handleQuickQuestion = async () => {
    if (!quickQuestion.trim()) return;

    setIsGeneratingQuickAnswer(true);
    setQuickAnswer("");

    // Get the last few transcript items for context
    const recentContext = transcript
      .slice(-5) // Last 5 items
      .map((item) => `${item.speaker}: ${item.content}`)
      .join("\n");

    const prompt = `Based on the following recent conversation transcript, please answer the user's question:
    
    Recent Context:
    ${recentContext}
    
    Question: "${quickQuestion}"
    
    Please provide a helpful answer based on what was recently discussed.`;

    getAIResponseStream(
      prompt,
      (chunk) => {
        setQuickAnswer((prev) => prev + chunk);
      },
      () => {
        setIsGeneratingQuickAnswer(false);
      },
      (error) => {
        console.error("Error getting quick answer:", error);
        setQuickAnswer(
          "Sorry, I encountered an error while generating the answer."
        );
        setIsGeneratingQuickAnswer(false);
      }
    );
  };

  const handleTranscriptionUpdate = async (text: string, isFinal: boolean) => {
    if (isPaused) return;

    // Handle intermediate results (just for live preview)
    if (!isFinal) {
      setCurrentSpeech(text);
      return; // Don't save intermediate results to transcript
    }

    // Only process final results for the transcript
    if (isFinal && text.trim()) {
      const now = new Date();
      const cleanText = text.trim();

      // Enhanced duplicate detection
      const recentItems = transcript.slice(-5); // Check last 5 items for more context
      
      // Check for exact duplicates first
      const exactDuplicate = recentItems.some(item => 
        item.content.toLowerCase() === cleanText.toLowerCase()
      );
      
      if (exactDuplicate) {
        console.log("Skipping exact duplicate:", cleanText);
        setCurrentSpeech("");
        return;
      }

      // Check for high similarity duplicates
      const similarityDuplicate = recentItems.some(item => {
        const similarity = calculateSimilarity(cleanText.toLowerCase(), item.content.toLowerCase());
        return similarity > 0.85; // Higher threshold for better accuracy
      });

      if (similarityDuplicate) {
        console.log("Skipping similar duplicate:", cleanText);
        setCurrentSpeech("");
        return;
      }

      // Check for repetitive patterns (e.g., "testing testing testing")
      const words = cleanText.toLowerCase().split(/\s+/);
      const uniqueWords = new Set(words);
      const repetitionRatio = words.length / uniqueWords.size;
      
      if (repetitionRatio > 2.5 && words.length > 3) {
        console.log("Skipping repetitive pattern:", cleanText);
        setCurrentSpeech("");
        return;
      }

      // Skip very short or common filler words when they appear alone
      const fillerWords = ['um', 'uh', 'oh', 'ah', 'hmm', 'okay', 'ok', 'yes', 'no', 'yeah'];
      if (words.length === 1 && fillerWords.includes(words[0])) {
        console.log("Skipping filler word:", cleanText);
        setCurrentSpeech("");
        return;
      }

      // Check if this text is just a continuation/repetition of the last item
      if (recentItems.length > 0) {
        const lastItem = recentItems[recentItems.length - 1];
        const timeDiff = now.getTime() - lastItem.timestamp.getTime();
        
        // If within 2 seconds and contains similar content, might be a continuation
        if (timeDiff < 2000) {
          const combinedText = lastItem.content.toLowerCase();
          const overlap = findLongestCommonSubstring(combinedText, cleanText.toLowerCase());
          
          if (overlap.length > Math.min(combinedText.length, cleanText.length) * 0.6) {
            console.log("Skipping likely continuation/repetition:", cleanText);
            setCurrentSpeech("");
            return;
          }
        }
      }

      // Check if this is a question using enhanced detection
      const questionResult = await detectQuestionWithConfidence(cleanText);

      // Create the transcript item
      const transcriptItem: TranscriptItem = {
        id: Date.now().toString(),
        type: questionResult.isQuestion ? "question" : "speech",
        speaker: "Me",
        content: cleanText,
        timestamp: now,
        isQuestion: questionResult.isQuestion,
        questionConfidence: questionResult.confidence,
      };

      // Add to transcript
      setTranscript((prev) => [...prev, transcriptItem]);

      // If it's a question and voice answers are enabled, generate AI response
      if (questionResult.isQuestion && voiceAnswerEnabled) {
        setIsGeneratingAnswer(true);

        try {
          const aiResponseResult = await generateQuestionResponse(cleanText);

          // Add AI response to transcript
          const aiResponseItem: TranscriptItem = {
            id: (Date.now() + 1).toString(),
            type: "answer",
            speaker: "GPT-4o",
            content: aiResponseResult.response,
            timestamp: new Date(),
            confidence: aiResponseResult.confidence,
          };

          setTranscript((prev) => [...prev, aiResponseItem]);
        } catch (error) {
          console.error("Error generating AI response:", error);
        } finally {
          setIsGeneratingAnswer(false);
        }
      }

      setCurrentSpeech("");
    }
  };

  // Helper function to calculate text similarity
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Helper function to find longest common substring
  const findLongestCommonSubstring = (str1: string, str2: string): string => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    let maxLength = 0;
    let endPos = 0;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          if (dp[i][j] > maxLength) {
            maxLength = dp[i][j];
            endPos = i;
          }
        }
      }
    }
    
    return str1.substring(endPos - maxLength, endPos);
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

  const handleTranscriptionError = (errorMessage: string) => {
    setError(errorMessage);
    setIsRecording(false);
  };

  const startService = () => {
    setError(null);
    // A new final transcript segment will be created on each start.
    startTranscription(handleTranscriptionUpdate, handleTranscriptionError);
  };

  const stopService = () => {
    stopTranscription();
  };

  const handleStartSession = async () => {
    setTranscript([]);
    setIsRecording(true);
    setIsPaused(false);
    setCurrentRecordingTime(
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );

    // Create a new session
    const title =
      sessionTitle ||
      `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    try {
      const session = createSession({
        title,
        date: new Date().toISOString().split("T")[0],
        startTime: new Date().toLocaleTimeString(),
        duration: "0m",
        type: "other",
        transcript: [],
      });
      setCurrentSessionId(session.id);
    } catch (error) {
      console.error("Error creating session:", error);
    }

    startService();
  };

  const handleStopSession = async () => {
    if (isRecording) {
      stopService();
    }

    setIsRecording(false);

    // Save the session if we have content
    if (currentSessionId && transcript.length > 0) {
      try {
        // Update the session with the transcript data and final duration
        // This would typically update the session in your data storage
        console.log(
          "Session completed with transcript items:",
          transcript.length
        );
      } catch (error) {
        console.error("Error saving session:", error);
      }
    }

    setCurrentSessionId(null);
  };

  const togglePauseResume = () => {
    const willPause = !isPaused;
    setIsPaused(willPause);
    if (willPause) {
      stopService();
    } else {
      startService();
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopService();
      }
    };
  }, [isRecording]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleExportAsText = () => {
    if (transcript.length === 0) {
      alert("No transcript data to export");
      return;
    }

    const transcriptData: TranscriptData = {
      title: sessionTitle || `Transcript ${new Date().toLocaleDateString()}`,
      content: transcript.map(item => 
        `[${formatTime(item.timestamp)}] ${item.content}`
      ).join('\n'),
      timestamp: new Date().toISOString(),
      duration: calculateDuration(),
    };

    downloadAsText(transcriptData);
  };

  const handleExportAsPdf = () => {
    if (transcript.length === 0) {
      alert("No transcript data to export");
      return;
    }

    const transcriptData: TranscriptData = {
      title: sessionTitle || `Transcript ${new Date().toLocaleDateString()}`,
      content: transcript.map(item => 
        `[${formatTime(item.timestamp)}] ${item.content}`
      ).join('\n'),
      timestamp: new Date().toISOString(),
      duration: calculateDuration(),
    };

    downloadAsPdf(transcriptData);
  };

  const handleExportAsWord = async () => {
    if (transcript.length === 0) {
      alert("No transcript data to export");
      return;
    }

    const transcriptData: TranscriptData = {
      title: sessionTitle || `Transcript ${new Date().toLocaleDateString()}`,
      content: transcript.map(item => 
        `[${formatTime(item.timestamp)}] ${item.content}`
      ).join('\n'),
      timestamp: new Date().toISOString(),
      duration: calculateDuration(),
    };

    await downloadAsWord(transcriptData);
  };

  const calculateDuration = (): string => {
    if (transcript.length === 0) return "0m";

    const startTime = transcript[0]?.timestamp;
    const endTime = transcript[transcript.length - 1]?.timestamp;

    if (!startTime || !endTime) return "0m";

    const durationMs = endTime.getTime() - startTime.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    if (minutes === 0) return `${seconds}s`;
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center">
        <div className="text-center max-w-md p-8 bg-[#1E293B] rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-500 mb-4">
            Transcription Error
          </h1>
          <p className="text-md text-[#94A3B8] mb-6">{error}</p>
          <p className="text-sm text-[#94A3B8] mb-6">
            Please check your speech service configuration in the settings page.
          </p>
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => onNavigate("settings")}
              variant="outline"
              className="border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
            >
              Go to Settings
            </Button>
            <Button
              onClick={() => {
                setError(null);
                setIsRecording(false);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isRecording) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="h-32 w-auto mx-auto mb-8 flex items-center justify-center">
            <h1 className="text-6xl font-bold text-white">🎙️</h1>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Ready to Transcribe
          </h1>
          <p className="text-lg text-[#94A3B8] mb-8">
            Press the button to start your live transcription session.
          </p>
          <Button
            onClick={handleStartSession}
            size="lg"
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Mic className="w-6 h-6 mr-2" />
            Start Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-[#1E293B] bg-[#0F172A]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("dashboard")}
            className="text-[#F8FAFC] hover:bg-[#1E293B]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center">
            <div className="h-16 w-auto flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                🎙️ AI Transcriptor
              </span>
            </div>
          </div>
          <Badge className="bg-green-500 text-white">
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
            Live
          </Badge>

          {/* Recording Time */}
          <div className="flex items-center gap-2 px-3 py-1 bg-[#1E293B] rounded-md">
            <Clock className="w-4 h-4 text-[#94A3B8]" />
            <span className="text-white font-mono text-sm">
              {currentRecordingTime}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Question Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQuickQuestionOpen(true)}
            disabled={transcript.length === 0}
            className="border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
            title="Ask GPT-4o a question about what was said"
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            Ask GPT-4o
          </Button>

          <Button
            onClick={handleStopSession}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop Session
          </Button>
        </div>
      </header>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-[#1E293B] border-b border-[#334155]">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {isPaused ? (
              <span className="text-yellow-400 flex items-center gap-2">
                <MicOff className="w-4 h-4" /> Paused
              </span>
            ) : (
              <span className="text-[#10B981] flex items-center gap-2">
                <Mic className="w-4 h-4" /> Recording
              </span>
            )}
            {isGeneratingAnswer && (
              <span className="text-[#10B981] flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-[#10B981] rounded-full animate-bounce"></div>
                  <div
                    className="w-1 h-1 bg-[#10B981] rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-1 h-1 bg-[#10B981] rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                GPT-4o Generating Answer...
              </span>
            )}
          </div>
          <div className="text-[#94A3B8]">
            {/* Session Duration can be implemented here */}
          </div>
        </div>
      </div>

      {/* Main Transcript Area */}
      <div className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
          {transcript.length === 0 && !isPaused && (
            <div className="flex flex-col items-center justify-center h-full text-center text-[#94A3B8]">
              <Mic className="w-16 h-16 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Listening...
              </h2>
              <p>Start speaking and your words will appear here.</p>
            </div>
          )}
          {transcript.length === 0 && isPaused && (
            <div className="flex flex-col items-center justify-center h-full text-center text-[#94A3B8]">
              <MicOff className="w-16 h-16 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Paused</h2>
              <p>Press "Resume" to continue transcription.</p>
            </div>
          )}
          {transcript.map((item) => (
            <div key={item.id} className="space-y-2">
              {item.type === "speech" && (
                <div className="group relative">
                  <div
                    className="flex gap-3 cursor-pointer hover:bg-[#1E293B]/80 p-3 rounded-lg transition-all duration-200 border border-transparent hover:border-[#334155] hover:shadow-lg"
                    onClick={() => {
                      setSelectedTranscriptForClarification(item);
                      setIsClarificationPanelOpen(true);
                      setClarificationAnswer("");
                      setClarificationQuestion("");
                    }}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-[#3B82F6] to-[#1E40AF] rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 shadow-lg">
                      {item.speaker?.charAt(0) || "S"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[#F8FAFC]">
                          {item.speaker}:
                        </span>
                        <span className="text-xs text-[#94A3B8]">
                          {formatTime(item.timestamp)}
                        </span>
                        {item.confidence && (
                          <Badge
                            variant="outline"
                            className="text-xs border-[#64748B] text-[#64748B]"
                          >
                            {Math.round(item.confidence * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                      <p className="text-[#F8FAFC] leading-relaxed">
                        {item.content}
                      </p>
                    </div>

                    {/* Hover indicator with better styling */}
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 text-[#10B981]">
                      <span className="text-xs">Ask GPT-4o</span>
                      <HelpCircle className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )}

              {item.type === "question" && (
                <Card className="bg-gradient-to-r from-[#1E3A8A]/20 to-[#1E40AF]/20 border-[#3B82F6] ml-4 shadow-lg">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-[#3B82F6] mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[#3B82F6]">
                            Question Detected:
                          </span>
                          <span className="text-xs text-[#94A3B8]">
                            {formatTime(item.timestamp)}
                          </span>
                          {item.questionConfidence && (
                            <Badge
                              variant="outline"
                              className="text-xs border-[#3B82F6] text-[#3B82F6]"
                            >
                              {Math.round(item.questionConfidence * 100)}%
                              confidence
                            </Badge>
                          )}
                        </div>
                        <p className="text-[#F8FAFC] leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {item.type === "answer" && (
                <Card className="bg-gradient-to-r from-[#10B981]/10 via-[#059669]/10 to-[#047857]/10 border-[#10B981] ml-8 shadow-xl backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-[#10B981] text-sm">
                            GPT-4o Assistant
                          </span>
                          <Badge className="bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 text-xs">
                            AI
                          </Badge>
                          <span className="text-xs text-[#94A3B8]">
                            {formatTime(item.timestamp)}
                          </span>
                          {item.confidence && (
                            <Badge
                              variant="outline"
                              className="text-xs border-[#10B981]/40 text-[#10B981]"
                            >
                              {Math.round(item.confidence * 100)}% confidence
                            </Badge>
                          )}
                        </div>
                        <div className="bg-[#0F172A]/50 p-3 rounded-lg border border-[#10B981]/20">
                          <p className="text-[#F8FAFC] leading-relaxed">
                            {item.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

          {isGeneratingAnswer && (
            <Card className="bg-gradient-to-r from-[#10B981]/10 via-[#059669]/10 to-[#047857]/10 border-[#10B981] ml-8 shadow-xl backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Bot className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#10B981]">
                        GPT-4o is thinking...
                      </span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-[#10B981] rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-[#10B981] rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-[#10B981] rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-[#94A3B8] text-sm mt-1">
                      Analyzing your question and generating a response...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Clarification Dialog */}
      <Dialog
        open={isClarificationPanelOpen}
        onOpenChange={setIsClarificationPanelOpen}
      >
        <DialogContent className="bg-[#1E293B] border-[#334155] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#10B981]" />
              Ask GPT-4o for Clarification
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Ask GPT-4o a question about the selected text to get more details or clarification.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <p className="text-sm font-semibold mb-2 text-[#F8FAFC]">Selected Text:</p>
            <blockquote className="border-l-4 border-[#10B981] pl-4 py-2 bg-[#0F172A]/50 rounded-r italic text-[#F8FAFC]">
              "{selectedTranscriptForClarification?.content}"
            </blockquote>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#F8FAFC]">Your Question:</label>
            <Textarea
              placeholder="e.g., 'Explain this in simpler terms', 'What does this mean?', 'Can you elaborate on this?'"
              value={clarificationQuestion}
              onChange={(e) => setClarificationQuestion(e.target.value)}
              className="bg-[#0F172A] border-[#334155] text-white resize-none h-20"
              rows={3}
            />
          </div>
          {clarificationAnswer && (
            <div className="mt-4">
              <label className="text-sm font-medium text-[#F8FAFC] mb-2 block">GPT-4o Response:</label>
              <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-[#10B981]/20 max-h-64 overflow-y-auto">
                <p className="text-sm leading-relaxed text-[#F8FAFC]">{clarificationAnswer}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsClarificationPanelOpen(false);
                setClarificationQuestion("");
                setClarificationAnswer("");
              }}
              className="border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClarificationRequest}
              disabled={isGeneratingClarification || !clarificationQuestion.trim()}
              className="bg-[#10B981] hover:bg-[#059669]"
            >
              {isGeneratingClarification ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  GPT-4o Thinking...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Ask GPT-4o
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Question Dialog */}
      <Dialog open={isQuickQuestionOpen} onOpenChange={setIsQuickQuestionOpen}>
        <DialogContent className="bg-[#1E293B] border-[#334155] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-full flex items-center justify-center">
                <Bot className="w-3 h-3 text-white" />
              </div>
              Ask GPT-4o about the conversation
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Ask GPT-4o a question about what was recently discussed or request
              clarification on any terms mentioned.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#F8FAFC] mb-2 block">
                Your Question for GPT-4o
              </label>
              <Textarea
                placeholder="e.g., 'What did I mean when I said...?', 'Can you explain the term...?', 'Summarize what we discussed about...', 'What are the key points from our conversation?'"
                value={quickQuestion}
                onChange={(e) => setQuickQuestion(e.target.value)}
                className="bg-[#0F172A] border-[#334155] text-white resize-none h-24"
                rows={4}
              />
            </div>

            {/* Recent context preview */}
            {transcript.length > 0 && (
              <div className="text-xs text-[#94A3B8]">
                <p className="font-medium mb-2 text-[#F8FAFC]">
                  Recent context (last few items):
                </p>
                <div className="bg-[#0F172A]/50 p-3 rounded border border-[#334155]/50 max-h-24 overflow-y-auto">
                  {transcript.slice(-3).map((item, index) => (
                    <p key={index} className="mb-1 text-[#94A3B8]">
                      <span className="font-medium text-[#F8FAFC]">{item.speaker}:</span>{" "}
                      {item.content.substring(0, 120)}
                      {item.content.length > 120 && "..."}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {quickAnswer && (
              <div>
                <label className="text-sm font-medium text-[#F8FAFC] mb-2 flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-full flex items-center justify-center">
                    <Bot className="w-2 h-2 text-white" />
                  </div>
                  GPT-4o Response
                </label>
                <div className="bg-[#0F172A]/50 p-4 rounded-lg border border-[#10B981]/20 max-h-64 overflow-y-auto">
                  <p className="text-sm leading-relaxed text-[#F8FAFC]">{quickAnswer}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsQuickQuestionOpen(false);
                setQuickQuestion("");
                setQuickAnswer("");
              }}
              className="border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickQuestion}
              disabled={isGeneratingQuickAnswer || !quickQuestion.trim()}
              className="bg-[#10B981] hover:bg-[#059669]"
            >
              {isGeneratingQuickAnswer ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  GPT-4o Thinking...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Ask GPT-4o
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer Controls */}
      <footer className="p-4 border-t border-[#1E293B] bg-[#0F172A]/95 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="voice-answer"
                  className="text-sm text-[#F8FAFC]"
                >
                  Voice Answer
                </label>
                <Switch
                  id="voice-answer"
                  checked={voiceAnswerEnabled}
                  onCheckedChange={setVoiceAnswerEnabled}
                />
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="session-title"
                  className="text-sm text-[#F8FAFC]"
                >
                  Session Title:
                </label>
                <Input
                  id="session-title"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="Enter session title..."
                  className="bg-[#1E293B] border-[#334155] text-white w-64"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={togglePauseResume}
              variant={isPaused ? "default" : "outline"}
              className={
                isPaused
                  ? "bg-[#3B82F6] hover:bg-[#2563EB]"
                  : "border-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]"
              }
            >
              {isPaused ? (
                <Mic className="w-4 h-4 mr-2" />
              ) : (
                <MicOff className="w-4 h-4 mr-2" />
              )}
              {isPaused ? "Resume" : "Pause Mic"}
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={handleExportAsText}
                variant="outline"
                size="sm"
                className="border-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]"
                disabled={transcript.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                TXT
              </Button>

              <Button
                onClick={handleExportAsPdf}
                variant="outline"
                size="sm"
                className="border-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]"
                disabled={transcript.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>

              <Button
                onClick={handleExportAsWord}
                variant="outline"
                size="sm"
                className="border-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]"
                disabled={transcript.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                Word
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
