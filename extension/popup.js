// Extension popup script
let isRecording = false;
let transcriptionData = [];

document.addEventListener("DOMContentLoaded", function () {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const openAppBtn = document.getElementById("openAppBtn");
  const settingsLink = document.getElementById("settingsLink");
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");
  const transcriptPreview = document.getElementById("transcriptPreview");
  const transcriptText = document.getElementById("transcriptText");

  // Event listeners
  startBtn.addEventListener("click", startRecording);
  stopBtn.addEventListener("click", stopRecording);
  openAppBtn.addEventListener("click", openFullApp);
  settingsLink.addEventListener("click", openSettings);

  // Check initial status
  checkRecordingStatus();

  function startRecording() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "startTranscription" },
        function (response) {
          if (response && response.success) {
            updateUI(true);
            transcriptPreview.style.display = "block";
            transcriptText.textContent = "Listening...";
          } else {
            alert(
              "Failed to start transcription. Please check your microphone permissions."
            );
          }
        }
      );
    });
  }

  function stopRecording() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "stopTranscription" },
        function (response) {
          if (response && response.success) {
            updateUI(false);

            // Save session data
            if (transcriptionData.length > 0) {
              const sessionData = {
                id: Date.now().toString(),
                title: `Web Transcription - ${new Date().toLocaleDateString()}`,
                date: new Date().toISOString().split("T")[0],
                startTime: new Date().toLocaleTimeString(),
                duration: calculateDuration(),
                type: "other",
                transcript: transcriptionData,
                questionsCount: transcriptionData.filter(
                  (item) => item.type === "question"
                ).length,
                wordsCount: transcriptionData.reduce(
                  (count, item) => count + item.content.split(" ").length,
                  0
                ),
              };

              // Send to background script to save
              chrome.runtime.sendMessage({
                action: "saveSession",
                data: sessionData,
              });

              transcriptText.textContent = `Session saved! ${transcriptionData.length} items transcribed.`;
            }
          }
        }
      );
    });
  }

  function openFullApp() {
    chrome.tabs.create({
      url: "http://localhost:5173/",
    });
  }

  function openSettings() {
    chrome.tabs.create({
      url: "http://localhost:5173/#/settings",
    });
  }

  function updateUI(recording) {
    isRecording = recording;
    startBtn.disabled = recording;
    stopBtn.disabled = !recording;

    if (recording) {
      statusIndicator.classList.add("active");
      statusText.textContent = "Recording...";
    } else {
      statusIndicator.classList.remove("active");
      statusText.textContent = "Ready to start";
    }
  }

  function checkRecordingStatus() {
    chrome.storage.local.get(["isRecording"], function (result) {
      if (result.isRecording) {
        updateUI(true);
        transcriptPreview.style.display = "block";
      }
    });
  }

  function calculateDuration() {
    // Simple duration calculation - could be improved with actual start time tracking
    return `${Math.ceil(transcriptionData.length / 10)}m`;
  }

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener(function (
    message,
    sender,
    sendResponse
  ) {
    if (message.action === "transcriptionUpdate") {
      const { text, isFinal, isQuestion, aiResponse } = message.data;

      if (isFinal) {
        const transcriptItem = {
          id: Date.now().toString(),
          type: isQuestion ? "question" : "speech",
          content: text,
          timestamp: new Date().toLocaleTimeString(),
          confidence: 0.9,
        };

        transcriptionData.push(transcriptItem);

        // Add AI response if it's a question
        if (isQuestion && aiResponse) {
          transcriptionData.push({
            id: (Date.now() + 1).toString(),
            type: "ai_response",
            content: aiResponse,
            timestamp: new Date().toLocaleTimeString(),
            confidence: 1.0,
          });
        }
      }

      // Update preview
      if (transcriptText) {
        transcriptText.textContent = text || "Listening...";
      }
    }
  });
});
