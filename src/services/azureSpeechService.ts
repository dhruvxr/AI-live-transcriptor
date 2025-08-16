import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { getAzureConfig } from "../config/azureConfig";

let recognizer: sdk.SpeechRecognizer | null = null;

export const startTranscription = (
  onResult: (result: sdk.SpeechRecognitionResult) => void,
  onError: (error: string) => void
) => {
  getAzureConfig()
    .then((config) => {
      if (!config.speechKey || !config.speechRegion) {
        onError("Azure Speech key or region not configured.");
        return;
      }

      const speechConfig = sdk.SpeechConfig.fromSubscription(
        config.speechKey,
        config.speechRegion
      );
      speechConfig.speechRecognitionLanguage = "en-US";

      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognizing = (s, e) => {
        onResult(e.result);
      };

      recognizer.recognized = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          onResult(e.result);
        }
      };

      recognizer.canceled = (s, e) => {
        let errorMessage = `CANCELED: Reason=${
          sdk.CancellationReason[e.reason]
        }`;
        if (e.reason === sdk.CancellationReason.Error) {
          errorMessage += `\nCANCELED: ErrorCode=${e.errorCode}`;
          errorMessage += `\nCANCELED: ErrorDetails=${e.errorDetails}`;
        }
        onError(errorMessage);
        stopTranscription();
      };

      recognizer.sessionStopped = (s, e) => {
        console.log("\n    Session stopped event.");
        stopTranscription();
      };

      recognizer.startContinuousRecognitionAsync(
        () => console.log("Recognition started"),
        (err: string) => {
          onError(err);
          stopTranscription();
        }
      );
    })
    .catch((error) => {
      onError(error.message);
    });
};

export const stopTranscription = () => {
  if (recognizer) {
    recognizer.stopContinuousRecognitionAsync(
      () => {
        recognizer?.close();
        recognizer = null;
        console.log("Recognition stopped");
      },
      (err: string) => {
        console.error("Error stopping recognition: " + err);
        recognizer?.close();
        recognizer = null;
      }
    );
  }
};
