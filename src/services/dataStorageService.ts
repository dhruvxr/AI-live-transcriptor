import { hybridStorageManager } from './hybridStorage';

export interface TranscriptionSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration: string;
  type: "lecture" | "meeting" | "interview" | "other";
  transcript: TranscriptItem[];
  questionsCount: number;
  wordsCount: number;
  summary?: string;
  tags?: string[];
  lastModified: string;
  cloudSynced: boolean;
}

export interface TranscriptItem {
  id: string;
  type: "speech" | "question" | "ai_response";
  content: string;
  timestamp: string;
  confidence?: number;
  speaker?: string;
}

// Initialize hybrid storage (localStorage + optional Azure Blob)
const initializeStorage = async () => {
  try {
    // First, try to get configuration from environment variables
    const envConnectionString = import.meta.env.VITE_AZURE_BLOB_CONNECTION_STRING;
    const envContainerName = import.meta.env.VITE_AZURE_BLOB_CONTAINER_NAME || 'ai-transcriptions';
    
    if (envConnectionString) {
      // Use environment variables
      console.log('Found Azure Blob Storage configuration in environment variables');
      await hybridStorageManager.initialize({
        azureBlobConfig: {
          connectionString: envConnectionString,
          containerName: envContainerName
        },
        enableCloudSync: true,
        autoSyncInterval: 5 // Sync every 5 minutes
      });
      console.log('Hybrid storage initialized with cloud sync from .env');
      return;
    }
    
    // Fallback: Check if user has Azure configuration in localStorage
    const azureConfig = localStorage.getItem('azureBlobConfig');
    const enableCloudSync = localStorage.getItem('enableCloudSync') === 'true';
    
    if (azureConfig && enableCloudSync) {
      const parsedConfig = JSON.parse(azureConfig);
      await hybridStorageManager.initialize({
        azureBlobConfig: parsedConfig,
        enableCloudSync: true,
        autoSyncInterval: 5 // Sync every 5 minutes
      });
      console.log('Hybrid storage initialized with cloud sync from localStorage');
    } else {
      await hybridStorageManager.initialize({
        enableCloudSync: false
      });
      console.log('Local storage initialized (no cloud configuration found)');
    }
  } catch (error) {
    console.warn('Storage initialization failed, falling back to local-only:', error);
    await hybridStorageManager.initialize({
      enableCloudSync: false
    });
  }
};

// Initialize on module load
initializeStorage();

// Create a new session
export const createSession = async (
  sessionData: Omit<
    TranscriptionSession,
    "id" | "questionsCount" | "wordsCount" | "lastModified" | "cloudSynced"
  >
): Promise<TranscriptionSession> => {
  const newSession: TranscriptionSession = {
    ...sessionData,
    id: Date.now().toString(),
    questionsCount: sessionData.transcript.filter(
      (item) => item.type === "question"
    ).length,
    wordsCount: sessionData.transcript.reduce(
      (count, item) => count + item.content.split(" ").length,
      0
    ),
    lastModified: new Date().toISOString(),
    cloudSynced: false
  };

  await hybridStorageManager.saveSession(newSession);
  return newSession;
};

// Get all sessions
export const getAllSessions = async (): Promise<TranscriptionSession[]> => {
  return await hybridStorageManager.getAllSessions();
};

// Get session by ID
export const getSessionById = async (id: string): Promise<TranscriptionSession | null> => {
  return await hybridStorageManager.getSessionById(id);
};

// Update session
export const updateSession = async (
  id: string,
  updates: Partial<TranscriptionSession>
): Promise<TranscriptionSession | null> => {
  return await hybridStorageManager.updateSession(id, {
    ...updates,
    lastModified: new Date().toISOString()
  });
};

// Delete session
export const deleteSession = async (id: string): Promise<boolean> => {
  return await hybridStorageManager.deleteSession(id);
};

// For backward compatibility - sync versions of async functions
export const getAllSessionsSync = (): TranscriptionSession[] => {
  // This is a temporary fallback - components should be updated to use async version
  console.warn('Using deprecated sync version of getAllSessions');
  return [];
};

// Session statistics
export const getSessionStats = async () => {
  const sessions = await getAllSessions();
  
  const totalSessions = sessions.length;
  const totalWords = sessions.reduce((sum, session) => sum + session.wordsCount, 0);
  
  // Calculate total hours from duration strings
  const totalMinutes = sessions.reduce((sum, session) => {
    const duration = session.duration;
    if (duration.includes('h')) {
      const parts = duration.split('h');
      const hours = parseInt(parts[0]) || 0;
      const minutes = parts[1] ? parseInt(parts[1].replace('m', '')) || 0 : 0;
      return sum + (hours * 60) + minutes;
    } else {
      return sum + (parseInt(duration.replace('m', '')) || 0);
    }
  }, 0);

  return {
    totalSessions,
    totalWords,
    totalHours: Math.round(totalMinutes / 60 * 100) / 100
  };
};

// Storage management functions
export const syncToCloud = async () => {
  return await hybridStorageManager.syncToCloud();
};

export const syncFromCloud = async () => {
  return await hybridStorageManager.syncFromCloud();
};

export const getStorageStats = async () => {
  return await hybridStorageManager.getStorageStats();
};

export const exportSessions = async (): Promise<string> => {
  return await hybridStorageManager.exportSessions();
};

export const importSessions = async (jsonData: string) => {
  return await hybridStorageManager.importSessions(jsonData);
};

// Clear dummy data function (keep for compatibility)
export const clearAllDummyData = () => {
  console.log('Dummy data clearing is handled by enhanced storage system');
};
