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

type NavigateFunction = (
  page: "dashboard" | "live" | "settings" | "sessions" | "session-detail",
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
          console.error('Failed to load session:', error);
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
        console.error('Failed to delete session:', error);
        alert('Failed to delete session. Please try again.');
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
          console.error('Failed to update session title:', error);
        }
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleExport = async (format: 'txt' | 'pdf' | 'docx') => {
    if (!session) return;

    const transcriptData = {
      title: session.title,
      content: session.transcript.map(item => 
        `[${new Date(item.timestamp).toLocaleTimeString()}] ${item.speaker || 'Speaker'}: ${item.content}`
      ).join('\n'),
      timestamp: new Date().toISOString(),
      duration: session.duration,
    };

    try {
      switch (format) {
        case 'txt':
          await downloadAsText(transcriptData);
          break;
        case 'pdf':
          await downloadAsPdf(transcriptData);
          break;
        case 'docx':
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

  const getItemTypeIcon = (type: TranscriptItem['type']) => {
    switch (type) {
      case 'question':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'ai_response':
        return <Bot className="w-4 h-4 text-green-400" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getItemTypeBadge = (type: TranscriptItem['type']) => {
    switch (type) {
      case 'question':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Question</Badge>;
      case 'ai_response':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">AI Response</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Speech</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("sessions")}
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
          <div>
            <h1 className="text-2xl font-semibold text-[#F8FAFC]">
              Session Details
            </h1>
            <p className="text-[#94A3B8]">
              View and manage your transcription session
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('txt')}
            className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export TXT
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('docx')}
            className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export DOCX
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
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
                      if (e.key === 'Enter') {
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
                  {searchQuery ? 'No matching transcript items found.' : 'No transcript items available.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTranscript.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-4 bg-[#0F172A] rounded-lg border border-[#334155] hover:border-[#475569] transition-colors"
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
                              • {Math.round(item.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                        <p className="text-[#F8FAFC] leading-relaxed">
                          {item.content}
                        </p>
                      </div>
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
