import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Mic, FileText, Settings, BarChart3, Clock, Zap } from "lucide-react";

type NavigateFunction = (
  page: "dashboard" | "live" | "settings" | "sessions" | "session-detail",
  sessionId?: string
) => void;

interface DashboardProps {
  onNavigate: NavigateFunction;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const stats = [
    { label: "Total Sessions", value: "12", icon: FileText },
    { label: "Hours Transcribed", value: "45.5", icon: Clock },
    { label: "Words Processed", value: "125,430", icon: BarChart3 },
  ];

  const recentSessions = [
    {
      id: "1",
      title: "Biology Lecture - Cell Structure",
      date: "2025-08-06",
      duration: "1h 45m",
      type: "lecture",
      wordsCount: 4250,
    },
    {
      id: "2",
      title: "Team Meeting - Project Review",
      date: "2025-08-05",
      duration: "45m",
      type: "meeting",
      wordsCount: 2800,
    },
    {
      id: "3",
      title: "Client Interview",
      date: "2025-08-04",
      duration: "30m",
      type: "interview",
      wordsCount: 1950,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <img
              src="/src/assets/Logo.svg"
              alt="AI Transcriptor"
              className="h-16 w-auto"
            />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#F8FAFC]">
              AI Live Transcriptor
            </h1>
            <p className="text-[#94A3B8]">
              Real-time speech transcription with AI
            </p>
          </div>
        </div>

        <Button
          onClick={() => onNavigate("settings")}
          variant="ghost"
          size="sm"
          className="text-[#F8FAFC] hover:bg-[#1E293B]"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-[#F8FAFC] mb-2">
            Welcome back!
          </h2>
          <p className="text-[#94A3B8]">
            Ready to start a new transcription session?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-[#4B5563] to-[#6D28D9] border-[#334155] cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    Start Live Transcription
                  </h3>
                  <p className="text-white/80 text-sm">
                    Begin real-time speech-to-text conversion
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onNavigate("live")}
                className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border-white/30"
                variant="outline"
              >
                <Zap className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#1E293B] border-[#334155] cursor-pointer hover:scale-105 transition-transform">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#4B5563]/50 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#F8FAFC]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#F8FAFC] mb-1">
                    View Past Sessions
                  </h3>
                  <p className="text-[#94A3B8] text-sm">
                    Browse and manage your transcription history
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onNavigate("sessions")}
                className="w-full mt-4 bg-[#4B5563] hover:bg-[#374151] text-white"
              >
                Browse Sessions
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-[#1E293B] border-[#334155]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#94A3B8] text-sm">{stat.label}</p>
                    <p className="text-2xl font-semibold text-[#F8FAFC]">
                      {stat.value}
                    </p>
                  </div>
                  <stat.icon className="w-8 h-8 text-[#6D28D9]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Sessions */}
        <Card className="bg-[#1E293B] border-[#334155]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#F8FAFC]">Recent Sessions</CardTitle>
              <Button
                onClick={() => onNavigate("sessions")}
                variant="ghost"
                size="sm"
                className="text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-[#0F172A] rounded-lg border border-[#334155] hover:bg-[#1E293B]/50 cursor-pointer transition-colors"
                onClick={() => onNavigate("session-detail", session.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#4B5563]/50 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#F8FAFC]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[#F8FAFC]">
                      {session.title}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                      <span>{session.date}</span>
                      <span>•</span>
                      <span>{session.duration}</span>
                      <span>•</span>
                      <span>{session.wordsCount.toLocaleString()} words</span>
                    </div>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-[#4B5563]/30 text-[#F8FAFC] hover:bg-[#4B5563]/40"
                >
                  {session.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
