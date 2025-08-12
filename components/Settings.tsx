import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft, Save, Mic } from 'lucide-react';

type NavigateFunction = (page: 'dashboard' | 'live' | 'settings' | 'sessions' | 'session-detail', sessionId?: string) => void;

interface SettingsProps {
  onNavigate: NavigateFunction;
}

export function Settings({ onNavigate }: SettingsProps) {
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [selectedVoice, setSelectedVoice] = useState('aria-female');
  const [sensitivity, setSensitivity] = useState([75]);
  const [exportFormats, setExportFormats] = useState({
    txt: true,
    docx: false,
    pdf: true
  });

  const handleSave = () => {
    // In a real app, this would save to backend/localStorage
    console.log('Settings saved:', {
      textToSpeechEnabled,
      selectedLanguage,
      selectedVoice,
      sensitivity: sensitivity[0],
      exportFormats
    });
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
          <div className="flex items-center">
            <img src="/src/assets/Logo.svg" alt="AI Transcriptor" className="h-16 w-auto" />
          </div>
        </div>
        
        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-[#3B82F6] to-[#6D28D9] hover:from-[#2563EB] hover:to-[#5B21B6] text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold text-[#F8FAFC] mb-8">Settings</h1>
        <div className="space-y-6">
          {/* Audio & Voice Settings */}
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardHeader>
              <CardTitle className="text-[#F8FAFC]">Audio & Voice Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label htmlFor="tts-toggle" className="font-medium text-[#F8FAFC]">
                    Text-to-Speech
                  </label>
                  <p className="text-sm text-[#94A3B8]">
                    Enable voice responses for AI-generated answers
                  </p>
                </div>
                <Switch
                  id="tts-toggle"
                  checked={textToSpeechEnabled}
                  onCheckedChange={setTextToSpeechEnabled}
                />
              </div>

              <div className="space-y-2">
                <label className="font-medium text-[#F8FAFC]">Language</label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="bg-[#0F172A] border-[#334155] text-[#F8FAFC]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-[#334155]">
                    <SelectItem value="en-US" className="text-[#F8FAFC] focus:bg-[#334155]">English (US)</SelectItem>
                    <SelectItem value="en-GB" className="text-[#F8FAFC] focus:bg-[#334155]">English (UK)</SelectItem>
                    <SelectItem value="es-ES" className="text-[#F8FAFC] focus:bg-[#334155]">Spanish</SelectItem>
                    <SelectItem value="fr-FR" className="text-[#F8FAFC] focus:bg-[#334155]">French</SelectItem>
                    <SelectItem value="de-DE" className="text-[#F8FAFC] focus:bg-[#334155]">German</SelectItem>
                    <SelectItem value="it-IT" className="text-[#F8FAFC] focus:bg-[#334155]">Italian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="font-medium text-[#F8FAFC]">Voice Selection</label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="bg-[#0F172A] border-[#334155] text-[#F8FAFC]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-[#334155]">
                    <SelectItem value="aria-female" className="text-[#F8FAFC] focus:bg-[#334155]">Aria (Female)</SelectItem>
                    <SelectItem value="guy-male" className="text-[#F8FAFC] focus:bg-[#334155]">Guy (Male)</SelectItem>
                    <SelectItem value="nova-female" className="text-[#F8FAFC] focus:bg-[#334155]">Nova (Female)</SelectItem>
                    <SelectItem value="davis-male" className="text-[#F8FAFC] focus:bg-[#334155]">Davis (Male)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* AI Detection Settings */}
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardHeader>
              <CardTitle className="text-[#F8FAFC]">AI Detection Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-[#F8FAFC]">
                      Question Detection Sensitivity
                    </label>
                    <span className="text-sm text-[#3B82F6] font-medium">
                      {sensitivity[0]}%
                    </span>
                  </div>
                  <p className="text-sm text-[#94A3B8]">
                    Adjust how sensitive the AI is to detecting questions in speech
                  </p>
                  <div className="px-3">
                    <Slider
                      value={sensitivity}
                      onValueChange={setSensitivity}
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-[#94A3B8] mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#0F172A] rounded-lg border border-[#334155]">
                  <p className="text-sm text-[#94A3B8] mb-2">
                    Current sensitivity level: <span className="text-[#F8FAFC] font-medium">
                      {sensitivity[0] < 40 ? 'Low' : sensitivity[0] < 70 ? 'Medium' : 'High'}
                    </span>
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {sensitivity[0] < 40 
                      ? 'AI will only detect very clear questions with question words.'
                      : sensitivity[0] < 70 
                      ? 'AI will detect most questions including implied questions.'
                      : 'AI will detect any potential question or request for clarification.'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Settings */}
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardHeader>
              <CardTitle className="text-[#F8FAFC]">Export Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="font-medium text-[#F8FAFC]">Preferred Export Formats</label>
                <p className="text-sm text-[#94A3B8]">
                  Select which file formats to include when exporting transcripts
                </p>
                
                <div className="space-y-3">
                  {Object.entries({
                    txt: 'Plain Text (.txt)',
                    docx: 'Microsoft Word (.docx)',
                    pdf: 'PDF Document (.pdf)'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-3">
                      <Checkbox
                        id={key}
                        checked={exportFormats[key as keyof typeof exportFormats]}
                        onCheckedChange={(checked) => 
                          setExportFormats(prev => ({ ...prev, [key]: checked as boolean }))
                        }
                      />
                      <label htmlFor={key} className="text-[#F8FAFC] cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Data */}
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardHeader>
              <CardTitle className="text-[#F8FAFC]">Privacy & Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-[#FEF3C7] border border-[#F59E0B] rounded-lg">
                <p className="text-sm text-[#92400E]">
                  <strong>Privacy Notice:</strong> Audio data is processed locally when possible. 
                  Cloud processing is used for AI features and may be subject to third-party privacy policies.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="font-medium text-[#F8FAFC]">
                      Store Sessions Locally
                    </label>
                    <p className="text-sm text-[#94A3B8]">
                      Keep transcripts on your device for privacy
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="font-medium text-[#F8FAFC]">
                      Share Analytics Data
                    </label>
                    <p className="text-sm text-[#94A3B8]">
                      Help improve AI accuracy (anonymous usage data only)
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}