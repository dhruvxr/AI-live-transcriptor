import { useState, useEffect, useRef, useCallback } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import {
  startTranscription,
  stopTranscription,
} from "../services/azureSpeechService";

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

  const handleResult = useCallback((result: sdk.SpeechRecognitionResult) => {
    const isFinal = result.reason === sdk.ResultReason.RecognizedSpeech;
    const content = result.text;

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

          // Replace the old item with the updated one
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
    startTranscription(handleResult, handleError);
  }, [handleResult, handleError]);

  const stop = useCallback(() => {
    if (isRecording) {
      stopTranscription();
    }
    setIsRecording(false);
  }, [isRecording]);

  const togglePause = useCallback(() => {
    const nextPausedState = !isPaused;
    setIsPaused(nextPausedState);
    if (nextPausedState) {
      stopTranscription();
    } else {
      if (isRecording) {
        startTranscription(handleResult, handleError);
      }
    }
  }, [isPaused, isRecording, handleResult, handleError]);

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopTranscription();
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
