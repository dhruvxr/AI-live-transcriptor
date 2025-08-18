import { TranscriptionSession } from './storageTypes';

// Enhanced localStorage with compression and better error handling
class LocalStorageManager {
  private readonly STORAGE_KEY = "ai-transcriptor-sessions";
  private readonly STORAGE_VERSION = "v2";
  
  private sessions: TranscriptionSession[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private saveToStorage(): void {
    try {
      const data = {
        version: this.STORAGE_VERSION,
        sessions: this.sessions,
        lastUpdated: new Date().toISOString()
      };
      
      // Compress data if it's getting large
      const jsonString = JSON.stringify(data);
      if (jsonString.length > 1000000) { // > 1MB
        console.warn('Session data is getting large. Consider enabling cloud sync.');
      }
      
      localStorage.setItem(this.STORAGE_KEY, jsonString);
    } catch (error: any) {
      console.error('Failed to save sessions to localStorage:', error);
      if (error.name === 'QuotaExceededError') {
        this.handleStorageQuotaExceeded();
      }
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Handle version migration if needed
        if (data.version === this.STORAGE_VERSION) {
          this.sessions = data.sessions || [];
        } else {
          this.migrateFromOldVersion(data);
        }
      }
    } catch (error) {
      console.error('Failed to load sessions from localStorage:', error);
      this.sessions = [];
    }
  }

  private migrateFromOldVersion(data: any): void {
    // Handle migration from old storage format
    if (Array.isArray(data)) {
      // Old format was just an array
      this.sessions = data.map(session => ({
        ...session,
        lastModified: session.lastModified || new Date().toISOString(),
        cloudSynced: false
      }));
    } else {
      this.sessions = [];
    }
    
    // Save in new format
    this.saveToStorage();
    console.log('Migrated sessions to new storage format');
  }

  private handleStorageQuotaExceeded(): void {
    // Try to free up space by removing oldest sessions
    const sorted = [...this.sessions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Remove oldest 25% of sessions
    const toRemove = Math.ceil(sorted.length * 0.25);
    const removedSessions = sorted.slice(0, toRemove);
    
    this.sessions = this.sessions.filter(session => 
      !removedSessions.some(removed => removed.id === session.id)
    );
    
    console.warn(`Removed ${toRemove} old sessions due to storage quota exceeded`);
    this.saveToStorage();
  }

  async saveSession(session: TranscriptionSession): Promise<void> {
    const existingIndex = this.sessions.findIndex(s => s.id === session.id);
    const sessionWithMetadata = {
      ...session,
      lastModified: new Date().toISOString(),
      cloudSynced: false
    };
    
    if (existingIndex >= 0) {
      this.sessions[existingIndex] = sessionWithMetadata;
    } else {
      this.sessions.unshift(sessionWithMetadata);
    }
    
    this.saveToStorage();
  }

  async getAllSessions(): Promise<TranscriptionSession[]> {
    this.loadFromStorage(); // Ensure we have latest data
    return [...this.sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getSessionById(id: string): Promise<TranscriptionSession | null> {
    this.loadFromStorage();
    return this.sessions.find(session => session.id === id) || null;
  }

  async deleteSession(id: string): Promise<boolean> {
    const initialLength = this.sessions.length;
    this.sessions = this.sessions.filter(session => session.id !== id);
    
    if (this.sessions.length < initialLength) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  async updateSession(id: string, updates: Partial<TranscriptionSession>): Promise<TranscriptionSession | null> {
    const sessionIndex = this.sessions.findIndex(session => session.id === id);
    if (sessionIndex === -1) return null;

    this.sessions[sessionIndex] = { 
      ...this.sessions[sessionIndex], 
      ...updates,
      lastModified: new Date().toISOString(),
      cloudSynced: false
    };
    
    this.saveToStorage();
    return this.sessions[sessionIndex];
  }

  async exportSessions(): Promise<string> {
    const data = {
      exportDate: new Date().toISOString(),
      totalSessions: this.sessions.length,
      sessions: this.sessions
    };
    return JSON.stringify(data, null, 2);
  }

  async importSessions(jsonData: string): Promise<{ imported: number; errors: string[] }> {
    try {
      const data = JSON.parse(jsonData);
      const errors: string[] = [];
      let imported = 0;

      if (data.sessions && Array.isArray(data.sessions)) {
        for (const session of data.sessions) {
          try {
            // Validate session structure
            if (session.id && session.title && session.date) {
              await this.saveSession(session);
              imported++;
            } else {
              errors.push(`Invalid session structure: ${session.id || 'unknown'}`);
            }
          } catch (error: any) {
            errors.push(`Failed to import session ${session.id}: ${error.message}`);
          }
        }
      } else {
        errors.push('Invalid import format: sessions array not found');
      }

      return { imported, errors };
    } catch (error: any) {
      return { imported: 0, errors: [`Failed to parse import data: ${error.message}`] };
    }
  }

  async getStorageStats(): Promise<{
    totalSessions: number;
    totalSizeBytes: number;
    totalWords: number;
    totalHours: number;
    oldestSession: string | null;
    newestSession: string | null;
  }> {
    const data = JSON.stringify({ sessions: this.sessions });
    const totalWords = this.sessions.reduce((sum, session) => sum + session.wordsCount, 0);
    
    // Calculate total hours from duration strings
    const totalMinutes = this.sessions.reduce((sum, session) => {
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

    const dates = this.sessions.map(s => s.date).sort();
    
    return {
      totalSessions: this.sessions.length,
      totalSizeBytes: new Blob([data]).size,
      totalWords,
      totalHours: Math.round(totalMinutes / 60 * 100) / 100,
      oldestSession: dates[0] || null,
      newestSession: dates[dates.length - 1] || null
    };
  }
}

export const localStorageManager = new LocalStorageManager();
