import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Switch } from './ui/switch';
import { Mic, MicOff, Square, Download, Bot, MessageSquare, ArrowLeft } from 'lucide-react';

type NavigateFunction = (page: 'dashboard' | 'live' | 'settings' | 'sessions' | 'session-detail', sessionId?: string) => void;

interface LiveTranscriptionProps {
  onNavigate: NavigateFunction;
}

interface TranscriptItem {
  id: string;
  type: 'speech' | 'question' | 'answer';
  speaker?: string;
  content: string;
  timestamp: Date;
  confidence?: number;
}

export function LiveTranscription({ onNavigate }: LiveTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [voiceAnswerEnabled, setVoiceAnswerEnabled] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([
    {
      id: '1',
      type: 'speech',
      speaker: 'Professor Smith',
      content: 'Good morning everyone. Today we\'ll be discussing the fundamentals of machine learning and how neural networks process information.',
      timestamp: new Date(Date.now() - 120000)
    },
    {
      id: '2',
      type: 'question',
      content: 'What is the difference between supervised and unsupervised learning?',
      timestamp: new Date(Date.now() - 60000)
    },
    {
      id: '3',
      type: 'answer',
      content: 'Supervised learning uses labeled training data to learn patterns, while unsupervised learning finds hidden patterns in unlabeled data. Supervised learning includes classification and regression tasks, whereas unsupervised learning includes clustering and dimensionality reduction.',
      timestamp: new Date(Date.now() - 45000),
      confidence: 87
    }
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Simulate live transcription
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const interval = setInterval(() => {
      const sampleTexts = [
        "The key concept here is that data preprocessing is crucial for model performance.",
        "Can you explain how backpropagation works in detail?",
        "Let's move on to discussing different types of activation functions.",
        "What are the advantages of using ReLU over sigmoid functions?"
      ];

      const isQuestion = Math.random() > 0.7;
      const newItem: TranscriptItem = {
        id: Date.now().toString(),
        type: isQuestion ? 'question' : 'speech',
        speaker: isQuestion ? undefined : 'Professor Smith',
        content: sampleTexts[Math.floor(Math.random() * sampleTexts.length)],
        timestamp: new Date()
      };

      setTranscript(prev => [...prev, newItem]);

      if (isQuestion) {
        setIsGeneratingAnswer(true);
        setTimeout(() => {
          const answers = [
            "Backpropagation is an algorithm used to train neural networks by calculating gradients of the loss function with respect to the network's weights, allowing the network to learn from its mistakes.",
            "ReLU (Rectified Linear Unit) activation functions are preferred over sigmoid functions because they help mitigate the vanishing gradient problem and are computationally more efficient.",
            "Data preprocessing involves cleaning, transforming, and normalizing data to make it suitable for machine learning algorithms, which significantly impacts model accuracy."
          ];

          const answerItem: TranscriptItem = {
            id: (Date.now() + 1).toString(),
            type: 'answer',
            content: answers[Math.floor(Math.random() * answers.length)],
            timestamp: new Date(),
            confidence: Math.floor(Math.random() * 20) + 80
          };

          setTranscript(prev => [...prev, answerItem]);
          setIsGeneratingAnswer(false);
        }, 2000);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const handleStopSession = () => {
    setIsRecording(false);
    onNavigate('dashboard');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-[#1E293B] bg-[#0F172A]/95 backdrop-blur-sm sticky top-0 z-10">
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
            <div className="w-8 h-8 bg-gradient-to-r from-[#3B82F6] to-[#6D28D9] rounded-lg flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold">AI Transcriptor</h1>
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
            <span className="text-[#10B981]">✅ AI Question Detected</span>
            {isGeneratingAnswer && (
              <span className="text-[#6D28D9] flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                Generating Answer...
              </span>
            )}
          </div>
          <div className="text-[#94A3B8]">
            Session Duration: {Math.floor((Date.now() - Date.now() + 300000) / 60000)}:15
          </div>
        </div>
      </div>

      {/* Main Transcript Area */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto p-4 space-y-4"
        >
          {transcript.map((item) => (
            <div key={item.id} className="space-y-2">
              {item.type === 'speech' && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-[#3B82F6] rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {item.speaker?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#F8FAFC]">{item.speaker}:</span>
                      <span className="text-xs text-[#94A3B8]">{formatTime(item.timestamp)}</span>
                    </div>
                    <p className="text-[#F8FAFC]">{item.content}</p>
                  </div>
                </div>
              )}

              {item.type === 'question' && (
                <Card className="bg-[#1E3A8A]/20 border-[#3B82F6] ml-4">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-[#3B82F6] mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[#3B82F6]">Question Detected:</span>
                          <span className="text-xs text-[#94A3B8]">{formatTime(item.timestamp)}</span>
                        </div>
                        <p className="text-[#F8FAFC]">{item.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {item.type === 'answer' && (
                <Card className="bg-[#581C87]/20 border-[#6D28D9] ml-8">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Bot className="w-4 h-4 text-[#6D28D9] mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[#6D28D9]">AI Answer:</span>
                          <span className="text-xs text-[#94A3B8]">{formatTime(item.timestamp)}</span>
                          {item.confidence && (
                            <Badge variant="outline" className="text-xs border-[#6D28D9] text-[#6D28D9]">
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
                  <span className="font-medium text-[#6D28D9]">AI is generating an answer...</span>
                  <div className="flex gap-1 ml-2">
                    <div className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-[#6D28D9] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <footer className="p-4 border-t border-[#1E293B] bg-[#0F172A]/95 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <label htmlFor="voice-answer" className="text-sm text-[#F8FAFC]">Voice Answer</label>
              <Switch
                id="voice-answer"
                checked={voiceAnswerEnabled}
                onCheckedChange={setVoiceAnswerEnabled}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsPaused(!isPaused)}
              variant={isPaused ? "default" : "outline"}
              className={isPaused ? "bg-[#3B82F6] hover:bg-[#2563EB]" : "border-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]"}
            >
              {isPaused ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
              {isPaused ? 'Resume' : 'Pause Mic'}
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