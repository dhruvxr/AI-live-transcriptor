import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  ArrowLeft,
  Download,
  Edit3,
  Trash2,
  Calendar,
  Clock,
  MessageSquare,
  Bot,
  Search,
  Mic,
  User,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getSessionById,
  updateSession,
  deleteSession as deleteSessionService,
  TranscriptionSession,
  TranscriptItem,
} from "../src/services/dataStorageService";
import {
  downloadAsText,
  downloadAsPdf,
  downloadAsWord,
} from "../src/services/simpleExportService";
import { getAIResponseStream } from "../src/services/azureOpenAIService-fixed";

interface InlineChatMessage {
  id: string;
  type: "user_question" | "ai_response";
  content: string;
  timestamp: Date;
  isGenerating?: boolean;
}

type NavigateFunction = (
  page: "dashboard" | "live" | "sessions" | "session-detail",
  sessionId?: string
) => void;

interface SessionDetailProps {
  onNavigate: NavigateFunction;
  sessionId: string | null;
}

export function SessionDetail({ onNavigate, sessionId }: SessionDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [session, setSession] = useState<TranscriptionSession | null>(null);
  const [loading, setLoading] = useState(true);

  // AI interaction state
  const [activeInlineChat, setActiveInlineChat] = useState<string | null>(null);
  const [inlineChatInputs, setInlineChatInputs] = useState<{
    [key: string]: string;
  }>({});
  const [generatingInlineChats, setGeneratingInlineChats] = useState<
    Set<string>
  >(new Set());
  const [transcriptWithChats, setTranscriptWithChats] = useState<{
    [key: string]: InlineChatMessage[];
  }>({});

  useEffect(() => {
    if (sessionId) {
      const loadSession = async () => {
        try {
          setLoading(true);
          const sessionData = await getSessionById(sessionId);
          setSession(sessionData);
          if (sessionData) {
            setEditedTitle(sessionData.title);
          }
        } catch (error) {
          console.error("Failed to load session:", error);
          setSession(null);
        } finally {
          setLoading(false);
        }
      };
      loadSession();
    }
  }, [sessionId]);

  const handleDeleteSession = async () => {
    if (
      session &&
      window.confirm("Are you sure you want to delete this session?")
    ) {
      try {
        const success = await deleteSessionService(session.id);
        if (success) {
          onNavigate("sessions");
        }
      } catch (error) {
        console.error("Failed to delete session:", error);
        alert("Failed to delete session. Please try again.");
      }
    }
  };

  const handleTitleEdit = async () => {
    if (isEditing) {
      // Save the edited title
      if (session) {
        try {
          const updatedSession = await updateSession(session.id, {
            title: editedTitle,
          });
          if (updatedSession) {
            setSession(updatedSession);
          }
        } catch (error) {
          console.error("Failed to update session title:", error);
        }
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  // AI interaction handlers
  const handleTranscriptItemClick = (itemId: string) => {
    setActiveInlineChat(activeInlineChat === itemId ? null : itemId);
  };

  const handleInlineChatSubmit = async (itemId: string) => {
    const inputValue = inlineChatInputs[itemId]?.trim();
    if (!inputValue || !session) return;

    const transcriptItem = session.transcript.find(
      (item) => item.id === itemId
    );
    if (!transcriptItem) return;

    // Create user message
    const userMessage: InlineChatMessage = {
      id: Date.now().toString(),
      type: "user_question",
      content: inputValue,
      timestamp: new Date(),
    };

    // Update transcript with chat
    setTranscriptWithChats((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), userMessage],
    }));

    // Clear input and add to generating set
    setInlineChatInputs((prev) => ({ ...prev, [itemId]: "" }));
    setGeneratingInlineChats((prev) => new Set(prev).add(itemId));

    const prompt = `Based on the following statement from a saved transcript, please answer the user's question:

Original Statement: "${transcriptItem.content}"
Speaker: ${transcriptItem.speaker || "Unknown"}
Timestamp: ${new Date(transcriptItem.timestamp).toLocaleTimeString()}

User's Question: "${inputValue}"

Please provide a helpful and relevant answer based on the context of what was said.`;

    try {
      let fullResponse = "";

      await getAIResponseStream(
        prompt,
        (chunk) => {
          fullResponse += chunk;
          // Update the generating message in real-time
          setTranscriptWithChats((prev) => {
            const existingChats = prev[itemId] || [];
            const lastMessage = existingChats[existingChats.length - 1];

            if (
              lastMessage &&
              lastMessage.type === "ai_response" &&
              lastMessage.isGenerating
            ) {
              // Update existing generating message
              return {
                ...prev,
                [itemId]: [
                  ...existingChats.slice(0, -1),
                  { ...lastMessage, content: fullResponse },
                ],
              };
            } else {
              // Add new generating message
              return {
                ...prev,
                [itemId]: [
                  ...existingChats,
                  {
                    id: (Date.now() + 1).toString(),
                    type: "ai_response",
                    content: fullResponse,
                    timestamp: new Date(),
                    isGenerating: true,
                  },
                ],
              };
            }
          });
        },
        () => {
          // Finalize the response
          setTranscriptWithChats((prev) => ({
            ...prev,
            [itemId]: (prev[itemId] || []).map((msg) =>
              msg.isGenerating ? { ...msg, isGenerating: false } : msg
            ),
          }));

          setGeneratingInlineChats((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
        },
        (error) => {
          console.error("Error generating inline chat response:", error);

          // Add error message
          setTranscriptWithChats((prev) => ({
            ...prev,
            [itemId]: [
              ...(prev[itemId] || []),
              {
                id: (Date.now() + 2).toString(),
                type: "ai_response",
                content:
                  "Sorry, I encountered an error while generating the response.",
                timestamp: new Date(),
              },
            ],
          }));

          setGeneratingInlineChats((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
        }
      );
    } catch (error) {
      console.error("Error in inline chat:", error);
      setGeneratingInlineChats((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleExport = async (format: "txt" | "pdf" | "docx") => {
    if (!session) return;

    const transcriptData = {
      title: session.title,
      content: session.transcript
        .map(
          (item) =>
            `[${new Date(item.timestamp).toLocaleTimeString()}] ${
              item.speaker || "Speaker"
            }: ${item.content}`
        )
        .join("\n"),
      timestamp: new Date().toISOString(),
      duration: session.duration,
    };

    try {
      switch (format) {
        case "txt":
          await downloadAsText(transcriptData);
          break;
        case "pdf":
          await downloadAsPdf(transcriptData);
          break;
        case "docx":
          await downloadAsWord(transcriptData);
          break;
      }
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error);
      alert(`Failed to export as ${format.toUpperCase()}. Please try again.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-[#F8FAFC]">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#F8FAFC] mb-2">
            Session not found
          </h2>
          <p className="text-[#94A3B8] mb-4">
            The session you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => onNavigate("sessions")}>
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

  const filteredTranscript = session.transcript.filter((item) =>
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  const getItemTypeIcon = (type: TranscriptItem["type"]) => {
    switch (type) {
      case "question":
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case "ai_response":
        return <Bot className="w-4 h-4 text-green-400" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getItemTypeBadge = (type: TranscriptItem["type"]) => {
    switch (type) {
      case "question":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Question
          </Badge>
        );
      case "ai_response":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            AI Response
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            Speech
          </Badge>
        );
    }
  };

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
              onClick={() => onNavigate("sessions")}
              className="text-[#F8FAFC] hover:text-[#F8FAFC] hover:bg-[#334155]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div
              className="flex items-center cursor-pointer"
              onClick={() => onNavigate("dashboard")}
            >
              <img
                src="/src/assets/Logo.svg"
                alt="Choom.AI"
                className="h-16 w-auto hover:opacity-80 transition-opacity duration-200"
                title="Go to Home"
              />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-[#F8FAFC]">
                Session Details
              </h1>
              <p className="text-[#94A3B8] text-sm">
                View and manage your transcription session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("txt")}
              className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
            >
              <Download className="w-4 h-4 mr-2" />
              Export TXT
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("pdf")}
              className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("docx")}
              className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
            >
              <Download className="w-4 h-4 mr-2" />
              Export DOCX
            </Button>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="mt-6 p-6 space-y-6">
        {/* Session Info Card */}
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-xl font-semibold bg-[#0F172A] border-[#334155] text-[#F8FAFC]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleTitleEdit();
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-[#F8FAFC]">
                    {session.title}
                  </h2>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleTitleEdit}>
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteSession}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <Calendar className="w-4 h-4" />
                <span>{session.date}</span>
              </div>
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <Clock className="w-4 h-4" />
                <span>{session.duration}</span>
              </div>
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <MessageSquare className="w-4 h-4" />
                <span>{session.transcript.length} items</span>
              </div>
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <Mic className="w-4 h-4" />
                <span>{session.wordsCount.toLocaleString()} words</span>
              </div>
            </div>

            {session.summary && (
              <div className="mt-4 p-3 bg-[#0F172A] rounded-lg">
                <h3 className="font-medium text-[#F8FAFC] mb-2">Summary</h3>
                <p className="text-[#94A3B8] text-sm">{session.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#94A3B8]" />
              <Input
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#0F172A] border-[#334155] text-[#F8FAFC]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">
              Transcript ({filteredTranscript.length} items)
            </h3>

            {filteredTranscript.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-[#94A3B8] mx-auto mb-4" />
                <p className="text-[#94A3B8]">
                  {searchQuery
                    ? "No matching transcript items found."
                    : "No transcript items available."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTranscript.map((item, index) => (
                  <div key={item.id || index} className="space-y-3">
                    <div className="group relative">
                      <div
                        className="p-4 bg-[#0F172A] rounded-lg border border-[#334155] hover:border-[#6366F1]/30 transition-colors cursor-pointer"
                        onClick={() =>
                          handleTranscriptItemClick(item.id || index.toString())
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getItemTypeIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {getItemTypeBadge(item.type)}
                              <span className="text-xs text-[#94A3B8]">
                                {formatTime(item.timestamp)}
                              </span>
                              {item.speaker && (
                                <span className="text-xs text-[#94A3B8]">
                                  • {item.speaker}
                                </span>
                              )}
                              {item.confidence && (
                                <span className="text-xs text-[#94A3B8]">
                                  • {Math.round(item.confidence * 100)}%
                                  confidence
                                </span>
                              )}
                              {/* Show AI interaction indicator */}
                              {transcriptWithChats[item.id || index.toString()]
                                ?.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-[#6366F1]/20 border-[#6366F1] text-[#6366F1]"
                                >
                                  <Bot className="w-3 h-3 mr-1" />
                                  AI Chat
                                </Badge>
                              )}
                            </div>
                            <p className="text-[#F8FAFC] leading-relaxed">
                              {item.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MessageSquare className="w-4 h-4 text-[#6366F1]" />
                            <span className="text-xs text-[#6366F1]">
                              Ask AI
                            </span>
                            {activeInlineChat ===
                            (item.id || index.toString()) ? (
                              <ChevronUp className="w-4 h-4 text-[#6366F1]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#6366F1]" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Inline Chat Section */}
                      {activeInlineChat === (item.id || index.toString()) && (
                        <div className="ml-8 mt-3 space-y-3 bg-[#1E293B]/50 p-4 rounded-lg border border-[#334155]/50">
                          {/* Existing inline chat messages */}
                          {transcriptWithChats[
                            item.id || index.toString()
                          ]?.map((message) => (
                            <div
                              key={message.id}
                              className={`p-3 rounded-lg ${
                                message.type === "user_question"
                                  ? "bg-[#6366F1]/10 border border-[#6366F1]/20"
                                  : "bg-[#10B981]/10 border border-[#10B981]/20"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    message.type === "user_question"
                                      ? "bg-[#6366F1]"
                                      : "bg-[#10B981]"
                                  }`}
                                >
                                  {message.type === "user_question" ? (
                                    <span className="text-white text-xs">
                                      Q
                                    </span>
                                  ) : (
                                    <Bot className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`text-xs font-medium ${
                                        message.type === "user_question"
                                          ? "text-[#6366F1]"
                                          : "text-[#10B981]"
                                      }`}
                                    >
                                      {message.type === "user_question"
                                        ? "You asked:"
                                        : "AI responded:"}
                                    </span>
                                    <span className="text-xs text-[#94A3B8]">
                                      {message.timestamp.toLocaleTimeString()}
                                    </span>
                                    {message.isGenerating && (
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
                                    )}
                                  </div>
                                  <p className="text-[#F8FAFC] text-sm leading-relaxed">
                                    {message.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Inline chat input */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Ask AI about this statement..."
                              value={
                                inlineChatInputs[item.id || index.toString()] ||
                                ""
                              }
                              onChange={(e) =>
                                setInlineChatInputs((prev) => ({
                                  ...prev,
                                  [item.id || index.toString()]: e.target.value,
                                }))
                              }
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  handleInlineChatSubmit(
                                    item.id || index.toString()
                                  );
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-[#F8FAFC] text-sm placeholder-[#64748B] focus:border-[#6366F1] focus:outline-none"
                            />
                            <Button
                              onClick={() =>
                                handleInlineChatSubmit(
                                  item.id || index.toString()
                                )
                              }
                              disabled={
                                !inlineChatInputs[
                                  item.id || index.toString()
                                ]?.trim() ||
                                generatingInlineChats.has(
                                  item.id || index.toString()
                                )
                              }
                              size="sm"
                              className="bg-[#6366F1] hover:bg-[#5B5CF6] text-white px-3"
                            >
                              {generatingInlineChats.has(
                                item.id || index.toString()
                              ) ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
