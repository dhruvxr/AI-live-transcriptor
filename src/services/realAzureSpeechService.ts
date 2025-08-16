import { config } from "../config/environment";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

interface AzureSpeechConfig {
  subscriptionKey: string;
  region: string;
  language: string;
}

interface TranscriptionResult {
  text: string;
  confidence: number;
  offset: number;
  duration: number;
}

class AzureSpeechService {
  private config: AzureSpeechConfig | null = null;
  private recognizer: any = null;
  private isRecording = false;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      // Load from environment variables first, then localStorage as fallback
      if (config.azure.speech.key && config.azure.speech.region) {
        this.config = {
          subscriptionKey: config.azure.speech.key,
          region: config.azure.speech.region,
          language: "en-US",
        };
      } else {
        // Fallback to localStorage
        const savedConfig = localStorage.getItem("azureSpeechConfig");
        if (savedConfig) {
          this.config = JSON.parse(savedConfig);
        } else {
          // Default configuration
          this.config = {
            subscriptionKey: "",
            region: "eastus",
            language: "en-US",
          };
        }
      }
    } catch (error) {
      console.error("Failed to load Azure Speech config:", error);
    }
  }

  public updateConfig(config: Partial<AzureSpeechConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...config };
      localStorage.setItem("azureSpeechConfig", JSON.stringify(this.config));
    }
  }

  public async startRecording(
    onResult: (result: TranscriptionResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    if (!this.config?.subscriptionKey) {
      onError(
        "Azure Speech Service not configured. Please set your subscription key in .env file."
      );
      return;
    }

    if (this.isRecording) {
      onError("Recording is already in progress.");
      return;
    }

    // First, always request microphone permission
    try {
      await this.requestMicrophonePermission();
    } catch (error) {
      onError(
        `Microphone access denied: ${error}. Please allow microphone access and try again.`
      );
      return;
    }

    try {
      // Priority 1: Use imported Azure Speech SDK (works in ALL browsers)
      if (SpeechSDK) {
        console.log("Using imported Azure Speech SDK for recognition");
        await this.startAzureSpeechRecognition(onResult, onError);
      }
      // Priority 2: Fallback to Web Speech API (Chrome, Edge, some others)
      else if (this.isWebSpeechSupported()) {
        console.log("Azure SDK not available, falling back to Web Speech API");
        this.startWebSpeechRecognition(onResult, onError);
      }
      // Priority 3: No speech recognition available
      else {
        const userAgent = navigator.userAgent.toLowerCase();
        const browserName = userAgent.includes("firefox")
          ? "Firefox"
          : userAgent.includes("chrome")
          ? "Chrome"
          : userAgent.includes("safari")
          ? "Safari"
          : "your browser";

        onError(
          `Speech recognition not available. Azure Speech SDK import failed and ${browserName} doesn't support Web Speech API. Please check your setup.`
        );
      }
    } catch (error) {
      onError(`Failed to initialize speech recognition: ${error}`);
    }
  }

  private async requestMicrophonePermission(): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("MediaDevices API not supported in this browser");
    }

    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  }

  private isWebSpeechSupported(): boolean {
    return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
  }

  private async startAzureSpeechRecognition(
    onResult: (result: TranscriptionResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      this.config!.subscriptionKey,
      this.config!.region
    );
    speechConfig.speechRecognitionLanguage = this.config!.language;

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    this.recognizer.recognizing = (_: any, e: any) => {
      // Log interim results but don't process them to avoid duplicates
      console.log("🔄 Interim result:", e.result.text);
      // Don't call onResult for interim results to prevent duplicates
    };

    this.recognizer.recognized = (_: any, e: any) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        console.log("✅ Final result:", e.result.text);
        onResult({
          text: e.result.text,
          confidence: 0.95, // Final results have higher confidence
          offset: e.result.offset,
          duration: e.result.duration,
        });
      }
    };

    this.recognizer.canceled = (_: any, e: any) => {
      onError(`Azure Speech recognition canceled: ${e.errorDetails}`);
      this.isRecording = false;
    };

    this.recognizer.sessionStopped = () => {
      this.isRecording = false;
    };

    this.recognizer.startContinuousRecognitionAsync(
      () => {
        this.isRecording = true;
        console.log("Azure Speech recognition started successfully");
      },
      (err: any) => {
        onError(`Failed to start Azure Speech recognition: ${err}`);
        this.isRecording = false;
      }
    );
  }

  private startWebSpeechRecognition(
    onResult: (result: TranscriptionResult) => void,
    onError: (error: string) => void
  ): void {
    // Check browser compatibility with detailed detection
    let SpeechRecognition: any = null;

    if ("webkitSpeechRecognition" in window) {
      SpeechRecognition = (window as any).webkitSpeechRecognition;
    } else if ("SpeechRecognition" in window) {
      SpeechRecognition = (window as any).SpeechRecognition;
    }

    if (!SpeechRecognition) {
      const userAgent = navigator.userAgent.toLowerCase();
      let browserInfo = "Unknown browser";

      if (userAgent.includes("chrome")) browserInfo = "Chrome";
      else if (userAgent.includes("firefox")) browserInfo = "Firefox";
      else if (userAgent.includes("safari")) browserInfo = "Safari";
      else if (userAgent.includes("edge")) browserInfo = "Edge";

      onError(
        `Web Speech API not supported in ${browserInfo}. For Firefox users: Speech recognition requires Chrome or Edge. Please try Demo Mode to see all features, or switch to Chrome/Edge for live recording.`
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = false; // Only get final results to avoid duplicates
      recognition.lang = this.config?.language || "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.isRecording = true;
        console.log("Web Speech API recognition started successfully");
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;

          // Only process final results (when interimResults is false, all results are final)
          if (text.trim() && result.isFinal !== false) {
            console.log("✅ Web Speech final result:", text);
            onResult({
              text: text,
              confidence: result[0].confidence || 0.8,
              offset: i * 1000,
              duration: 1000,
            });
          }
        }
      };

      recognition.onerror = (event: any) => {
        let errorMessage = `Web Speech API error: ${event.error}`;

        switch (event.error) {
          case "not-allowed":
            errorMessage =
              "Microphone access denied. Please click the microphone icon in your browser address bar and allow access, then try again.";
            break;
          case "no-speech":
            errorMessage =
              "No speech detected. Please speak closer to the microphone and try again.";
            break;
          case "audio-capture":
            errorMessage =
              "No microphone found. Please connect a microphone and refresh the page.";
            break;
          case "network":
            errorMessage =
              "Network error occurred. Please check your internet connection and try again.";
            break;
          case "service-not-allowed":
            errorMessage =
              "Speech service not allowed. Please enable speech recognition in your browser settings.";
            break;
          case "bad-grammar":
            errorMessage = "Grammar error. Trying to restart recognition...";
            break;
        }

        onError(errorMessage);
        this.isRecording = false;
      };

      recognition.onend = () => {
        this.isRecording = false;
        console.log("Web Speech API recognition ended");
      };

      // Start recognition directly since we already requested permissions
      recognition.start();
      this.recognizer = recognition;
    } catch (error) {
      onError(`Failed to initialize Web Speech recognition: ${error}`);
    }
  }

  public stopRecording(): void {
    if (this.recognizer && this.isRecording) {
      if (this.recognizer.stopContinuousRecognitionAsync) {
        // Azure SDK recognizer
        this.recognizer.stopContinuousRecognitionAsync();
      } else if (this.recognizer.stop) {
        // Web Speech API recognizer
        this.recognizer.stop();
      }
      this.isRecording = false;
    }
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  public getConfig(): AzureSpeechConfig | null {
    return this.config;
  }
}

export const azureSpeechService = new AzureSpeechService();
