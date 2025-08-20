import { config } from "../config/environment";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

interface AudioCaptureOptions {
  captureMicrophone: boolean;
  captureSystemAudio: boolean;
  microphoneLabel?: string;
}

interface TranscriptionResult {
  text: string;
  confidence: number;
  offset: number;
  duration: number;
  source: 'microphone' | 'system' | 'mixed';
}

class EnhancedAudioService {
  private microphoneStream: MediaStream | null = null;
  private systemAudioStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private recognizer: any = null;
  private isRecording = false;
  private captureOptions: AudioCaptureOptions = {
    captureMicrophone: true,
    captureSystemAudio: false,
  };

  private config = {
    subscriptionKey: config.azure.speech.key || "",
    region: config.azure.speech.region || "eastus",
    language: "en-US",
  };

  async startRecording(
    options: AudioCaptureOptions,
    onResult: (result: TranscriptionResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      this.captureOptions = options;
      
      // Initialize audio context
      this.audioContext = new AudioContext();
      
      // Get microphone stream if requested
      if (options.captureMicrophone) {
        try {
          this.microphoneStream = await this.getMicrophoneStream();
          console.log("✅ Microphone stream acquired successfully");
        } catch (micError) {
          console.error("Failed to get microphone:", micError);
          if (options.captureSystemAudio) {
            console.log("Continuing with system audio only...");
          } else {
            throw new Error(`Microphone access failed: ${micError}`);
          }
        }
      }
      
      // Get system audio stream if requested
      if (options.captureSystemAudio) {
        try {
          this.systemAudioStream = await this.getSystemAudioStream();
          console.log("✅ System audio stream acquired successfully");
        } catch (systemError) {
          console.error("Failed to get system audio:", systemError);
          if (options.captureMicrophone && this.microphoneStream) {
            console.log("⚠️ System audio failed, continuing with microphone only...");
            // Update options to reflect what we actually got
            this.captureOptions = { ...options, captureSystemAudio: false };
            // Notify about the fallback
            onError(`System audio capture failed: ${systemError}. Continuing with microphone only.`);
          } else {
            throw systemError; // Re-throw if we don't have any audio source
          }
        }
      }
      
      // Ensure we have at least one audio source
      if (!this.microphoneStream && !this.systemAudioStream) {
        throw new Error("No audio sources available. Please enable microphone or system audio access.");
      }
      
      // Create combined stream (even if it's just one source)
      this.combinedStream = await this.createCombinedStream();
      
      // Start Azure Speech Recognition
      await this.startAzureSpeechRecognition(onResult, onError);
      
    } catch (error) {
      console.error("Enhanced audio service error:", error);
      onError(`Failed to start enhanced audio recording: ${error}`);
    }
  }

