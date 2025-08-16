import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Search, Calendar, Clock, Play, Download, Trash2, Mic, Filter } from 'lucide-react';
import { getAllSessions, deleteSession } from '../src/services/dataStorageService';

type NavigateFunction = (page: 'dashboard' | 'live' | 'settings' | 'sessions' | 'session-detail', sessionId?: string) => void;

interface PastSessionsProps {
  onNavigate: NavigateFunction;
}

interface Session {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  type: 'lecture' | 'meeting' | 'interview' | 'other';
  summary: string;
  questionsCount: number;
  wordsCount: number;
}

export function PastSessions({ onNavigate }: PastSessionsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    // Load sessions from storage on component mount
    const loadSessions = () => {
      const storedSessions = getAllSessions();
      // Convert TranscriptionSession to Session format for UI compatibility
      const formattedSessions = storedSessions.map(session => ({
        id: session.id,
        title: session.title,
        date: session.date,
        time: session.startTime,
        duration: session.duration,
        type: session.type === 'other' ? 'lecture' : session.type, // Map 'other' to 'lecture' for UI
        summary: session.summary || 'No summary available',
        questionsCount: session.questionsCount,
        wordsCount: session.wordsCount
      }));
      setSessions(formattedSessions);
    };

    loadSessions();
  }, []);

  const handleDeleteSession = async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      const success = deleteSession(sessionId);
      if (success) {
        // Refresh the sessions list
        const storedSessions = getAllSessions();
        const formattedSessions = storedSessions.map(session => ({
          id: session.id,
          title: session.title,
          date: session.date,
          time: session.startTime,
          duration: session.duration,
          type: session.type === 'other' ? 'lecture' : session.type,
          summary: session.summary || 'No summary available',
          questionsCount: session.questionsCount,
          wordsCount: session.wordsCount
        }));
        setSessions(formattedSessions);
      }
    }
  };

  const filteredSessions = sessions
    .filter(session => {
      const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          session.summary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || session.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'duration-desc':
          return parseInt(b.duration) - parseInt(a.duration);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture': return '🎓';
      case 'meeting': return '🏢';
      case 'interview': return '🎤';
      default: return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture': return 'bg-blue-500';
      case 'meeting': return 'bg-green-500';
      case 'interview': return 'bg-purple-500';
      default: return 'bg-gray-500';
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
            onClick={() => onNavigate('dashboard')}
            className="text-[#F8FAFC] hover:bg-[#1E293B]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-white to-[#6D28D9] rounded-lg flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold">Past Sessions</h1>
          </div>
        </div>
        
        <Button
          onClick={() => onNavigate('live')}
          className="bg-gradient-to-r from-[#4B5563] to-[#6D28D9] hover:from-[#374151] hover:to-[#5B21B6] text-white shadow-md"
        >
          <Mic className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </header>

      {/* Search and Filter Bar */}
      <div className="p-6 border-b border-[#1E293B] bg-[#1E293B]/50">
        <div className="flex flex-col sm:flex-row gap-4 max-w-6xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8] w-4 h-4" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder-[#94A3B8]"
            />
          </div>
          
          <div className="flex gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] bg-[#0F172A] border-[#334155] text-[#F8FAFC]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E293B] border-[#334155]">
                <SelectItem value="all" className="text-[#F8FAFC] focus:bg-[#334155]">All Types</SelectItem>
                <SelectItem value="lecture" className="text-[#F8FAFC] focus:bg-[#334155]">🎓 Lectures</SelectItem>
                <SelectItem value="meeting" className="text-[#F8FAFC] focus:bg-[#334155]">🏢 Meetings</SelectItem>
                <SelectItem value="interview" className="text-[#F8FAFC] focus:bg-[#334155]">🎤 Interviews</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] bg-[#0F172A] border-[#334155] text-[#F8FAFC]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E293B] border-[#334155]">
                <SelectItem value="date-desc" className="text-[#F8FAFC] focus:bg-[#334155]">Newest First</SelectItem>
                <SelectItem value="date-asc" className="text-[#F8FAFC] focus:bg-[#334155]">Oldest First</SelectItem>
                <SelectItem value="duration-desc" className="text-[#F8FAFC] focus:bg-[#334155]">Longest First</SelectItem>
                <SelectItem value="title-asc" className="text-[#F8FAFC] focus:bg-[#334155]">Title A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="px-6 py-3 text-sm text-[#94A3B8]">
        Showing {filteredSessions.length} of {sessions.length} sessions
      </div>

      {/* Sessions List */}
      <main className="p-6 max-w-6xl mx-auto">
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Card key={session.id} className="bg-[#1E293B] border-[#334155] hover:bg-[#334155] transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={`${getTypeColor(session.type)} text-white text-xs`}>
                        {getTypeIcon(session.type)} {session.type}
                      </Badge>
                      <div className="flex items-center gap-4 text-sm text-[#94A3B8]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{session.date} at {session.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{session.duration}</span>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-semibold text-[#F8FAFC] mb-2">{session.title}</h3>
                    <p className="text-[#94A3B8] text-sm line-clamp-2">{session.summary}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-6 text-sm text-[#94A3B8]">
                    <span>{session.questionsCount} questions</span>
                    <span>{session.wordsCount.toLocaleString()} words</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-[#334155]"
                      onClick={() => handleDeleteSession(session.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onNavigate('session-detail', session.id)}
                      className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredSessions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#334155] rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <h3 className="text-[#F8FAFC] font-medium mb-2">No sessions found</h3>
              <p className="text-[#94A3B8]">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}