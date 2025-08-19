// Test script to verify session storage functionality
import { 
  createSession, 
  getAllSessions, 
  getSessionById,
  TranscriptionSession 
} from './src/services/dataStorageService.js';

console.log('Testing session storage...');

// Create a test session
const testSession = {
  title: "Test Session - Storage Verification",
  date: new Date().toISOString().split('T')[0],
  startTime: new Date().toLocaleTimeString(),
  endTime: new Date().toLocaleTimeString(),
  duration: "5m",
  type: "meeting" as const,
  transcript: [
    {
      id: "1",
      type: "speech" as const,
      content: "Hello, this is a test transcript item.",
      timestamp: new Date().toISOString(),
      confidence: 0.95,
      speaker: "User"
    }
  ],
  tags: ["test", "verification"]
};

console.log('Creating test session...');
const createdSession = createSession(testSession);
console.log('Created session:', createdSession);

console.log('Retrieving all sessions...');
const allSessions = getAllSessions();
console.log('Total sessions found:', allSessions.length);
console.log('Sessions:', allSessions);

console.log('Testing complete!');
