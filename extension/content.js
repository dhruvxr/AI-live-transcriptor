// Content script that runs on web pages
let isTranscribing = false;
let recognition = null;
let currentSessionData = [];

// Initialize when content script loads
initialize();

function initialize() {
  // Check if speech recognition is available
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Speech recognition not supported in this browser');
    return;
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'startTranscription':
        startTranscription();
        sendResponse({success: true});
        break;
        
      case 'stopTranscription':
        stopTranscription();
        sendResponse({success: true});
        break;
        
      case 'getStatus':
        sendResponse({isTranscribing});
        break;
        
      default:
        sendResponse({success: false, error: 'Unknown action'});
    }
  });

  // Add visual indicator to page
  createVisualIndicator();
}

function startTranscription() {
  if (isTranscribing) return;

  try {
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isTranscribing = true;
      updateVisualIndicator(true);
      chrome.storage.local.set({isRecording: true});
      
      console.log('Speech recognition started');
    };

    recognition.onresult = async (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Send interim results to popup
      if (interimTranscript) {
        chrome.runtime.sendMessage({
          action: 'transcriptionUpdate',
          data: {
            text: interimTranscript,
            isFinal: false
          }
        });
      }

      // Process final results
      if (finalTranscript) {
        const processedResult = await processTranscript(finalTranscript);
        
        chrome.runtime.sendMessage({
          action: 'transcriptionUpdate',
          data: {
            text: finalTranscript,
            isFinal: true,
            isQuestion: processedResult.isQuestion,
            aiResponse: processedResult.aiResponse
          }
        });

        // Store in session data
        currentSessionData.push({
          timestamp: new Date().toISOString(),
          text: finalTranscript,
          isQuestion: processedResult.isQuestion,
          aiResponse: processedResult.aiResponse
        });
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access and try again.');
      }
      
      stopTranscription();
    };

    recognition.onend = () => {
      if (isTranscribing) {
        // Restart recognition if it stops unexpectedly
        try {
          recognition.start();
        } catch (e) {
          console.log('Could not restart recognition:', e);
          stopTranscription();
        }
      }
    };

    recognition.start();
    
  } catch (error) {
    console.error('Failed to start speech recognition:', error);
    alert('Failed to start speech recognition. Please check your microphone permissions.');
  }
}

function stopTranscription() {
  if (!isTranscribing) return;

  isTranscribing = false;
  
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  
  updateVisualIndicator(false);
  chrome.storage.local.set({isRecording: false});
  
  console.log('Speech recognition stopped');
}

async function processTranscript(text) {
  // Simple question detection (would use the actual service in production)
  const isQuestion = text.trim().endsWith('?') || 
    /^(what|who|when|where|why|how|is|are|do|does|did|can|could|will|would|should)\s/i.test(text.trim());
  
  let aiResponse = null;
  
  if (isQuestion) {
    // Generate AI response (simplified for extension)
    aiResponse = await generateSimpleResponse(text);
  }
  
  return { isQuestion, aiResponse };
}

async function generateSimpleResponse(question) {
  // Simplified AI response generation for extension
  // In production, this would call the Azure OpenAI service
  
  const responses = {
    'what': 'That\'s an interesting question about definition or explanation.',
    'who': 'This seems to be asking about a person or entity.',
    'when': 'This appears to be a timing-related question.',
    'where': 'This seems to be asking about location or place.',
    'why': 'This is asking for reasoning or explanation.',
    'how': 'This appears to be asking about process or method.'
  };
  
  const questionStart = question.toLowerCase().split(' ')[0];
  return responses[questionStart] || 'I understand this is a question. For detailed responses, please use the full AI Transcriptor app.';
}

function createVisualIndicator() {
  // Create a small indicator that shows transcription status
  const indicator = document.createElement('div');
  indicator.id = 'ai-transcriptor-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #4B5563 0%, #6D28D9 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    transition: all 0.3s ease;
    opacity: 0.8;
  `;
  
  indicator.innerHTML = '🎤';
  indicator.title = 'AI Transcriptor - Click to toggle';
  
  indicator.addEventListener('click', () => {
    if (isTranscribing) {
      stopTranscription();
    } else {
      startTranscription();
    }
  });
  
  document.body.appendChild(indicator);
}

function updateVisualIndicator(active) {
  const indicator = document.getElementById('ai-transcriptor-indicator');
  if (!indicator) return;
  
  if (active) {
    indicator.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
    indicator.style.animation = 'pulse 2s infinite';
    indicator.innerHTML = '🔴';
    indicator.title = 'AI Transcriptor - Recording (Click to stop)';
  } else {
    indicator.style.background = 'linear-gradient(135deg, #4B5563 0%, #6D28D9 100%)';
    indicator.style.animation = 'none';
    indicator.innerHTML = '🎤';
    indicator.title = 'AI Transcriptor - Ready (Click to start)';
  }
}

// Inject CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 1; }
  }
`;
document.head.appendChild(style);
