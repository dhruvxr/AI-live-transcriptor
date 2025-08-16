import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ArrowLeft, Download, Edit3, Trash2, Calendar, Clock, MessageSquare, Bot, Search, Mic } from 'lucide-react';
import { getSessionById, updateSession, deleteSession as deleteSessionService, TranscriptionSession } from '../src/services/dataStorageService';

type NavigateFunction = (page: 'dashboard' | 'live' | 'settings' | 'sessions' | 'session-detail', sessionId?: string) => void;

interface SessionDetailProps {
  onNavigate: NavigateFunction;
  sessionId: string | null;
}

export function SessionDetail({ onNavigate, sessionId }: SessionDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [session, setSession] = useState<TranscriptionSession | null>(null);

  useEffect(() => {
    if (sessionId) {
      const sessionData = getSessionById(sessionId);
      setSession(sessionData);
      if (sessionData) {
        setEditedTitle(sessionData.title);
      }
    }
  }, [sessionId]);

  const handleDeleteSession = async () => {
    if (session && window.confirm('Are you sure you want to delete this session?')) {
      const success = deleteSessionService(session.id);
      if (success) {
        onNavigate('sessions');
      }
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#F8FAFC] mb-2">Session not found</h2>
          <Button onClick={() => onNavigate('sessions')}>Back to Sessions</Button>
        </div>
      </div>
    );
  }

  const filteredTranscript = session.transcript.filter(item =>
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTitleEdit = () => {
    if (isEditing) {
      // Save the edited title
      if (session) {
        const updatedSession = updateSession(session.id, { title: editedTitle });
        if (updatedSession) {
          setSession(updatedSession);
        }
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const formatTime = (time: string) => {
    return time;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture': return 'bg-blue-500';
      case 'meeting': return 'bg-green-500';
      case 'interview': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture': return '🎓';
      case 'meeting': return '🏢';
      case 'interview': return '🎤';
      default: return '📄';
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-[#1E293B] bg-[#0F172A]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('sessions')}
            className="text-[#F8FAFC] hover:bg-[#1E293B]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-white to-[#6D28D9] rounded-lg flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold">Session Detail</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-[#F8FAFC] hover:bg-[#1E293B]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-[#1E293B]"
            onClick={handleDeleteSession}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </header>

      {/* Session Info */}
      <div className="p-6 border-b border-[#1E293B] bg-[#1E293B]/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-xl font-semibold bg-[#0F172A] border-[#334155] text-[#F8FAFC]"
                  />
                  <Button size="sm" onClick={handleTitleEdit}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-semibold text-[#F8FAFC]">{session.title}</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleTitleEdit}
                    className="text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-4 text-sm text-[#94A3B8]">
                <Badge className={`${getTypeColor(session.type)} text-white text-xs`}>
                  {getTypeIcon(session.type)} {session.type}
                </Badge>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{session.date} at {session.startTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{session.duration}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-[#3B82F6]">{session.questionsCount}</div>
                <div className="text-xs text-[#94A3B8]">Questions</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-[#6D28D9]">{session.wordsCount.toLocaleString()}</div>
                <div className="text-xs text-[#94A3B8]">Words</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-[#10B981]">{session.transcript.filter(t => t.type === 'ai_response').length}</div>
                <div className="text-xs text-[#94A3B8]">AI Answers</div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8] w-4 h-4" />
            <Input
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder-[#94A3B8]"
            />
          </div>
        </div>
      </div>

      {/* Transcript */}
      <main className="p-6 max-w-6xl mx-auto">
        <div className="space-y-4">
          {filteredTranscript.map((item) => (
            <div key={item.id} className="space-y-2">
              {item.type === 'speech' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {item.speaker?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#F8FAFC]">{item.speaker}:</span>
                      <span className="text-xs text-[#94A3B8]">{formatTime(item.timestamp)}</span>
                    </div>
                    <p className="text-[#F8FAFC] leading-relaxed">{item.content}</p>
                  </div>
                </div>
              )}

              {item.type === 'question' && (
                <Card className="bg-[#1E3A8A]/20 border-[#3B82F6] ml-4">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-[#3B82F6] mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-[#3B82F6]">Question Detected:</span>
                          <span className="text-xs text-[#94A3B8]">{formatTime(item.timestamp)}</span>
                        </div>
                        <p className="text-[#F8FAFC] leading-relaxed">{item.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {item.type === 'ai_response' && (
                <Card className="bg-[#581C87]/20 border-[#6D28D9] ml-8">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Bot className="w-5 h-5 text-[#6D28D9] mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-[#6D28D9]">AI Answer:</span>
                          <span className="text-xs text-[#94A3B8]">{formatTime(item.timestamp)}</span>
                          {item.confidence && (
                            <Badge variant="outline" className="text-xs border-[#6D28D9] text-[#6D28D9]">
                              {item.confidence}% confidence
                            </Badge>
                          )}
                        </div>
                        <p className="text-[#F8FAFC] leading-relaxed">{item.content}</p>
                        <div className="mt-2 text-xs text-[#6B7280]">
                          Generated by GPT-4
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

          {filteredTranscript.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#334155] rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <h3 className="text-[#F8FAFC] font-medium mb-2">No results found</h3>
              <p className="text-[#94A3B8]">Try searching for different terms</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}