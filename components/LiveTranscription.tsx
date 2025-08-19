import { useState, useEffect, useRef } from "react";
// import logoUrl from "../src/assets/Logo.svg";
import { azureSpeechService } from "../src/services/realAzureSpeechService";
import { enhancedAudioService, AudioCaptureOptions } from "../src/services/enhancedAudioService";
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
  ArrowLeft,
  Clock,
  HelpCircle,
  Send,
  Save,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { getAIResponseStream } from "../src/services/azureOpenAIService-fixed";
import {
  createSession,
} from "../src/services/dataStorageService";
import {
  downloadAsText,
  downloadAsPdf,
  downloadAsWord,
} from "../src/services/simpleExportService";

// Simple interface for transcript data
interface TranscriptData {
  title: string;
  content: string;
  timestamp: string;
  duration: string;
}

type NavigateFunction = (
  page: "dashboard" | "live" | "sessions" | "session-detail",
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
  // const [sessionTitle, setSessionTitle] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Recording duration tracking
  const [currentRecordingTime, setCurrentRecordingTime] = useState<string>("");

  // Audio capture options
  const [audioOptions, setAudioOptions] = useState<AudioCaptureOptions>({
    captureMicrophone: true,
    captureSystemAudio: false, // Default to false so users don't immediately hit system audio errors
  });

  // Browser compatibility check for system audio
  const isSystemAudioSupported = () => {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const hasGetDisplayMedia = navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia;
    
    return hasGetDisplayMedia && (isChrome || isEdge || isFirefox);
  };

  const getBrowserInfo = () => {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    
    if (isChrome) return { name: 'Chrome', supportsSystemAudio: 'full' };
    if (isEdge) return { name: 'Edge', supportsSystemAudio: 'full' };
    if (isFirefox) return { name: 'Firefox', supportsSystemAudio: 'limited' };
    return { name: 'Unknown', supportsSystemAudio: 'none' };
  };

  // Enhanced AI interaction state (preserved for future use)
  const [
    selectedTranscriptForClarification,
    // setSelectedTranscriptForClarification,
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
        console.error("Error generating clarification:", error);
        setClarificationAnswer(
          "Error generating clarification. Please check your Azure OpenAI configuration in Settings."
        );
        setIsGeneratingClarification(false);
      }
    );
    //   (error) => {
    //     console.error("Error getting AI clarification:", error);
    //     setClarificationAnswer(
    //       "Sorry, I encountered an error while generating the answer."
    //     );
    //     setIsGeneratingClarification(false);
    //   }
    // );
  };

  // Quick question handler (for asking about recent transcript)
  const handleQuickQuestion = async () => {
    if (!quickQuestion.trim()) return;

    setIsGeneratingQuickAnswer(true);
    setQuickAnswer("");

    // Temporarily disabled - AI functionality needs to be fixed
    setQuickAnswer(
      "AI quick answers are temporarily disabled. Please try again later."
    );
    setIsGeneratingQuickAnswer(false);

    // // Get the last few transcript items for context
    // const recentContext = transcript
    //   .slice(-5) // Last 5 items
    //   .map((item) => `${item.speaker}: ${item.content}`)
    //   .join("\n");

    // const prompt = `Based on the following recent conversation transcript, please answer the user's question:

    // Recent Context:
    // ${recentContext}

    // Question: "${quickQuestion}"

    // Please provide a helpful answer based on what was recently discussed.`;

    // getAIResponseStream(
    //   prompt,
    //   (chunk) => {
    //     setQuickAnswer((prev) => prev + chunk);
    //   },
    //   () => {
    //     setIsGeneratingQuickAnswer(false);
    //   },
    //   (error) => {
    //     console.error("Error getting quick answer:", error);
    //     setQuickAnswer(
    //       "Sorry, I encountered an error while generating the answer."
    //     );
    //     setIsGeneratingQuickAnswer(false);
    //   }
    // );
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
      const exactDuplicate = recentItems.some(
        (item) => item.content.toLowerCase() === cleanText.toLowerCase()
      );

      if (exactDuplicate) {
        console.log("Skipping exact duplicate:", cleanText);
        setCurrentSpeech("");
        return;
      }

      // Check for high similarity duplicates
      const similarityDuplicate = recentItems.some((item) => {
        const similarity = calculateSimilarity(
          cleanText.toLowerCase(),
          item.content.toLowerCase()
        );
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
      const fillerWords = [
        "um",
        "uh",
        "oh",
        "ah",
        "hmm",
        "okay",
        "ok",
        "yes",
        "no",
        "yeah",
      ];
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
          const overlap = findLongestCommonSubstring(
            combinedText,
            cleanText.toLowerCase()
          );

          if (
            overlap.length >
            Math.min(combinedText.length, cleanText.length) * 0.6
          ) {
            console.log("Skipping likely continuation/repetition:", cleanText);
            setCurrentSpeech("");
            return;
          }
        }
      }

      // Check if this is a question using enhanced detection
      // Temporarily disabled - question detection needs to be fixed
      const questionResult = { isQuestion: false, confidence: 0 };
      // const questionResult = await detectQuestionWithConfidence(cleanText);

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
          // Temporarily disabled - AI response generation needs to be fixed
          const aiResponseResult = {
            response: "AI responses are temporarily disabled.",
            confidence: 0,
          };
          // const aiResponseResult = await generateQuestionResponse(cleanText);

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
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

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

  const startService = async () => {
    setError(null);
    
    try {
      // Choose service based on audio capture options
      if (audioOptions.captureSystemAudio) {
        // Use enhanced audio service for system audio capture
        await enhancedAudioService.startRecording(
          audioOptions,
          (result) => {
            // Add source indicator to the transcript
            const sourceLabel = result.source === 'mixed' ? '🎤🔊' : 
                               result.source === 'system' ? '🔊' : '🎤';
            handleTranscriptionUpdate(`${sourceLabel} ${result.text}`, true);
          },
          handleTranscriptionError
        );
      } else {
        // Use regular Azure Speech Service for microphone only
        azureSpeechService.startRecording((result) => {
          handleTranscriptionUpdate(result.text, true);
        }, handleTranscriptionError);
      }
    } catch (error) {
      handleTranscriptionError(`Failed to start recording: ${error}`);
    }
  };

  const stopService = async () => {
    if (audioOptions.captureSystemAudio) {
      await enhancedAudioService.stopRecording();
    } else {
      azureSpeechService.stopRecording();
    }
  };

  const handleStartSession = async () => {
    setTranscript([]);
    setIsRecording(true);
    setIsPaused(false);
    setSessionStartTime(new Date());
    setCurrentRecordingTime(
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );

    // No automatic session creation - user must manually save
    console.log("Recording started. Use 'Save Transcript' when you want to save your session.");

    await startService();
  };

  const handleStopSession = async () => {
    if (isRecording) {
      await stopService();
    }

    setIsRecording(false);
    setSessionStartTime(null);
    
    console.log("Recording stopped. Use 'Save Transcript' to save your session.");
  };

  const togglePauseResume = async () => {
    const willPause = !isPaused;
    setIsPaused(willPause);
    if (willPause) {
      await stopService();
    } else {
      await startService();
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
      title: `Transcript ${new Date().toLocaleDateString()}`,
      content: transcript
        .map((item) => `[${formatTime(item.timestamp)}] ${item.content}`)
        .join("\n"),
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
      title: `Transcript ${new Date().toLocaleDateString()}`,
      content: transcript
        .map((item) => `[${formatTime(item.timestamp)}] ${item.content}`)
        .join("\n"),
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
      title: `Transcript ${new Date().toLocaleDateString()}`,
      content: transcript
        .map((item) => `[${formatTime(item.timestamp)}] ${item.content}`)
        .join("\n"),
      timestamp: new Date().toISOString(),
      duration: calculateDuration(),
    };

    await downloadAsWord(transcriptData);
  };

  const handleSaveTranscript = async () => {
    if (transcript.length === 0) {
      alert("No transcript data to save");
      return;
    }

    try {
      // Calculate session duration
      const currentTime = new Date();
      const startTimeObj = sessionStartTime || new Date();
      const durationMs = currentTime.getTime() - startTimeObj.getTime();
      const durationMinutes = Math.round(durationMs / 60000);
      const durationHours = Math.floor(durationMinutes / 60);
      const remainingMinutes = durationMinutes % 60;
      const durationString =
        durationHours > 0
          ? `${durationHours}h ${remainingMinutes}m`
          : `${remainingMinutes}m`;

      // Convert transcript items to the format expected by dataStorageService
      const transcriptData = transcript.map((item) => ({
        id: item.id,
        type:
          item.type === "answer"
            ? ("ai_response" as const)
            : item.type === "question"
            ? ("question" as const)
            : ("speech" as const),
        content: item.content,
        timestamp: item.timestamp.toISOString(),
        confidence: item.confidence,
        speaker: item.speaker,
      }));

      const title = `Saved Transcript ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

      // Create a new session with the current transcript
      const session = await createSession({
        title,
        date: new Date().toISOString().split("T")[0],
        startTime:
          sessionStartTime?.toLocaleTimeString() ||
          new Date().toLocaleTimeString(),
        endTime: currentTime.toLocaleTimeString(),
        duration: durationString,
        type: "other",
        transcript: transcriptData,
        summary:
          transcript.length > 0
            ? `Saved session with ${transcript.length} transcript items`
            : "Empty session",
      });

      if (session) {
        alert(`Transcript saved successfully as "${session.title}"`);
        console.log("Transcript saved as new session:", session.title);
      }
    } catch (error) {
      console.error("Error saving transcript:", error);
      alert("Failed to save transcript. Please try again.");
    }
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
    const isSystemAudioError = error.includes("System audio") || error.includes("getDisplayMedia");
    
    return (
      <div className="min-h-screen bg-[#0F172A]">
        {/* Header - Bubble Style */}
        <div className="relative">
          {/* Glow effect underneath */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-500/20 via-blue-400/10 to-transparent blur-xl -z-10"></div>
          <header className="flex items-center justify-between px-8 py-6 mx-6 mt-0 bg-gradient-to-br from-[#1E293B]/90 via-[#334155]/80 to-[#475569]/70 backdrop-blur-xl border border-[#475569]/50 rounded-b-3xl shadow-2xl shadow-blue-500/20 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("dashboard")}
              className="text-[#F8FAFC] hover:text-[#F8FAFC] hover:bg-[#334155]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center cursor-pointer" onClick={() => onNavigate("dashboard")}>
              <img
                src="/src/assets/Logo.svg"
                alt="AI Transcriptor"
                className="h-16 w-auto hover:opacity-80 transition-opacity duration-200"
                title="Go to Home"
              />
            </div>
          </div>
        </header>
        </div>

        {/* Error Content */}
        <main className="p-6 max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md p-8 bg-[#1E293B] rounded-lg shadow-lg border border-[#334155]">
              <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              
              <h1 className="text-2xl font-bold text-red-400 mb-4">
                {isSystemAudioError ? "System Audio Error" : "Transcription Error"}
              </h1>
              <p className="text-md text-[#94A3B8] mb-6">{error}</p>
              
              {isSystemAudioError ? (
                <div className="text-sm text-[#94A3B8] mb-6 space-y-3">
                  <p className="font-semibold text-[#F8FAFC]">To use system audio capture:</p>
                  <ul className="text-left space-y-1 bg-[#0F172A] p-3 rounded border border-[#334155]">
                    <li>• Use Chrome or Edge browser</li>
                    <li>• When prompted, select "Share tab audio" or "Share system audio"</li>
                    <li>• Make sure audio is enabled in the sharing dialog</li>
                    <li>• Try microphone-only mode as an alternative</li>
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-[#94A3B8] mb-6">
                  Please check your speech service configuration.
                </p>
              )}
              
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => {
                    setError(null);
                    setIsRecording(false);
                    // If it was a system audio error, disable system audio for next attempt
                    if (isSystemAudioError) {
                      setAudioOptions(prev => ({ ...prev, captureSystemAudio: false }));
                    }
                  }}
                  className="bg-[#6366F1] hover:bg-[#5B5CF6] text-white"
                >
                  {isSystemAudioError ? "Try Microphone Only" : "Try Again"}
                </Button>
                
                <Button
                  onClick={() => onNavigate("dashboard")}
                  variant="outline"
                  className="border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isRecording) {
    return (
      <div className="min-h-screen bg-[#0F172A]">
        {/* Header - Bubble Style */}
        <div className="relative">
          {/* Glow effect underneath */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-500/20 via-blue-400/10 to-transparent blur-xl -z-10"></div>
          <header className="flex items-center justify-between px-8 py-6 mx-6 mt-0 bg-gradient-to-br from-[#1E293B]/90 via-[#334155]/80 to-[#475569]/70 backdrop-blur-xl border border-[#475569]/50 rounded-b-3xl shadow-2xl shadow-blue-500/20 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("dashboard")}
              className="text-[#F8FAFC] hover:text-[#F8FAFC] hover:bg-[#334155]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center cursor-pointer" onClick={() => onNavigate("dashboard")}>
              <img
                src="/src/assets/Logo.svg"
                alt="AI Transcriptor"
                className="h-16 w-auto hover:opacity-80 transition-opacity duration-200"
                title="Go to Home"
              />
            </div>
          </div>
        </header>
        </div>

        {/* Main Content */}
        <main className="p-6 max-w-7xl mx-auto">
          {/* Hero Section - Ready to Transcribe Style */}
          <div className="text-center mb-12 mt-16">
            {/* Enhanced Microphone Icon with Animation */}
            <div className="relative w-40 h-40 mx-auto mb-8">
              {/* Outer glow ring */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/30 via-[#5B5CF6]/20 to-[#4F46E5]/10 rounded-full animate-pulse" style={{animationDuration: '3s'}}></div>
              {/* Middle ring */}
              <div className="absolute inset-2 bg-gradient-to-br from-[#6366F1]/40 via-[#5B5CF6]/30 to-[#4F46E5]/20 rounded-full animate-pulse" style={{animationDelay: '0.5s', animationDuration: '3s'}}></div>
              {/* Inner circle */}
              <div className="absolute inset-4 bg-gradient-to-br from-[#6366F1] via-[#5B5CF6] to-[#4F46E5] rounded-full flex items-center justify-center shadow-2xl animate-pulse" style={{animationDelay: '1s', animationDuration: '3s'}}>
                <Mic className="w-20 h-20 text-white drop-shadow-lg" />
              </div>
              {/* Decorative dots - blue themed */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#3B82F6] rounded-full animate-ping" style={{animationDuration: '2s'}}></div>
              <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-[#1D4ED8] rounded-full animate-ping" style={{animationDelay: '1s', animationDuration: '2s'}}></div>
              <div className="absolute top-1/2 -right-3 w-2 h-2 bg-[#60A5FA] rounded-full animate-ping" style={{animationDelay: '1.5s', animationDuration: '2s'}}></div>
            </div>
            
            <h2 className="text-4xl font-bold text-[#F8FAFC] mb-4">
              Ready to Transcribe
            </h2>
            
            <p className="text-lg text-[#94A3B8] mb-12 max-w-2xl mx-auto">
              Press the button to start your live transcription session.
            </p>

            {/* Audio Source Selection Card */}
            <div className="max-w-md mx-auto mb-8">
              <Card className="bg-[#1E293B] border-[#334155]">
                <CardContent className="p-6">
                  <h3 className="text-[#F8FAFC] font-semibold mb-4 text-center">Audio Sources</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg border border-[#334155]">
                      <div className="flex items-center gap-3">
                        <Mic className="w-5 h-5 text-[#6366F1]" />
                        <span className="text-[#F8FAFC]">Microphone</span>
                      </div>
                      <Switch
                        checked={audioOptions.captureMicrophone}
                        onCheckedChange={(checked) =>
                          setAudioOptions(prev => ({ ...prev, captureMicrophone: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg border border-[#334155]">
                      <div className="flex items-center gap-3">
                        <span className="text-[#6366F1] text-xl">🔊</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#F8FAFC]">System Audio</span>
                          {!isSystemAudioSupported() && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">
                              Not supported
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={audioOptions.captureSystemAudio}
                          disabled={!isSystemAudioSupported()}
                          onCheckedChange={(checked) =>
                            setAudioOptions(prev => ({ ...prev, captureSystemAudio: checked }))
                          }
                        />
                        {audioOptions.captureSystemAudio && isSystemAudioSupported() && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const stream = await (navigator.mediaDevices as any).getDisplayMedia({
                                  video: false,
                                  audio: true
                                });
                                stream.getTracks().forEach((track: any) => track.stop());
                                alert("✅ System audio test successful! You can now start recording with system audio.");
                              } catch (error) {
                                alert(`❌ System audio test failed: ${error}. Please use microphone-only mode.`);
                                setAudioOptions(prev => ({ ...prev, captureSystemAudio: false }));
                              }
                            }}
                            className="text-xs px-2 py-1 h-6 border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/20"
                          >
                            Test
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Audio Source Information */}
                  {audioOptions.captureSystemAudio && isSystemAudioSupported() && (
                    <div className="mt-4 p-3 bg-[#0F172A]/50 rounded-lg border border-[#6366F1]/20">
                      <div className="text-xs text-[#94A3B8] space-y-2">
                        <p className="text-[#F8FAFC] font-medium">⚠️ System audio capture requires:</p>
                        {(() => {
                          const browserInfo = getBrowserInfo();
                          if (browserInfo.name === 'Firefox') {
                            return (
                              <ul className="text-left space-y-1 ml-4">
                                <li>• Click "Allow" when prompted for screen sharing</li>
                                <li>• Select your screen or application window</li>
                                <li>• <strong>Check "Share system audio"</strong> in the dialog</li>
                                <li>• Have audio playing (music, videos, etc.)</li>
                                <li>• Note: Firefox may require video sharing enabled</li>
                              </ul>
                            );
                          } else {
                            return (
                              <ul className="text-left space-y-1 ml-4">
                                <li>• Click "Share your screen" when prompted</li>
                                <li>• Select "Share tab audio" or "Share system audio"</li>
                                <li>• Enable audio in the sharing dialog</li>
                                <li>• Have audio playing (music, videos, etc.)</li>
                              </ul>
                            );
                          }
                        })()}
                        <p className="text-[#6366F1] font-medium">
                          💡 Use the "Test" button to check compatibility with {getBrowserInfo().name}.
                        </p>
                      </div>
                    </div>
                  )}

                  {audioOptions.captureSystemAudio && !isSystemAudioSupported() && (
                    <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <p className="text-xs text-yellow-400">
                        System audio is not supported in your current browser. Please use Chrome (74+), Edge (79+), or Firefox (66+) for system audio capture.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={handleStartSession}
                size="lg"
                className="bg-[#10B981] hover:bg-[#059669] text-white px-8 py-3 text-lg"
                disabled={!audioOptions.captureMicrophone && !audioOptions.captureSystemAudio}
              >
                <Mic className="w-6 h-6 mr-3" />
                Start Session
              </Button>
              
              {!audioOptions.captureMicrophone && !audioOptions.captureSystemAudio && (
                <p className="text-sm text-red-400">
                  Please select at least one audio source
                </p>
              )}

              <Button
                onClick={handleSaveTranscript}
                variant="outline"
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white border-[#3B82F6]"
                disabled={transcript.length === 0}
                title="Save transcript to sessions"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Transcript
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* Header - Bubble Style */}
      <div className="relative">
        {/* Glow effect underneath */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-500/20 via-blue-400/10 to-transparent blur-xl -z-10"></div>
        <header className="flex items-center justify-between px-8 py-6 mx-6 mt-0 bg-gradient-to-br from-[#1E293B]/90 via-[#334155]/80 to-[#475569]/70 backdrop-blur-xl border border-[#475569]/50 rounded-b-3xl shadow-2xl shadow-blue-500/20 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("dashboard")}
            className="text-[#F8FAFC] hover:text-[#F8FAFC] hover:bg-[#334155]"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center cursor-pointer" onClick={() => onNavigate("dashboard")}>
            <img
              src="/src/assets/Logo.svg"
              alt="AI Transcriptor"
              className="h-16 w-auto hover:opacity-80 transition-opacity duration-200"
              title="Go to Home"
            />
          </div>
          <Badge className={isPaused ? "bg-yellow-500 text-white" : "bg-green-500 text-white"}>
            <div className={`w-2 h-2 bg-white rounded-full mr-2 ${isPaused ? '' : 'animate-pulse'}`}></div>
            {isPaused ? 'Paused' : 'Live'}
          </Badge>

          {/* Audio Source Indicators */}
          <div className="flex items-center gap-1">
            {audioOptions.captureMicrophone && (
              <Badge variant="outline" className="bg-[#6366F1]/20 border-[#6366F1] text-[#6366F1]">
                <Mic className="w-3 h-3 mr-1" />
                Mic
              </Badge>
            )}
            {audioOptions.captureSystemAudio && (
              <Badge variant="outline" className="bg-purple-500/20 border-purple-500 text-purple-300">
                <span className="text-xs mr-1">🔊</span>
                System
              </Badge>
            )}
          </div>

          {/* Recording Time */}
          <div className="flex items-center gap-2 px-3 py-1 bg-[#1E293B] rounded-md">
            <Clock className="w-4 h-4 text-[#94A3B8]" />
            <span className="text-white font-mono text-sm">
              {currentRecordingTime}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Question Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQuickQuestionOpen(true)}
            disabled={transcript.length === 0}
            className={`${
              transcript.length === 0 
                ? 'border-[#64748B] text-[#64748B] hover:bg-[#1E293B]/50 cursor-not-allowed' 
                : 'border-[#10B981] bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 hover:border-[#059669] shadow-lg'
            }`}
            title={transcript.length === 0 
              ? "Start speaking to ask questions about the transcript" 
              : "Ask GPT-4o a question about what was said"
            }
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
      </div>

      {/* Status Bar - Properly Separated */}
      <div className="mt-6 mx-6">
        <div className="bg-gradient-to-r from-[#334155]/60 via-[#475569]/50 to-[#334155]/60 backdrop-blur-sm rounded-2xl border border-[#64748B]/30 shadow-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              {/* Recording Status */}
              {isPaused ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F59E0B]/20 rounded-full border border-[#F59E0B]/30">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-yellow-300 font-medium">Recording Paused</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#10B981]/20 rounded-full border border-[#10B981]/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 font-medium">Recording Active</span>
                </div>
            )}
            
            {/* AI Question Detection Status */}
            {transcript.some(item => item.type === 'question') && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#3B82F6]/20 rounded-full border border-[#3B82F6]/30">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-blue-300 font-medium">AI Questions Detected</span>
              </div>
            )}
            
            {isGeneratingAnswer && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#10B981]/20 rounded-full border border-[#10B981]/30">
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
                <span className="text-[#10B981] font-medium">AI Answering...</span>
              </div>
            )}
            </div>
            <div className="px-3 py-1.5 bg-[#0F172A]/50 rounded-full border border-[#64748B]/30">
              <span className="text-[#94A3B8] font-medium">Session Duration: {currentRecordingTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Transcript Area */}
      <div className="flex-1 overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#1E293B]/20 to-[#0F172A] mt-4">
        <div ref={scrollRef} className="h-full overflow-y-auto px-6 py-4 space-y-4">
          {transcript.length === 0 && !isPaused && (
            <div className="flex flex-col items-center justify-center h-full text-center text-[#94A3B8] py-20">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 rounded-full flex items-center justify-center mb-6 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/30 to-[#8B5CF6]/30 rounded-full animate-pulse"></div>
                  <Mic className="w-12 h-12 text-[#6366F1] animate-pulse relative z-10" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                Listening...
              </h2>
              <p className="text-lg mb-6 max-w-md">Start speaking and your words will appear here in real-time.</p>
              <div className="flex items-center gap-3 px-4 py-2 bg-[#1E293B]/50 rounded-full border border-[#334155]">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-medium">Recording Active</span>
              </div>
            </div>
          )}
          {transcript.length === 0 && isPaused && (
            <div className="flex flex-col items-center justify-center h-full text-center text-[#94A3B8] py-20">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-[#F59E0B]/20 to-[#EAB308]/20 rounded-full flex items-center justify-center mb-6 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#F59E0B]/30 to-[#EAB308]/30 rounded-full"></div>
                  <MicOff className="w-12 h-12 text-[#F59E0B] relative z-10" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Paused</h2>
              <p>Press "Resume Mic" to continue transcription.</p>
              <div className="flex items-center gap-2 mt-4 text-sm">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-yellow-400">Recording Paused</span>
              </div>
            </div>
          )}
          {transcript.map((item) => (
            <div key={item.id} className="space-y-3">
              {item.type === "speech" && (
                <div className="group relative">
                  <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-[#1E293B]/80 to-[#334155]/60 backdrop-blur-sm rounded-xl border border-[#334155]/50 hover:border-[#6366F1]/30 transition-all duration-200 shadow-lg hover:shadow-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg">
                      {item.speaker?.charAt(0) || "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-[#F8FAFC] text-sm">
                          {item.speaker}:
                        </span>
                        <span className="text-xs text-[#94A3B8] bg-[#0F172A]/50 px-2 py-1 rounded-full">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-[#F8FAFC] leading-relaxed text-base">
                        {item.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {item.type === "question" && (
                <div className="bg-gradient-to-r from-[#1E3A8A]/20 to-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-xl p-5 ml-8 shadow-lg backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                      <HelpCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-[#60A5FA] text-sm">
                          Question Detected:
                        </span>
                        <span className="text-xs text-[#94A3B8] bg-[#0F172A]/50 px-2 py-1 rounded-full">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-[#F8FAFC] leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {item.type === "answer" && (
                <div className="bg-gradient-to-r from-[#0F172A]/90 to-[#1E293B]/80 border border-[#10B981]/30 rounded-xl p-5 ml-8 shadow-xl backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-[#10B981] text-sm">
                          AI Answer:
                        </span>
                        <span className="text-xs text-[#94A3B8] bg-[#0F172A]/50 px-2 py-1 rounded-full">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-[#F8FAFC] leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  </div>
                </div>
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
              Ask GPT-4o a question about the selected text to get more details
              or clarification.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <p className="text-sm font-semibold mb-2 text-[#F8FAFC]">
              Selected Text:
            </p>
            <blockquote className="border-l-4 border-[#10B981] pl-4 py-2 bg-[#0F172A]/50 rounded-r italic text-[#F8FAFC]">
              "{selectedTranscriptForClarification?.content}"
            </blockquote>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#F8FAFC]">
              Your Question:
            </label>
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
              <label className="text-sm font-medium text-[#F8FAFC] mb-2 block">
                GPT-4o Response:
              </label>
              <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-[#10B981]/20 max-h-64 overflow-y-auto">
                <p className="text-sm leading-relaxed text-[#F8FAFC]">
                  {clarificationAnswer}
                </p>
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
              disabled={
                isGeneratingClarification || !clarificationQuestion.trim()
              }
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
                      <span className="font-medium text-[#F8FAFC]">
                        {item.speaker}:
                      </span>{" "}
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
                  <p className="text-sm leading-relaxed text-[#F8FAFC]">
                    {quickAnswer}
                  </p>
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
      <footer className="relative">
        {/* Glow effect above footer */}
        <div className="absolute inset-x-0 -top-6 h-12 bg-gradient-to-t from-blue-500/10 via-blue-400/5 to-transparent blur-sm"></div>
        <div className="bg-gradient-to-r from-[#1E293B]/95 via-[#334155]/90 to-[#1E293B]/95 backdrop-blur-xl border-t border-[#475569]/50 shadow-2xl">
          <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3 px-4 py-2 bg-[#0F172A]/50 rounded-full border border-[#334155]">
                  <span className="text-sm text-[#F8FAFC] font-medium">Voice Answer</span>
                  <Switch
                    checked={voiceAnswerEnabled}
                    onCheckedChange={setVoiceAnswerEnabled}
                    className="data-[state=checked]:bg-[#6366F1]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={togglePauseResume}
                  variant={isPaused ? "default" : "outline"}
                  size="lg"
                  className={isPaused 
                    ? "bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white shadow-lg" 
                    : "border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                  }
                >
                  {isPaused ? (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Resume Mic
                    </>
                  ) : (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Pause Mic
                    </>
                  )}
                </Button>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveTranscript}
                variant="outline"
                size="sm"
                className={`${
                  transcript.length === 0 
                    ? 'text-[#64748B] bg-gray-600/20 hover:bg-gray-600/20 border-gray-600 cursor-not-allowed' 
                    : 'text-[#F8FAFC] bg-blue-600 hover:bg-blue-700 border-blue-500'
                }`}
                disabled={transcript.length === 0}
                title={transcript.length === 0 
                  ? "Start speaking to save transcript" 
                  : "Save transcript to sessions"
                }
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>

              <Button
                onClick={handleExportAsText}
                variant="outline"
                size="sm"
                className={`${
                  transcript.length === 0 
                    ? 'border-[#64748B] text-[#64748B] hover:bg-[#1E293B]/50 cursor-not-allowed' 
                    : 'border-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]'
                }`}
                disabled={transcript.length === 0}
                title={transcript.length === 0 ? "Start speaking to export transcript" : "Export as TXT file"}
              >
                <Download className="w-4 h-4 mr-1" />
                TXT
              </Button>

              <Button
                onClick={handleExportAsPdf}
                variant="outline"
                size="sm"
                className={`${
                  transcript.length === 0 
                    ? 'border-[#64748B] text-[#64748B] hover:bg-[#1E293B]/50 cursor-not-allowed' 
                    : 'border-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]'
                }`}
                disabled={transcript.length === 0}
                title={transcript.length === 0 ? "Start speaking to export transcript" : "Export as PDF file"}
              >
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>

              <Button
                onClick={handleExportAsWord}
                variant="outline"
                size="sm"
                className={`${
                  transcript.length === 0 
                    ? 'border-[#64748B] text-[#64748B] hover:bg-[#1E293B]/50 cursor-not-allowed' 
                    : 'border-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]'
                }`}
                disabled={transcript.length === 0}
                title={transcript.length === 0 ? "Start speaking to export transcript" : "Export as Word document"}
              >
                <Download className="w-4 h-4 mr-1" />
                Word
              </Button>
            </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
