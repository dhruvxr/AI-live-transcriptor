import React, { useState, useEffect, useRef } from "react";
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
import { getAIResponseStream } from "../src/services/aiService";
import { isQuestion } from "../src/services/questionDetectionService";

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
}

export function LiveTranscription({ onNavigate }: LiveTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [voiceAnswerEnabled, setVoiceAnswerEnabled] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentSpeech, setCurrentSpeech] = useState("");

  // State for the clarification panel
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

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, currentSpeech]);

  const handleClarificationRequest = async () => {
    if (!selectedTranscriptForClarification || !clarificationQuestion) return;

    setIsGeneratingClarification(true);
    setClarificationAnswer("");

    const prompt = `Based on the following text, please answer the user's question.
    Text: "${selectedTranscriptForClarification.content}"
    Question: "${clarificationQuestion}"`;

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

  const handleTranscriptionUpdate = (text: string, isFinal: boolean) => {
    if (isPaused) return;

    if (isFinal && text.trim()) {
      const now = new Date();
      setTranscript((prev) => {
        const lastItem = prev.length > 0 ? prev[prev.length - 1] : null;

        if (
          lastItem &&
          lastItem.type === "speech" &&
          lastItem.speaker === "Me" &&
          lastItem.timestamp.getMinutes() === now.getMinutes() &&
          lastItem.timestamp.getHours() === now.getHours() &&
          lastItem.timestamp.getFullYear() === now.getFullYear() &&
          lastItem.timestamp.getMonth() === now.getMonth() &&
          lastItem.timestamp.getDate() === now.getDate()
        ) {
          const updatedItem = {
            ...lastItem,
            content: lastItem.content + " " + text,
          };
          return [...prev.slice(0, -1), updatedItem];
        } else {
          return [
            ...prev,
            {
              id: Date.now().toString(),
              type: "speech",
              speaker: "Me",
              content: text,
              timestamp: now,
            },
          ];
        }
      });
      setCurrentSpeech("");
    } else if (!isFinal) {
      setCurrentSpeech(text);
    }
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

  const handleStartSession = () => {
    setTranscript([]);
    setIsRecording(true);
    setIsPaused(false);
    startService();
  };

  const handleStopSession = () => {
    if (isRecording) {
      stopService();
    }
    setIsRecording(false);
    onNavigate("dashboard");
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
          <img
            src="/src/assets/Logo.svg"
            alt="AI Transcriptor"
            className="h-32 w-auto mx-auto mb-8"
          />
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
            <img
              src="/src/assets/Logo.svg"
              alt="AI Transcriptor"
              className="h-16 w-auto"
            />
          </div>
          <Badge className="bg-green-500 text-white">
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
            Live
          </Badge>
        </div>

        <Button
          onClick={handleStopSession}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Square className="w-4 h-4 mr-2" />
          Stop Session
        </Button>
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
                <div
                  className="flex gap-3 cursor-pointer hover:bg-[#1E293B] p-2 rounded-lg"
                  onClick={() => {
                    setSelectedTranscriptForClarification(item);
                    setIsClarificationPanelOpen(true);
                    setClarificationAnswer("");
                    setClarificationQuestion("");
                  }}
                >
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
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
                    </div>
                    <p className="text-[#F8FAFC]">{item.content}</p>
                  </div>
                </div>
              )}

              {item.type === "question" && (
                <Card className="bg-[#1E3A8A]/20 border-[#3B82F6] ml-4">
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
                        </div>
                        <p className="text-[#F8FAFC]">{item.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {item.type === "answer" && (
                <Card className="bg-[#581C87]/20 border-[#6D28D9] ml-8">
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
                              {item.confidence}% confidence
                            </Badge>
                          )}
                        </div>
                        <p className="text-[#F8FAFC]">{item.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

          {isGeneratingAnswer && (
            <Card className="bg-[#581C87]/20 border-[#6D28D9] ml-8">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#6D28D9]" />
                  <span className="font-medium text-[#6D28D9]">
                    AI is generating an answer...
                  </span>
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

      {/* Footer Controls */}
      <footer className="p-4 border-t border-[#1E293B] bg-[#0F172A]/95 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <label htmlFor="voice-answer" className="text-sm text-[#F8FAFC]">
                Voice Answer
              </label>
              <Switch
                id="voice-answer"
                checked={voiceAnswerEnabled}
                onCheckedChange={setVoiceAnswerEnabled}
              />
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

            <Button
              variant="outline"
              className="border-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Transcript
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