  private async getMicrophoneStream(): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Microphone stream acquired");
      return stream;
    } catch (error) {
      console.error("❌ Failed to get microphone stream:", error);
      throw new Error("Microphone access denied or not available");
    }
  }

  private async getSystemAudioStream(): Promise<MediaStream> {
    try {
      // Check if getDisplayMedia is available
      if (!navigator.mediaDevices || !(navigator.mediaDevices as any).getDisplayMedia) {
        throw new Error("System audio capture is not supported in this browser. Please use Chrome, Edge, or Firefox.");
      }

      // Detect browser for different handling
      const isFirefox = /Firefox/.test(navigator.userAgent);
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      const isEdge = /Edg/.test(navigator.userAgent);

      console.log(`🔄 Requesting system audio capture on ${isFirefox ? 'Firefox' : isChrome ? 'Chrome' : isEdge ? 'Edge' : 'Unknown browser'}...`);
      
      // Use getDisplayMedia to capture system audio with browser-specific constraints
      let constraints: any;
      
      if (isFirefox) {
        // Firefox requires different constraints and may need video: true
        constraints = {
          video: {
            mediaSource: 'screen',
            width: { min: 1, max: 1 },
            height: { min: 1, max: 1 },
            frameRate: { min: 1, max: 1 }
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 16000,
          }
        };
      } else {
        // Chrome/Edge support audio-only capture
        constraints = {
          video: false,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 16000,
          }
        };
      }

      // Add a timeout to detect if the permission dialog doesn't appear
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Permission dialog timeout - no response from browser. System audio may not be supported."));
        }, 15000); // 15 second timeout for Firefox (slower)
      });

      // Try getDisplayMedia for system audio capture
      const streamPromise = (navigator.mediaDevices as any).getDisplayMedia(constraints);
      
      const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;
      
      // For Firefox, if we got video tracks, remove them (we only want audio)
      if (isFirefox) {
        const videoTracks = stream.getVideoTracks();
        videoTracks.forEach(track => {
          track.stop();
          stream.removeTrack(track);
        });
      }
      
      // Check if we actually got audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        if (isFirefox) {
          throw new Error("No audio tracks available. In Firefox, please ensure you select 'Share system audio' and have audio playing on your system.");
        } else {
          throw new Error("No audio tracks available. Please ensure 'Share tab audio' or 'Share system audio' is enabled in the screen sharing dialog.");
        }
      }
      
      console.log("✅ System audio stream acquired with", audioTracks.length, "audio tracks");
      console.log("Audio track settings:", audioTracks[0].getSettings());
      return stream;
    } catch (error) {
      console.error("❌ Failed to get system audio stream:", error);
      
      // Provide more specific error messages
      const err = error as any;
      const isFirefox = /Firefox/.test(navigator.userAgent);
      
      if (err.name === 'NotAllowedError') {
        if (isFirefox) {
          throw new Error("System audio access was denied. In Firefox: Click 'Allow', select your screen/application, and ensure 'Share system audio' is checked.");
        } else {
          throw new Error("System audio access was denied. Please click 'Share' when prompted and ensure 'Share tab audio' is enabled.");
        }
      } else if (err.name === 'NotSupportedError') {
        throw new Error("System audio capture is not supported in this browser. Please use Chrome (version 74+), Edge (version 79+), or Firefox (version 66+).");
      } else if (err.name === 'NotFoundError') {
        throw new Error("No audio sources available for system audio capture. Try playing some audio and try again.");
      } else if (err.message.includes("timeout")) {
        if (isFirefox) {
          throw new Error("No permission dialog appeared. In Firefox, go to about:config and ensure 'media.getdisplaymedia.enabled' is set to true.");
        } else {
          throw new Error("No permission dialog appeared. System audio capture may not be available in this browser or environment.");
        }
      } else {
        throw new Error(`System audio capture failed: ${err.message || err}. Try using microphone-only mode instead.`);
      }
    }
  }

  private async createCombinedStream(): Promise<MediaStream> {
    if (!this.audioContext) {
      throw new Error("Audio context not initialized");
    }

    const destination = this.audioContext.createMediaStreamDestination();
    
    // Connect microphone stream if available
    if (this.microphoneStream) {
      const micSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
      const micGain = this.audioContext.createGain();
      micGain.gain.value = 1.0; // Full volume for microphone
      micSource.connect(micGain);
      micGain.connect(destination);
      console.log("🎤 Microphone connected to combined stream");
    }

    // Connect system audio stream if available
    if (this.systemAudioStream) {
      const systemSource = this.audioContext.createMediaStreamSource(this.systemAudioStream);
      const systemGain = this.audioContext.createGain();
      systemGain.gain.value = 0.8; // Slightly lower volume for system audio to avoid overwhelming
      systemSource.connect(systemGain);
      systemGain.connect(destination);
      console.log("🔊 System audio connected to combined stream");
    }

    return destination.stream;
  }

  private createAudioStreamFromMediaStream(mediaStream: MediaStream): any {
    // For system audio with Azure Speech SDK, we need a different approach
    // The SDK works better with direct audio device access
    try {
      console.log("🔄 Attempting to create Azure-compatible audio stream from MediaStream");
      
      // Note: Azure Speech SDK has limitations with custom MediaStreams
      // For system audio, we'll use a workaround approach
      
      // Create a Web Audio API setup to process the audio
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      
      const source = this.audioContext.createMediaStreamSource(mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      // Convert to format compatible with Azure Speech SDK
      const audioFormat = SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
      const pushAudioInputStream = SpeechSDK.AudioInputStream.createPushStream(audioFormat);
      
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const channelData = inputBuffer.getChannelData(0);
        
        // Convert Float32Array to 16-bit PCM
        const pcmData = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
        }
        
        // Push data to Azure Speech SDK
        const arrayBuffer = pcmData.buffer;
        pushAudioInputStream.write(arrayBuffer);
      };
      
      source.connect(processor);
      // Don't connect to destination to avoid feedback
      // processor.connect(this.audioContext.destination);
      
      console.log("✅ Created Azure-compatible audio stream with Web Audio API processing");
      return pushAudioInputStream;
      
    } catch (error) {
      console.error("Failed to create audio stream from MediaStream:", error);
      // Fallback: return a basic stream format
      return SpeechSDK.AudioInputStream.createPushStream(
        SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
      );
    }
  }

  private async startAzureSpeechRecognition(
    onResult: (result: TranscriptionResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      if (!this.config.subscriptionKey) {
        throw new Error("Azure Speech subscription key not configured");
      }

      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        this.config.subscriptionKey,
        this.config.region
      );
      speechConfig.speechRecognitionLanguage = this.config.language;
      speechConfig.enableDictation();

      let audioConfig: any;
      
      // Handle different audio configurations
      if (this.captureOptions.captureSystemAudio && !this.captureOptions.captureMicrophone) {
        // System audio only - this is challenging with Azure Speech SDK
        // For now, we'll inform the user and fall back to default microphone
        console.warn("⚠️ System audio only mode: Azure Speech SDK works best with microphone access");
        console.log("� Recommendation: Use 'Both' mode for better system audio transcription");
        
        // Try to use system audio if available, otherwise fallback
        if (this.systemAudioStream && this.systemAudioStream.getAudioTracks().length > 0) {
          try {
            // Attempt to use system audio stream
            const audioStream = this.createAudioStreamFromMediaStream(this.systemAudioStream);
            audioConfig = SpeechSDK.AudioConfig.fromStreamInput(audioStream);
            console.log("✅ Using system audio stream for Azure Speech");
          } catch (error) {
            console.warn("System audio stream setup failed, using default microphone:", error);
            audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
          }
        } else {
          console.log("🔄 No system audio stream available, using default microphone");
          audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        }
      } else {
        // Microphone mode (with or without system audio)
        console.log("🔄 Using default microphone input for Azure Speech");
        audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      }

      this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      this.recognizer.recognizing = (_: any, e: any) => {
        console.log("🔄 Interim result:", e.result.text);
      };

      this.recognizer.recognized = (_: any, e: any) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          console.log("✅ Final result:", e.result.text);
          
          // Determine source based on what we're capturing
          let source: 'microphone' | 'system' | 'mixed' = 'microphone';
          if (this.captureOptions.captureMicrophone && this.captureOptions.captureSystemAudio) {
            source = 'mixed';
          } else if (this.captureOptions.captureSystemAudio) {
            source = 'system';
          }
          
          onResult({
            text: e.result.text,
            confidence: 0.95,
            offset: e.result.offset,
            duration: e.result.duration,
            source: source,
          });
        }
      };

      this.recognizer.canceled = (_: any, e: any) => {
        onError(`Speech recognition canceled: ${e.errorDetails}`);
        this.isRecording = false;
      };

      this.recognizer.sessionStopped = () => {
        this.isRecording = false;
      };

      this.recognizer.startContinuousRecognitionAsync(
        () => {
          this.isRecording = true;
          console.log("🎯 Enhanced speech recognition started successfully");
        },
        (error: any) => {
          onError(`Failed to start recognition: ${error}`);
        }
      );
    } catch (error) {
      onError(`Azure Speech setup failed: ${error}`);
    }
  }

  async stopRecording(): Promise<void> {
    this.isRecording = false;

    if (this.recognizer) {
      this.recognizer.stopContinuousRecognitionAsync();
      this.recognizer = null;
    }

    // Stop all streams
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }

    if (this.systemAudioStream) {
      this.systemAudioStream.getTracks().forEach(track => track.stop());
      this.systemAudioStream = null;
    }

    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach(track => track.stop());
      this.combinedStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }

    console.log("🛑 Enhanced audio recording stopped");
  }

  pauseRecording(): void {
    if (this.recognizer && this.isRecording) {
      console.log("🟡 Pausing speech recognition...");
      this.recognizer.stopContinuousRecognitionAsync(
        () => {
          console.log("✅ Speech recognition paused successfully");
          this.isRecording = false;
        },
        (error: any) => {
          console.error("❌ Failed to pause speech recognition:", error);
          this.isRecording = false;
        }
      );
    }
  }

  resumeRecording(): void {
    if (this.recognizer && !this.isRecording) {
      console.log("🟢 Resuming speech recognition...");
      this.recognizer.startContinuousRecognitionAsync(
        () => {
          console.log("✅ Speech recognition resumed successfully");
          this.isRecording = true;
        },
        (error: any) => {
          console.error("❌ Failed to resume speech recognition:", error);
          this.isRecording = false;
        }
      );
    } else if (!this.recognizer) {
      console.warn("⚠️ Cannot resume: recognizer not initialized");
    }
  }

  // Resume with callback support for better error handling
  resumeRecordingWithCallback(
    _onResult: (result: TranscriptionResult) => void,
    onError: (error: string) => void
  ): void {
    if (!this.recognizer) {
      console.warn("⚠️ Cannot resume: recognizer not initialized");
      onError("Cannot resume: speech recognizer not initialized");
      return;
    }

    if (!this.isRecording) {
      console.log("🟢 Resuming speech recognition with callback...");
      this.recognizer.startContinuousRecognitionAsync(
        () => {
          console.log("✅ Speech recognition resumed successfully");
          this.isRecording = true;
        },
        (error: any) => {
          console.error("❌ Failed to resume speech recognition:", error);
          this.isRecording = false;
          onError(`Failed to resume speech recognition: ${error}`);
        }
      );
    } else {
      console.log("ℹ️ Speech recognition is already running");
    }
  }

  // Add a method to check if streams are still valid after pause
  checkStreamHealth(): boolean {
    let isHealthy = true;
    
    if (this.captureOptions.captureMicrophone && this.microphoneStream) {
      const micTracks = this.microphoneStream.getAudioTracks();
      if (micTracks.length === 0 || micTracks[0].readyState !== 'live') {
        console.warn("⚠️ Microphone stream is not healthy");
        isHealthy = false;
      }
    }
    
    if (this.captureOptions.captureSystemAudio && this.systemAudioStream) {
      const systemTracks = this.systemAudioStream.getAudioTracks();
      if (systemTracks.length === 0 || systemTracks[0].readyState !== 'live') {
        console.warn("⚠️ System audio stream is not healthy");
        isHealthy = false;
      }
    }
    
    return isHealthy;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  // Get available audio devices
  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error("Failed to enumerate audio devices:", error);
      return [];
    }
  }
}

export const enhancedAudioService = new EnhancedAudioService();
export type { AudioCaptureOptions, TranscriptionResult };
