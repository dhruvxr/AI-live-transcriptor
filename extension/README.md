# AI Live Transcriptor - Browser Extension

A Chrome/Firefox browser extension for real-time speech transcription with AI-powered question detection and response capabilities.

## Features

- **Real-time Speech Transcription**: Live speech-to-text transcription on any web page
- **AI Question Detection**: Automatically detects questions and provides AI-generated responses
- **Session Management**: Save and sync transcription sessions with the main app
- **Visual Indicator**: Non-intrusive floating indicator shows recording status
- **Cross-page Support**: Works on all websites with proper permissions

## Installation

### Chrome/Edge
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `extension` folder
4. The extension icon should appear in your toolbar

### Firefox
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the extension folder

## Usage

### Starting Transcription
1. Click the extension icon in your browser toolbar
2. Click the "Start Recording" button in the popup
3. Allow microphone access when prompted
4. A floating indicator will appear on the page showing recording status

### Visual Indicator
- **Gray microphone (🎤)**: Ready to start recording
- **Red dot with pulse (🔴)**: Currently recording
- Click the indicator to quickly start/stop recording

### Transcription Features
- **Real-time transcription**: See your speech converted to text instantly
- **Question detection**: Questions are automatically identified
- **AI responses**: Get AI-generated responses to detected questions
- **Session saving**: All transcriptions are saved for later review

### Accessing Saved Sessions
- Saved sessions sync with the main AI Live Transcriptor app
- Click "Open Main App" in the extension popup to view all sessions
- Sessions include timestamps, transcripts, and AI responses

## Technical Requirements

- Chrome 88+ or Firefox 78+
- Microphone access permission
- Internet connection for AI features

## Privacy & Permissions

### Required Permissions
- **Microphone**: For speech recognition and transcription
- **Active Tab**: To inject transcription functionality into web pages
- **Storage**: To save transcription sessions locally
- **Scripting**: To add visual indicators and controls to web pages

### Data Handling
- All transcription data is stored locally in your browser
- AI processing uses secure Azure OpenAI services
- No personal data is transmitted without your explicit consent
- Sessions can be exported or deleted at any time

## Keyboard Shortcuts

- **Ctrl+Shift+T** (Windows/Linux) or **Cmd+Shift+T** (Mac): Toggle recording
- **Escape**: Stop recording (when focused on the page)

## Integration with Main App

The extension works seamlessly with the main AI Live Transcriptor application:

- **Session Sync**: All sessions are automatically synced
- **Unified History**: View all transcriptions in one place
- **Export Options**: Export sessions in multiple formats (TXT, JSON, CSV, SRT)
- **Advanced AI**: Full AI capabilities available in the main app

## Troubleshooting

### Common Issues

**Microphone not working:**
- Check browser permissions for microphone access
- Ensure no other applications are using the microphone
- Try refreshing the page and restarting the extension

**Extension not appearing:**
- Verify the extension is enabled in browser settings
- Check for browser compatibility
- Try reloading the extension

**Transcription not accurate:**
- Speak clearly and at a moderate pace
- Reduce background noise
- Check microphone quality and positioning

**AI responses not generating:**
- Verify internet connection
- Check if Azure OpenAI services are configured
- Try asking clearer, more direct questions

### Support

For additional support:
1. Check the main application's troubleshooting guide
2. Verify all services are properly configured
3. Report issues through the main application

## Development

### Building from Source
```bash
# Clone the repository
git clone [repository-url]
cd AI-live-transcriptor

# Install dependencies
npm install

# Build the extension
npm run build:extension
```

### File Structure
```
extension/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup interface
├── popup.js          # Popup functionality
├── background.js     # Service worker for background tasks
├── content.js        # Content script for web page integration
└── README.md         # This file
```

## Version History

### v1.0.0
- Initial release
- Real-time speech transcription
- AI question detection and response
- Session management and sync
- Cross-browser compatibility
- Visual recording indicator

## License

This extension is part of the AI Live Transcriptor project and follows the same licensing terms.
