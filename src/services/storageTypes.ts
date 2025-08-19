export interface CloudStorageConfig {
  connectionString: string;
  containerName: string;
  enabled: boolean;
}

export interface StorageManager {
  // Local storage methods
  saveSessionLocally(session: TranscriptionSession): Promise<void>;
  getSessionsLocally(): Promise<TranscriptionSession[]>;
  deleteSessionLocally(id: string): Promise<boolean>;
  
  // Cloud storage methods
  syncToCloud(): Promise<void>;
  syncFromCloud(): Promise<void>;
  saveSessionToCloud(session: TranscriptionSession): Promise<void>;
  getSessionsFromCloud(): Promise<TranscriptionSession[]>;
  deleteSessionFromCloud(id: string): Promise<boolean>;
  
  // Hybrid methods
  saveSession(session: TranscriptionSession): Promise<void>;
  getAllSessions(): Promise<TranscriptionSession[]>;
  deleteSession(id: string): Promise<boolean>;
}

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
  // Metadata for sync
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
