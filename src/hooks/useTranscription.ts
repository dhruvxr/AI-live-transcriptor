import { useState, useEffect, useRef, useCallback } from "react";
import { enhancedAudioService } from "../services/enhancedAudioService";

export interface TranscriptItem {
  id: string;
  type: "speech" | "question" | "answer";
  speaker?: string;
  content: string;
  timestamp: Date;
  confidence?: number;
  isFinal: boolean;
}

export const useTranscription = () => {
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullTranscriptRef = useRef<string[]>([]);
  const currentSegmentIdRef = useRef<string | null>(null);

  // Adapter for enhancedAudioService's TranscriptionResult
  const handleEnhancedResult = useCallback((result: any) => {
    const content = result.text;
    const isFinal = true; // Assume all results are final for now
    if (!content) return;

    setTranscript((prev) => {
      // If there's an ongoing segment, update it
      if (currentSegmentIdRef.current) {
        const existingItem = prev.find(
          (item) => item.id === currentSegmentIdRef.current
        );
        if (existingItem) {
          const updatedContent =
            fullTranscriptRef.current.join(" ") + " " + content;
          const updatedItem = {
            ...existingItem,
            content: updatedContent.trim(),
            isFinal,
          };
          return prev.map((item) =>
            item.id === currentSegmentIdRef.current ? updatedItem : item
          );
        }
      }

      // If no ongoing segment, create a new one
      const newId = Date.now().toString();
      currentSegmentIdRef.current = newId;
      const newContent = fullTranscriptRef.current.join(" ") + " " + content;

      const newItem: TranscriptItem = {
        id: newId,
        type: "speech",
        speaker: "Me",
        content: newContent.trim(),
        timestamp: new Date(),
        isFinal: isFinal,
      };
      return [...prev, newItem];
    });

    if (isFinal) {
      fullTranscriptRef.current.push(content);
      currentSegmentIdRef.current = null; // Reset for the next utterance
    }
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsRecording(false);
  }, []);

  const start = useCallback(() => {
    setTranscript([]);
    fullTranscriptRef.current = [];
    currentSegmentIdRef.current = null;
    setIsRecording(true);
    setIsPaused(false);
    setError(null);
    // You can customize options as needed
    enhancedAudioService.startRecording(
      { captureMicrophone: true, captureSystemAudio: false },
      handleEnhancedResult,
      handleError
    );
  }, [handleEnhancedResult, handleError]);

  const stop = useCallback(() => {
    if (isRecording) {
      enhancedAudioService.stopRecording && enhancedAudioService.stopRecording();
    }
    setIsRecording(false);
  }, [isRecording]);

  const togglePause = useCallback(() => {
    const nextPausedState = !isPaused;
    setIsPaused(nextPausedState);
    if (nextPausedState) {
      enhancedAudioService.stopRecording && enhancedAudioService.stopRecording();
    } else {
      if (isRecording) {
        enhancedAudioService.startRecording(
          { captureMicrophone: true, captureSystemAudio: false },
          handleEnhancedResult,
          handleError
        );
      }
    }
  }, [isPaused, isRecording, handleEnhancedResult, handleError]);

  useEffect(() => {
    return () => {
      if (isRecording) {
        enhancedAudioService.stopRecording && enhancedAudioService.stopRecording();
      }
    };
  }, [isRecording]);

  return {
    transcript,
    isRecording,
    isPaused,
    error,
    start,
    stop,
    togglePause,
  };
};
