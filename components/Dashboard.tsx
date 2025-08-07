import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Mic, Settings, Clock, Play } from 'lucide-react';

type NavigateFunction = (page: 'dashboard' | 'live' | 'settings' | 'sessions' | 'session-detail', sessionId?: string) => void;

interface DashboardProps {
  onNavigate: NavigateFunction;
}

const recentSessions = [
  {
    id: '1',
    title: 'Lecture on Biology',
    date: '2025-08-06',
    time: '14:30',
    duration: '1h 45m',
    type: 'lecture'
  },
  {
    id: '2',
    title: 'Team Meeting - Q3 Planning',
    date: '2025-08-05',
    time: '10:00',
    duration: '2h 15m',
    type: 'meeting'
  },
  {
    id: '3',
    title: 'Conference Keynote',
    date: '2025-08-04',
    time: '09:00',
    duration: '45m',
    type: 'event'
  },
  {
    id: '4',
    title: 'AI Ethics Discussion',
    date: '2025-08-03',
    time: '16:20',
    duration: '1h 30m',
    type: 'lecture'
  }
];

export function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-[#3B82F6] to-[#6D28D9] rounded-lg flex items-center justify-center">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold">AI Transcriptor</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('settings')}
            className="text-[#F8FAFC] hover:bg-[#1E293B]"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button
            onClick={() => onNavigate('live')}
            className="bg-gradient-to-r from-[#3B82F6] to-[#6D28D9] hover:from-[#2563EB] hover:to-[#5B21B6] text-white"
          >
            Start Live Session
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-6xl mx-auto">
        {/* Main CTA Section */}
        <div className="text-center py-12 mb-12">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-[#3B82F6] to-[#6D28D9] rounded-full flex items-center justify-center shadow-lg">
              <Mic className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-semibold mb-4">Start Your Live Transcription</h2>
            <p className="text-[#94A3B8] text-lg mb-8 max-w-2xl mx-auto">
              AI-powered live audio transcription with real-time question detection and intelligent responses for lectures, meetings, and events.
            </p>
          </div>
          
          <Button
            size="lg"
            onClick={() => onNavigate('live')}
            className="bg-gradient-to-r from-[#3B82F6] to-[#6D28D9] hover:from-[#2563EB] hover:to-[#5B21B6] text-white text-lg px-8 py-4 h-auto"
          >
            <Mic className="w-6 h-6 mr-3" />
            Start Live Session
          </Button>
        </div>

        {/* Past Sessions Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold">Recent Sessions</h3>
            <Button
              variant="outline"
              onClick={() => onNavigate('sessions')}
              className="border-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]"
            >
              View All Sessions
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentSessions.slice(0, 3).map((session) => (
              <Card key={session.id} className="bg-[#1E293B] border-[#334155] hover:bg-[#334155] transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-[#F8FAFC] mb-1">{session.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                        <Clock className="w-4 h-4" />
                        <span>{session.date} at {session.time}</span>
                      </div>
                    </div>
                    <Badge variant={session.type === 'lecture' ? 'default' : session.type === 'meeting' ? 'secondary' : 'outline'} className="text-xs">
                      {session.type === 'lecture' ? '🎓' : session.type === 'meeting' ? '🏢' : '📅'} {session.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#94A3B8]">Duration: {session.duration}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onNavigate('session-detail', session.id)}
                      className="text-[#3B82F6] hover:text-[#2563EB] hover:bg-[#334155]"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-[#3B82F6] mb-1">{recentSessions.length}</div>
              <div className="text-sm text-[#94A3B8]">Total Sessions</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-[#6D28D9] mb-1">127</div>
              <div className="text-sm text-[#94A3B8]">Questions Detected</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-[#10B981] mb-1">8.5h</div>
              <div className="text-sm text-[#94A3B8]">Total Hours</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}