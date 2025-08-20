import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Mic, FileText, BarChart3, Clock, Eye } from "lucide-react";
import {
  getAllSessions,
  getSessionStats,
  clearAllDummyData,
} from "../src/services/dataStorageService";

type NavigateFunction = (
  page: "dashboard" | "live" | "sessions" | "session-detail",
  sessionId?: string
) => void;

interface DashboardProps {
  onNavigate: NavigateFunction;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalHours: 0,
    questionsDetected: 0,
  });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    // Clear any dummy data first (one-time cleanup)
    clearAllDummyData();

    // Load stats and recent sessions from storage
    const loadData = async () => {
      try {
        const sessionStats = await getSessionStats();
        setStats({
          totalSessions: sessionStats.totalSessions,
          totalHours: sessionStats.totalHours,
          questionsDetected: sessionStats.totalSessions > 0 ? 127 : 0, // Only show questions if there are sessions
        });

        // Get the 3 most recent sessions
        const allSessions = await getAllSessions();
        const recent = allSessions.slice(0, 3).map((session) => ({
          id: session.id,
          title: session.title,
          date: session.date,
          duration: session.duration,
          type: session.type,
          wordsCount: session.wordsCount,
        }));
        setRecentSessions(recent);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Set empty state if loading fails
        setStats({ totalSessions: 0, totalHours: 0, questionsDetected: 0 });
        setRecentSessions([]);
      }
    };

    loadData();
  }, []);

  const statsDisplay = [
    {
      label: "Total Sessions",
      value: stats.totalSessions.toString(),
      icon: FileText,
    },
    // Removed Questions Detected stat
    {
      label: "Total Hours",
      value: `${stats.totalHours}h`,
      icon: Clock,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header - Bubble Style */}
      <div className="relative">
        {/* Glow effect underneath */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-500/20 via-blue-400/10 to-transparent blur-xl -z-10"></div>
        <header className="flex items-center justify-between px-8 py-6 mx-6 mt-0 bg-gradient-to-br from-[#1E293B]/90 via-[#334155]/80 to-[#475569]/70 backdrop-blur-xl border border-[#475569]/50 rounded-b-3xl shadow-2xl shadow-blue-500/20 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center cursor-pointer" onClick={() => onNavigate("dashboard")}>
            <img
              src="/src/assets/Logo.svg"
              alt="Choom.AI"
              className="h-16 w-auto hover:opacity-80 transition-opacity duration-200"
              title="Go to Home"
            />
          </div>
        </div>
        
        <Button
          onClick={() => onNavigate("live")}
          className="bg-[#6366F1] hover:bg-[#5B5CF6] text-white px-6 py-2"
        >
          Start Live Session
        </Button>
      </header>
      </div>

      {/* Main Content */}
      <main className="mt-6 p-6 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 mt-16">
          {/* Animated Microphone Icon - Clickable */}
          <div 
            className="relative w-36 h-36 mx-auto mb-8 cursor-pointer transform transition-all duration-200 hover:scale-105"
            onClick={() => onNavigate("live")}
            title="Click to start transcription"
          >
            {/* Outer glow ring */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/20 via-[#5B5CF6]/15 to-[#4F46E5]/10 rounded-full animate-pulse" style={{animationDuration: '3s'}}></div>
            {/* Middle ring */}
            <div className="absolute inset-1 bg-gradient-to-br from-[#6366F1]/30 via-[#5B5CF6]/25 to-[#4F46E5]/15 rounded-full animate-pulse" style={{animationDelay: '0.5s', animationDuration: '3s'}}></div>
            {/* Inner main circle */}
            <div className="absolute inset-3 bg-gradient-to-br from-[#6366F1] via-[#5B5CF6] to-[#4F46E5] rounded-full flex items-center justify-center shadow-xl animate-pulse hover:from-[#5B5CF6] hover:via-[#4F46E5] hover:to-[#4338CA] transition-all duration-200" style={{animationDelay: '1s', animationDuration: '3s'}}>
              <Mic className="w-16 h-16 text-white drop-shadow-md" />
            </div>
            {/* Subtle decorative dots */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#60A5FA] rounded-full animate-ping opacity-60" style={{animationDuration: '2.5s'}}></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#3B82F6] rounded-full animate-ping opacity-60" style={{animationDelay: '1.25s', animationDuration: '2.5s'}}></div>
          </div>
          
          <h2 className="text-4xl font-bold text-[#F8FAFC] mb-4">
            Start Your Live Transcription
          </h2>
          
          <p className="text-lg text-[#94A3B8] mb-8 max-w-2xl mx-auto">
            AI-powered live audio transcription with real-time question detection and intelligent
            responses for lectures, meetings, and events.
          </p>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={() => onNavigate("live")}
              className="bg-[#6366F1] hover:bg-[#5B5CF6] text-white px-8 py-3 text-lg"
            >
              <Mic className="w-5 h-5 mr-3" />
              Start Live Session
            </Button>
            
            <Button
              onClick={() => onNavigate("sessions")}
              variant="outline"
              className="border-[#334155] text-[#F8FAFC] hover:bg-[#334155] px-8 py-3 text-lg"
            >
              <FileText className="w-5 h-5 mr-3" />
              View Past Sessions
            </Button>
          </div>
        </div>

        {/* Recent Sessions */}
        <Card className="bg-[#1E293B] border-[#334155] mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#F8FAFC] text-xl">Recent Sessions</CardTitle>
              <Button
                onClick={() => onNavigate("sessions")}
                variant="ghost"
                size="sm"
                className="text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                View All Sessions
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentSessions.length > 0 ? (
              recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-[#0F172A] rounded-lg border border-[#334155] hover:bg-[#1E293B]/50 cursor-pointer transition-colors"
                  onClick={() => onNavigate("session-detail", session.id)}
                >
                  <div className="flex items-center gap-4">
                    <Badge 
                      className={`px-2 py-1 text-xs ${
                        session.type === 'lecture' ? 'bg-[#F59E0B] text-black' :
                        session.type === 'meeting' ? 'bg-[#06B6D4] text-black' :
                        'bg-[#8B5CF6] text-white'
                      }`}
                    >
                      {session.type}
                    </Badge>
                    <div>
                      <h4 className="font-medium text-[#F8FAFC] mb-1">
                        {session.title}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                        <Clock className="w-4 h-4" />
                        <span>{session.date} at {new Date().toTimeString().slice(0,5)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#94A3B8] mb-1">Duration: {session.duration}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#6366F1] hover:text-[#5B5CF6] hover:bg-[#6366F1]/10"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#334155] rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-[#94A3B8]" />
                </div>
                <h3 className="text-[#F8FAFC] font-medium mb-2">
                  No sessions yet
                </h3>
                <p className="text-[#94A3B8] mb-4">
                  Start your first transcription session to see it here
                </p>
                <Button
                  onClick={() => onNavigate("live")}
                  size="sm"
                  className="bg-[#6366F1] hover:bg-[#5B5CF6] text-white"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {statsDisplay.map((stat, index) => (
              <Card key={index} className="bg-[#1E293B] border-[#334155]">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <p className="text-4xl font-bold text-[#6366F1] mb-2">
                      {stat.value}
                    </p>
                    <p className="text-[#94A3B8] text-sm">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
