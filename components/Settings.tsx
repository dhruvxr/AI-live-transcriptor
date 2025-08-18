import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
import { ArrowLeft, Save, Download, Upload } from "lucide-react";
import { getAzureConfig } from "../src/config/azureConfig";
import { 
  getStorageStats, 
  syncToCloud, 
  syncFromCloud, 
  exportSessions, 
  importSessions 
} from "../src/services/dataStorageService";

type NavigateFunction = (
  page: "dashboard" | "live" | "settings" | "sessions" | "session-detail",
  sessionId?: string
) => void;

interface SettingsProps {
  onNavigate: NavigateFunction;
}

export function Settings({ onNavigate }: SettingsProps) {
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [selectedVoice, setSelectedVoice] = useState("aria-female");
  const [sensitivity, setSensitivity] = useState([75]);
  const [exportFormats, setExportFormats] = useState({
    txt: true,
    docx: false,
    pdf: true,
  });

  // Storage configuration
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [connectionString, setConnectionString] = useState("");
  const [containerName, setContainerName] = useState("ai-transcriptions");
  const [usingEnvConfig, setUsingEnvConfig] = useState(false);
  const [storageStats, setStorageStats] = useState({
    local: { totalSessions: 0, totalSizeBytes: 0 },
    sync: { isEnabled: false, isCloudAvailable: false, unsyncedSessions: 0 }
  });

  // Azure OpenAI Configuration
  const [azureConfig, setAzureConfigState] = useState({
    speechKey: "",
    speechRegion: "",
    openAIApiKey: "",
    openAIEndpoint: "",
    azureOpenAIApiDeploymentName: "",
  });

  // Load existing configuration on component mount
  useEffect(() => {
    // Load Azure config
    getAzureConfig()
      .then((config) => {
        setAzureConfigState({
          speechKey: config.speechKey || "",
          speechRegion: config.speechRegion || "",
          openAIApiKey: config.openAIApiKey || "",
          openAIEndpoint: config.openAIEndpoint || "",
          azureOpenAIApiDeploymentName:
            config.azureOpenAIApiDeploymentName || "",
        });
      })
      .catch((error) => {
        console.log("No existing Azure config found:", error);
      });

    // Load storage configuration
    // Check if environment variables are configured
    const envConnectionString = import.meta.env.VITE_AZURE_BLOB_CONNECTION_STRING;
    const envContainerName = import.meta.env.VITE_AZURE_BLOB_CONTAINER_NAME || 'ai-transcriptions';
    
    if (envConnectionString) {
      // Environment variables are configured
      setCloudSyncEnabled(true);
      setConnectionString('••••••••••••••••••••'); // Show masked for security
      setContainerName(envContainerName);
      setUsingEnvConfig(true);
    } else {
      // Fallback to localStorage configuration
      const storedCloudSync = localStorage.getItem('enableCloudSync') === 'true';
      const storedConnectionString = localStorage.getItem('azureBlobConnectionString') || '';
      const storedContainerName = localStorage.getItem('azureBlobContainerName') || 'ai-transcriptions';
      
      setCloudSyncEnabled(storedCloudSync);
      setConnectionString(storedConnectionString);
      setContainerName(storedContainerName);
      setUsingEnvConfig(false);
    }

    // Load storage stats
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    try {
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const handleSave = () => {
    // Save other settings (in a real app, this would save to backend/localStorage)
    console.log("Settings saved:", {
      textToSpeechEnabled,
      selectedLanguage,
      selectedVoice,
      sensitivity: sensitivity[0],
      exportFormats,
    });

    alert(
      "Settings saved successfully! Azure configuration is managed via .env file."
    );
  };

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-[#1E293B]">
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
              src="../src/assets/Logo.svg"
              alt="AI Transcriptor"
              className="h-16 w-auto"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-[#4B5563] to-[#6D28D9] hover:from-[#374151] hover:to-[#5B21B6] text-white shadow-md"
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
              <CardTitle className="text-[#F8FAFC]">
                Audio & Voice Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label
                    htmlFor="tts-toggle"
                    className="font-medium text-[#F8FAFC]"
                  >
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
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                >
                  <SelectTrigger className="bg-[#0F172A] border-[#334155] text-[#F8FAFC]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-[#334155]">
                    <SelectItem
                      value="en-US"
                      className="text-[#F8FAFC] focus:bg-[#334155]"
                    >
                      English (US)
                    </SelectItem>
                    <SelectItem
                      value="en-GB"
                      className="text-[#F8FAFC] focus:bg-[#334155]"
                    >
                      English (UK)
                    </SelectItem>
                    <SelectItem
                      value="es-ES"
                      className="text-[#F8FAFC] focus:bg-[#334155]"
                    >
                      Spanish
                    </SelectItem>
                    <SelectItem
                      value="fr-FR"
                      className="text-[#F8FAFC] focus:bg-[#334155]"
                    >
                      French
                    </SelectItem>
                    <SelectItem
                      value="de-DE"
                      className="text-[#F8FAFC] focus:bg-[#334155]"
                    >
                      German
                    </SelectItem>
                    <SelectItem
                      value="it-IT"
                      className="text-[#F8FAFC] focus:bg-[#334155]"
                    >
                      Italian
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="font-medium text-[#F8FAFC]">
                  Voice Selection
                </label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="bg-[#0F172A] border-[#334155] text-[#F8FAFC]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-[#334155]">
                    <SelectItem
                      value="aria-female"
                      className="text-[#F8FAFC] focus:bg-[#334155]"
                    >
                      Aria (Female)
                    </SelectItem>
                    <SelectItem
                      value="guy-male"
                      className="text-[#F8FAFC] focus:bg-[#334155]"
                    >
                      Guy (Male)
                    </SelectItem>
                    <SelectItem
                      value="nova-female"
                      className="text-[#F8FAFC] focus:bg-[#334155]"
                    >
                      Nova (Female)
                    </SelectItem>
                    <SelectItem
                      value="davis-male"
                      className="text-[#F8FAFC] focus:bg-[#334155]"
                    >
                      Davis (Male)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Azure OpenAI Configuration */}
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardHeader>
              <CardTitle className="text-[#F8FAFC]">
                Azure Configuration Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#F8FAFC]">Speech Service Key</Label>
                    <div className="bg-[#334155] border border-[#475569] rounded px-3 py-2 text-[#F8FAFC]">
                      {azureConfig.speechKey
                        ? "••••••••••••••••"
                        : "Not configured"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#F8FAFC]">
                      Speech Service Region
                    </Label>
                    <div className="bg-[#334155] border border-[#475569] rounded px-3 py-2 text-[#F8FAFC]">
                      {azureConfig.speechRegion || "Not configured"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#F8FAFC]">Azure OpenAI API Key</Label>
                  <div className="bg-[#334155] border border-[#475569] rounded px-3 py-2 text-[#F8FAFC]">
                    {azureConfig.openAIApiKey
                      ? "••••••••••••••••"
                      : "Not configured"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#F8FAFC]">
                    Azure OpenAI Endpoint
                  </Label>
                  <div className="bg-[#334155] border border-[#475569] rounded px-3 py-2 text-[#F8FAFC] text-sm">
                    {azureConfig.openAIEndpoint || "Not configured"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#F8FAFC]">Deployment Name</Label>
                  <div className="bg-[#334155] border border-[#475569] rounded px-3 py-2 text-[#F8FAFC]">
                    {azureConfig.azureOpenAIApiDeploymentName ||
                      "Not configured"}
                  </div>
                </div>
              </div>

              <div className="text-sm text-[#94A3B8] p-3 bg-[#0F172A] rounded-lg">
                <p className="font-medium mb-2">Configuration via .env file:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>
                    Configuration is loaded from the .env file in the project
                    root
                  </li>
                  <li>
                    Environment variables: VITE_AZURE_SPEECH_KEY,
                    VITE_AZURE_SPEECH_REGION
                  </li>
                  <li>
                    For AI features: VITE_AZURE_OPENAI_API_KEY,
                    VITE_AZURE_OPENAI_ENDPOINT,
                    VITE_AZURE_OPENAI_API_DEPLOYMENT_NAME
                  </li>
                  <li>
                    Restart the development server after updating the .env file
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* AI Detection Settings */}
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardHeader>
              <CardTitle className="text-[#F8FAFC]">
                AI Detection Settings
              </CardTitle>
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
                    Adjust how sensitive the AI is to detecting questions in
                    speech
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
                    Current sensitivity level:{" "}
                    <span className="text-[#F8FAFC] font-medium">
                      {sensitivity[0] < 40
                        ? "Low"
                        : sensitivity[0] < 70
                        ? "Medium"
                        : "High"}
                    </span>
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {sensitivity[0] < 40
                      ? "AI will only detect very clear questions with question words."
                      : sensitivity[0] < 70
                      ? "AI will detect most questions including implied questions."
                      : "AI will detect any potential question or request for clarification."}
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
                <label className="font-medium text-[#F8FAFC]">
                  Preferred Export Formats
                </label>
                <p className="text-sm text-[#94A3B8]">
                  Select which file formats to include when exporting
                  transcripts
                </p>

                <div className="space-y-3">
                  {Object.entries({
                    txt: "Plain Text (.txt)",
                    docx: "Microsoft Word (.docx)",
                    pdf: "PDF Document (.pdf)",
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-3">
                      <Checkbox
                        id={key}
                        checked={
                          exportFormats[key as keyof typeof exportFormats]
                        }
                        onCheckedChange={(checked) =>
                          setExportFormats((prev) => ({
                            ...prev,
                            [key]: checked as boolean,
                          }))
                        }
                      />
                      <label
                        htmlFor={key}
                        className="text-[#F8FAFC] cursor-pointer"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cloud Storage Configuration */}
          <Card className="bg-[#1E293B] border-[#334155]">
            <CardHeader>
              <CardTitle className="text-[#F8FAFC]">Cloud Storage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="font-medium text-[#F8FAFC]">
                      Enable Cloud Sync
                    </label>
                    <p className="text-sm text-[#94A3B8]">
                      Sync sessions across devices using Azure Blob Storage
                    </p>
                  </div>
                  <Switch 
                    checked={cloudSyncEnabled}
                    disabled={usingEnvConfig}
                    onCheckedChange={(checked) => {
                      if (!usingEnvConfig) {
                        setCloudSyncEnabled(checked);
                        localStorage.setItem('enableCloudSync', checked.toString());
                      }
                    }}
                  />
                </div>

                <div className={`space-y-4 pl-4 border-l-2 border-[#334155] ${!cloudSyncEnabled ? 'opacity-50' : ''}`}>
                  {usingEnvConfig ? (
                    <div className="p-3 bg-[#065F46] border border-[#059669] rounded-lg">
                      <p className="text-sm text-[#D1FAE5] mb-2">
                        ✅ <strong>Configuration from .env file</strong>
                      </p>
                      <p className="text-sm text-[#A7F3D0]">
                        Azure Blob Storage is configured via environment variables.
                        Cloud sync is automatically enabled.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[#94A3B8]">
                      Configure Azure Blob Storage to enable cloud sync
                    </p>
                  )}
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-[#F8FAFC]">Connection String</Label>
                      <input
                        type="password"
                        placeholder={usingEnvConfig ? "Configured in .env file" : "DefaultEndpointsProtocol=https;AccountName=..."}
                        className="w-full bg-[#0F172A] border border-[#334155] rounded px-3 py-2 text-[#F8FAFC] placeholder-[#64748B]"
                        value={connectionString}
                        onChange={(e) => {
                          setConnectionString(e.target.value);
                          localStorage.setItem('azureBlobConnectionString', e.target.value);
                        }}
                        disabled={!cloudSyncEnabled || usingEnvConfig}
                      />
                      {usingEnvConfig && (
                        <p className="text-xs text-[#94A3B8]">
                          To change this, update VITE_AZURE_BLOB_CONNECTION_STRING in your .env file
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[#F8FAFC]">Container Name</Label>
                      <input
                        type="text"
                        placeholder={usingEnvConfig ? "Configured in .env file" : "ai-transcriptions"}
                        className="w-full bg-[#0F172A] border border-[#334155] rounded px-3 py-2 text-[#F8FAFC] placeholder-[#64748B]"
                        value={containerName}
                        onChange={(e) => {
                          setContainerName(e.target.value);
                          localStorage.setItem('azureBlobContainerName', e.target.value);
                        }}
                        disabled={!cloudSyncEnabled || usingEnvConfig}
                      />
                      {usingEnvConfig && (
                        <p className="text-xs text-[#94A3B8]">
                          To change this, update VITE_AZURE_BLOB_CONTAINER_NAME in your .env file
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        className="bg-[#4B5563] hover:bg-[#374151] text-white"
                        disabled={!cloudSyncEnabled || (!usingEnvConfig && !connectionString)}
                        onClick={async () => {
                          try {
                            await syncToCloud();
                            alert('Successfully synced to cloud!');
                            loadStorageStats();
                          } catch (error) {
                            alert('Failed to sync to cloud. Please check your configuration.');
                          }
                        }}
                      >
                        Sync to Cloud
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
                        disabled={!cloudSyncEnabled || (!usingEnvConfig && !connectionString)}
                        onClick={async () => {
                          try {
                            await syncFromCloud();
                            alert('Successfully synced from cloud!');
                            loadStorageStats();
                          } catch (error) {
                            alert('Failed to sync from cloud. Please check your configuration.');
                          }
                        }}
                      >
                        Sync from Cloud
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-[#94A3B8] p-3 bg-[#0F172A] rounded-lg">
                  <p className="font-medium mb-2">Storage Statistics:</p>
                  <ul className="space-y-1">
                    <li>• Local sessions: {storageStats.local?.totalSessions || 0}</li>
                    <li>• Storage used: {Math.round((storageStats.local?.totalSizeBytes || 0) / 1024)} KB</li>
                    <li>• Cloud sync: {storageStats.sync?.isCloudAvailable ? 'Available' : 'Not available'}</li>
                    <li>• Unsynced sessions: {storageStats.sync?.unsyncedSessions || 0}</li>
                  </ul>
                  
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm"
                      variant="outline"
                      className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
                      onClick={async () => {
                        try {
                          const data = await exportSessions();
                          const blob = new Blob([data], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `transcription-sessions-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (error) {
                          alert('Failed to export sessions.');
                        }
                      }}
                    >
                      Export Sessions
                    </Button>
                    
                    <Button 
                      size="sm"
                      variant="outline"
                      className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            try {
                              const text = await file.text();
                              const result = await importSessions(text);
                              alert(`Imported ${result.imported} sessions. ${result.errors.length} errors.`);
                              loadStorageStats();
                            } catch (error) {
                              alert('Failed to import sessions.');
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      Import Sessions
                    </Button>
                  </div>
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
                  <strong>Privacy Notice:</strong> Audio data is processed
                  locally when possible. Cloud processing is used for AI
                  features and may be subject to third-party privacy policies.
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
