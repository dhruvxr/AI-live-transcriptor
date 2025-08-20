# Audio Mode Switching Feature Implementation

## Overview
Added the ability to switch between microphone and speaker (system audio) modes during live transcription recording. This allows users to dynamically change their audio input source without stopping and restarting the recording session.

## Changes Made

### 1. LiveTranscription Component (`components/LiveTranscription.tsx`)

#### New State Variables
- `currentAudioMode`: Tracks the current audio mode ('microphone' | 'speaker' | 'both')

#### New Functions
- `switchAudioMode()`: Handles switching between audio modes during recording
  - Gracefully stops current service
  - Updates audio options
  - Restarts service with new settings
  - Adds system message to transcript
  - Includes error handling and fallback

#### Improved Pause/Resume Functionality
- `togglePauseResume()`: Enhanced pause/resume with proper state management
  - Uses actual pause/resume instead of stop/start
  - Includes stream health checking
  - Automatic recovery when streams become invalid
  - Better error handling and user feedback
  - System messages for all state changes

#### UI Enhancements
- Added audio mode switching controls in the recording header
- Three buttons: Microphone, Speaker, Both
- Visual indicators for current mode
- Disabled states when not recording or when system audio isn't supported
- Tooltips with helpful information

#### Error Handling
- Improved error messages for system audio failures
- Automatic fallback to microphone when system audio fails
- User feedback through transcript messages

### 2. Enhanced Audio Service (`src/services/enhancedAudioService.ts`)

#### Improved System Audio Support
- Better error handling for system audio capture
- Enhanced browser compatibility detection
- Improved Web Audio API integration for system audio processing
- Fixed audio feedback issues by not connecting to audio destination

#### Enhanced Pause/Resume Methods
- `pauseRecording()`: Proper pause with callbacks and error handling
- `resumeRecording()`: Enhanced resume with state validation
- `resumeRecordingWithCallback()`: Resume with result callbacks
- `checkStreamHealth()`: Validates stream integrity after pause
- Better resource management and cleanup

#### Audio Stream Processing
- `createAudioStreamFromMediaStream()`: Converts MediaStream to Azure Speech SDK compatible format
- Web Audio API processing for 16-bit PCM conversion
- Proper cleanup and resource management

#### Better Error Reporting
- More descriptive error messages
- Graceful degradation when system audio fails
- Improved logging for debugging

### 3. Regular Azure Speech Service (`src/services/realAzureSpeechService.ts`)

#### Added Pause/Resume Support
- `pauseRecording()`: Pauses Azure Speech SDK recognition
- `resumeRecording()`: Resumes with callback support
- Handles both Azure SDK and Web Speech API differences
- Proper error handling and state management

## Features

### Runtime Audio Mode Switching
- **Microphone Only**: Standard microphone input
- **Speaker Only**: System/speaker audio capture (Chrome, Edge, Firefox)
- **Both**: Combined microphone and system audio

### Robust Pause/Resume Functionality
- **True Pause/Resume**: Uses Azure Speech SDK pause/resume instead of stop/start
- **Stream Health Monitoring**: Automatically detects and recovers from stream issues
- **Automatic Recovery**: Restarts service when streams become invalid after pause
- **Visual Feedback**: Clear status messages and transcript logging
- **Error Recovery**: Graceful handling of pause/resume failures

### Browser Compatibility
- **Chrome**: Full support for all modes
- **Edge**: Full support for all modes  
- **Firefox**: Limited system audio support (requires video sharing)
- **Safari**: Microphone only (system audio not supported)

### User Experience Improvements
- Visual feedback during mode switching
- System messages in transcript log
- Disabled controls when features aren't available
- Helpful tooltips and error messages
- Automatic fallback to working configurations

## Technical Details

### Audio Processing Pipeline
1. **Microphone Mode**: Direct Azure Speech SDK integration
2. **System Audio Mode**: getDisplayMedia → Web Audio API → Azure Speech SDK
3. **Both Mode**: Web Audio API mixing → Azure Speech SDK

### Error Recovery
- Automatic fallback from system audio to microphone
- Graceful handling of permission denials
- Clear error messages with suggested actions

### System Audio Limitations
- Requires user permission for screen/audio sharing
- Browser-specific implementation differences
- May have lower accuracy compared to direct microphone input
- Requires active audio output for capture

## Testing
Created `test-audio-modes.html` for testing the mode switching functionality:
- Simulates recording state management
- Tests browser compatibility detection
- Demonstrates UI behavior
- Includes system audio permission testing

## Usage Instructions

### For Users
1. Start recording with initial audio source selection
2. Use the mode buttons in the header to switch between:
   - 🎤 Microphone: Captures your voice through microphone
   - 🔊 Speaker: Captures system audio (music, videos, other apps)
   - 🎤🔊 Both: Captures both microphone and system audio
3. Mode switching is only available during active recording
4. System audio requires browser permission for screen/audio sharing

### For Developers
1. Audio options are managed through `audioOptions` state
2. Mode switching triggers service restart with new configuration
3. Error handling provides fallback to working configurations
4. System messages are added to transcript for user feedback

## Known Issues & Limitations

1. **System Audio Quality**: May have lower transcription accuracy compared to direct microphone input
2. **Browser Support**: System audio only works in Chrome, Edge, and Firefox
3. **Permission Requirements**: System audio requires additional user permissions
4. **Firefox Limitations**: May require video sharing enabled for audio capture
5. **Real-time Switching**: Brief interruption during mode switching is expected

## Future Improvements

1. **Seamless Switching**: Implement buffering to reduce interruption during mode changes
2. **Audio Mixing**: Better integration of multiple audio sources
3. **Quality Indicators**: Show audio quality/confidence for different modes
4. **Preset Configurations**: Save common audio mode preferences
5. **Advanced Filtering**: Noise reduction and audio enhancement for system audio

## Files Modified

- `components/LiveTranscription.tsx`: Main UI and functionality
- `src/services/enhancedAudioService.ts`: Audio processing and system audio support
- `test-audio-modes.html`: Testing interface (new file)

The implementation provides a robust foundation for dynamic audio mode switching while maintaining backward compatibility and graceful degradation for unsupported features.
