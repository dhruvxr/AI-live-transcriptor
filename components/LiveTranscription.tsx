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

      // Skip if this text is too similar to recent entries (prevent repetition)
      const recentItems = transcript.slice(-3); // Check last 3 items
      const isDuplicate = recentItems.some(item => {
        const similarity = calculateSimilarity(cleanText.toLowerCase(), item.content.toLowerCase());
        return similarity > 0.7; // Reduced threshold for more aggressive filtering
      });

      if (isDuplicate) {
        console.log("Skipping duplicate final text:", cleanText);
        setCurrentSpeech("");
        return;
      }

      // Additional check for repetitive patterns like "testing testing testing"
      const words = cleanText.toLowerCase().split(' ');
      const uniqueWords = new Set(words);
      const repetitionRatio = words.length / uniqueWords.size;
      
      if (repetitionRatio > 3) { // If same words repeat more than 3 times on average
        console.log("Skipping repetitive text pattern:", cleanText);
        setCurrentSpeech("");
        return;
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

      // Add to transcript without merging to prevent repetition issues
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
            speaker: "AI Assistant",
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
            Please check your Azure configuration in the settings page. The
            service might not be configured correctly.
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
            title="Ask a question about what was said"
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            Ask AI
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
              <span className="text-[#6D28D9] flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce"></div>
                  <div
                    className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                Generating Answer...
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
                    className="flex gap-3 cursor-pointer hover:bg-[#1E293B] p-3 rounded-lg transition-all duration-200 border border-transparent hover:border-[#334155]"
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

                    {/* Hover indicator */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <HelpCircle className="w-4 h-4 text-[#94A3B8]" />
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
                <Card className="bg-gradient-to-r from-[#581C87]/20 to-[#7C3AED]/20 border-[#6D28D9] ml-8 shadow-lg">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Bot className="w-4 h-4 text-[#6D28D9] mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[#6D28D9]">
                            AI Answer:
                          </span>
                          <span className="text-xs text-[#94A3B8]">
                            {formatTime(item.timestamp)}
                          </span>
                          {item.confidence && (
                            <Badge
                              variant="outline"
                              className="text-xs border-[#6D28D9] text-[#6D28D9]"
                            >
                              {Math.round(item.confidence * 100)}% confidence
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
            </div>
          ))}

          {isGeneratingAnswer && (
            <Card className="bg-gradient-to-r from-[#581C87]/20 to-[#7C3AED]/20 border-[#6D28D9] ml-8 shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#6D28D9] animate-pulse" />
                  <span className="font-medium text-[#6D28D9]">
                    AI is generating an answer...
                  </span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce"></div>
                    <div
                      className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
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
        <DialogContent className="bg-[#1E293B] border-[#334155] text-white">
          <DialogHeader>
            <DialogTitle>Clarify Transcript</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Ask a question about the selected text to get more details.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <p className="text-sm font-semibold mb-2">Selected Text:</p>
            <blockquote className="border-l-2 border-[#3B82F6] pl-3 italic text-[#F8FAFC]">
              {selectedTranscriptForClarification?.content}
            </blockquote>
          </div>
          <div className="space-y-2">
            <Input
              placeholder="e.g., 'Explain this in simpler terms.'"
              value={clarificationQuestion}
              onChange={(e) => setClarificationQuestion(e.target.value)}
              className="bg-[#0F172A] border-[#334155] text-white"
            />
          </div>
          {clarificationAnswer && (
            <div className="mt-4 p-3 bg-[#0F172A] rounded-md max-h-48 overflow-y-auto">
              <p className="text-sm">{clarificationAnswer}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={handleClarificationRequest}
              disabled={isGeneratingClarification}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isGeneratingClarification ? "Generating..." : "Ask"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Question Dialog */}
      <Dialog open={isQuickQuestionOpen} onOpenChange={setIsQuickQuestionOpen}>
        <DialogContent className="bg-[#1E293B] border-[#334155] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#3B82F6]" />
              Ask AI about the conversation
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Ask a question about what was recently discussed or request
              clarification on any terms mentioned.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#F8FAFC] mb-2 block">
                Your Question
              </label>
              <Textarea
                placeholder="e.g., 'What did I mean when I said...?' or 'Can you explain the term...' or 'Summarize what we discussed about...'"
                value={quickQuestion}
                onChange={(e) => setQuickQuestion(e.target.value)}
                className="bg-[#0F172A] border-[#334155] text-white resize-none h-20"
                rows={3}
              />
            </div>

            {/* Recent context preview */}
            {transcript.length > 0 && (
              <div className="text-xs text-[#94A3B8]">
                <p className="font-medium mb-1">
                  Recent context (last few items):
                </p>
                <div className="bg-[#0F172A] p-2 rounded border border-[#334155] max-h-20 overflow-y-auto">
                  {transcript.slice(-3).map((item, index) => (
                    <p key={index} className="mb-1">
                      <span className="font-medium">{item.speaker}:</span>{" "}
                      {item.content.substring(0, 100)}
                      {item.content.length > 100 && "..."}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {quickAnswer && (
              <div>
                <label className="text-sm font-medium text-[#F8FAFC] mb-2 block">
                  AI Response
                </label>
                <div className="bg-[#0F172A] p-3 rounded border border-[#334155] max-h-48 overflow-y-auto">
                  <p className="text-sm leading-relaxed">{quickAnswer}</p>
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
              className="bg-[#3B82F6] hover:bg-[#2563EB]"
            >
              {isGeneratingQuickAnswer ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Thinking...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Ask
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
