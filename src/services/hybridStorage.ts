import { TranscriptionSession } from './storageTypes';
import { localStorageManager } from './enhancedLocalStorage';
import { azureBlobStorageManager, AzureBlobConfig } from './azureBlobStorage';

export interface HybridStorageConfig {
  azureBlobConfig?: AzureBlobConfig;
  enableCloudSync: boolean;
  autoSyncInterval?: number; // minutes
}

class HybridStorageManager {
  private config: HybridStorageConfig | null = null;
  private isCloudInitialized = false;
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async initialize(config: HybridStorageConfig): Promise<void> {
    this.config = config;
    
    if (config.enableCloudSync && config.azureBlobConfig) {
      try {
        await azureBlobStorageManager.initialize(config.azureBlobConfig);
        this.isCloudInitialized = true;
        console.log('Cloud storage initialized successfully');
        
        // Set up auto-sync if configured
        if (config.autoSyncInterval && config.autoSyncInterval > 0) {
          this.startAutoSync(config.autoSyncInterval);
        }
        
        // Perform initial sync from cloud
        await this.syncFromCloud();
      } catch (error) {
        console.warn('Failed to initialize cloud storage, continuing with local-only:', error);
        this.isCloudInitialized = false;
      }
    }
  }

  private startAutoSync(intervalMinutes: number): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncToCloud();
      } catch (error) {
        console.warn('Auto-sync failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
    
    console.log(`Auto-sync enabled with ${intervalMinutes} minute interval`);
  }

  async saveSession(session: TranscriptionSession): Promise<void> {
    // Always save locally first for immediate access
    await localStorageManager.saveSession(session);
    
    // Save to cloud if enabled and available
    if (this.isCloudInitialized && this.config?.enableCloudSync) {
      try {
        await azureBlobStorageManager.saveSession(session);
        
        // Update local session to mark as cloud synced
        await localStorageManager.updateSession(session.id, { cloudSynced: true });
      } catch (error) {
        console.warn(`Failed to save session ${session.id} to cloud:`, error);
        // Mark as not synced so it can be retried later
        await localStorageManager.updateSession(session.id, { cloudSynced: false });
      }
    }
  }

  async getAllSessions(): Promise<TranscriptionSession[]> {
    // Get sessions from local storage (fastest)
    const localSessions = await localStorageManager.getAllSessions();
    
    // If cloud is not available, return local sessions
    if (!this.isCloudInitialized || !this.config?.enableCloudSync) {
      return localSessions;
    }
    
    try {
      // Get sessions from cloud
      const cloudSessions = await azureBlobStorageManager.getAllSessions();
      
      // Merge sessions, preferring cloud versions for synced sessions
      const mergedSessions = this.mergeSessions(localSessions, cloudSessions);
      
      // Update local storage with any cloud sessions we don't have locally
      for (const cloudSession of cloudSessions) {
        const localSession = localSessions.find(s => s.id === cloudSession.id);
        if (!localSession || new Date(cloudSession.lastModified) > new Date(localSession.lastModified)) {
          await localStorageManager.saveSession(cloudSession);
        }
      }
      
      return mergedSessions;
    } catch (error) {
      console.warn('Failed to get sessions from cloud, returning local sessions:', error);
      return localSessions;
    }
  }

  async getSessionById(id: string): Promise<TranscriptionSession | null> {
    // Try local first (fastest)
    let session = await localStorageManager.getSessionById(id);
    
    // If cloud is enabled and we don't have it locally, try cloud
    if (!session && this.isCloudInitialized && this.config?.enableCloudSync) {
      try {
        session = await azureBlobStorageManager.getSession(id);
        if (session) {
          // Save to local for future access
          await localStorageManager.saveSession(session);
        }
      } catch (error) {
        console.warn(`Failed to get session ${id} from cloud:`, error);
      }
    }
    
    return session;
  }

  async deleteSession(id: string): Promise<boolean> {
    let localDeleted = false;
    let cloudDeleted = true; // Assume success if cloud is not enabled
    
    // Delete from local storage
    try {
      localDeleted = await localStorageManager.deleteSession(id);
    } catch (error) {
      console.error(`Failed to delete session ${id} from local storage:`, error);
    }
    
    // Delete from cloud if enabled
    if (this.isCloudInitialized && this.config?.enableCloudSync) {
      try {
        cloudDeleted = await azureBlobStorageManager.deleteSession(id);
      } catch (error) {
        console.warn(`Failed to delete session ${id} from cloud:`, error);
        cloudDeleted = false;
      }
    }
    
    return localDeleted || cloudDeleted;
  }

  async updateSession(id: string, updates: Partial<TranscriptionSession>): Promise<TranscriptionSession | null> {
    // Update locally first
    const updatedSession = await localStorageManager.updateSession(id, updates);
    
    if (!updatedSession) {
      return null;
    }
    
    // Update in cloud if enabled
    if (this.isCloudInitialized && this.config?.enableCloudSync) {
      try {
        await azureBlobStorageManager.saveSession(updatedSession);
        // Mark as synced
        await localStorageManager.updateSession(id, { cloudSynced: true });
      } catch (error) {
        console.warn(`Failed to update session ${id} in cloud:`, error);
        // Mark as not synced
        await localStorageManager.updateSession(id, { cloudSynced: false });
      }
    }
    
    return updatedSession;
  }

  async syncToCloud(): Promise<{ synced: number; errors: string[] }> {
    if (!this.isCloudInitialized || !this.config?.enableCloudSync || this.syncInProgress) {
      return { synced: 0, errors: ['Cloud sync not available or already in progress'] };
    }
    
    this.syncInProgress = true;
    const errors: string[] = [];
    let synced = 0;
    
    try {
      const localSessions = await localStorageManager.getAllSessions();
      const unsyncedSessions = localSessions.filter(session => !session.cloudSynced);
      
      console.log(`Syncing ${unsyncedSessions.length} unsynced sessions to cloud...`);
      
      for (const session of unsyncedSessions) {
        try {
          await azureBlobStorageManager.saveSession(session);
          await localStorageManager.updateSession(session.id, { cloudSynced: true });
          synced++;
        } catch (error: any) {
          errors.push(`Failed to sync session ${session.id}: ${error.message}`);
        }
      }
      
      console.log(`Cloud sync completed: ${synced} sessions synced, ${errors.length} errors`);
    } catch (error: any) {
      errors.push(`Sync process failed: ${error.message}`);
    } finally {
      this.syncInProgress = false;
    }
    
    return { synced, errors };
  }

  async syncFromCloud(): Promise<{ synced: number; errors: string[] }> {
    if (!this.isCloudInitialized || !this.config?.enableCloudSync || this.syncInProgress) {
      return { synced: 0, errors: ['Cloud sync not available or already in progress'] };
    }
    
    this.syncInProgress = true;
    const errors: string[] = [];
    let synced = 0;
    
    try {
      const cloudSessions = await azureBlobStorageManager.getAllSessions();
      const localSessions = await localStorageManager.getAllSessions();
      
      console.log(`Syncing ${cloudSessions.length} sessions from cloud...`);
      
      for (const cloudSession of cloudSessions) {
        try {
          const localSession = localSessions.find(s => s.id === cloudSession.id);
          
          // If we don't have it locally, or cloud version is newer
          if (!localSession || new Date(cloudSession.lastModified) > new Date(localSession.lastModified)) {
            await localStorageManager.saveSession({ ...cloudSession, cloudSynced: true });
            synced++;
          }
        } catch (error: any) {
          errors.push(`Failed to sync session ${cloudSession.id} from cloud: ${error.message}`);
        }
      }
      
      console.log(`Cloud sync from cloud completed: ${synced} sessions synced, ${errors.length} errors`);
    } catch (error: any) {
      errors.push(`Sync from cloud process failed: ${error.message}`);
    } finally {
      this.syncInProgress = false;
    }
    
    return { synced, errors };
  }

  private mergeSessions(localSessions: TranscriptionSession[], cloudSessions: TranscriptionSession[]): TranscriptionSession[] {
    const mergedMap = new Map<string, TranscriptionSession>();
    
    // Add all local sessions first
    localSessions.forEach(session => {
      mergedMap.set(session.id, session);
    });
    
    // Override with cloud versions if they're newer
    cloudSessions.forEach(cloudSession => {
      const localSession = mergedMap.get(cloudSession.id);
      if (!localSession || new Date(cloudSession.lastModified) > new Date(localSession.lastModified)) {
        mergedMap.set(cloudSession.id, { ...cloudSession, cloudSynced: true });
      }
    });
    
    return Array.from(mergedMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getStorageStats(): Promise<{
    local: any;
    cloud?: any;
    sync: {
      isEnabled: boolean;
      isCloudAvailable: boolean;
      lastSyncTime?: string;
      unsyncedSessions: number;
    };
  }> {
    const localStats = await localStorageManager.getStorageStats();
    
    let cloudStats;
    if (this.isCloudInitialized && this.config?.enableCloudSync) {
      try {
        cloudStats = await azureBlobStorageManager.getSessionIndex();
      } catch (error) {
        console.warn('Failed to get cloud stats:', error);
      }
    }
    
    const localSessions = await localStorageManager.getAllSessions();
    const unsyncedSessions = localSessions.filter(s => !s.cloudSynced).length;
    
    return {
      local: localStats,
      cloud: cloudStats,
      sync: {
        isEnabled: this.config?.enableCloudSync || false,
        isCloudAvailable: this.isCloudInitialized,
        unsyncedSessions
      }
    };
  }

  async exportSessions(): Promise<string> {
    return await localStorageManager.exportSessions();
  }

  async importSessions(jsonData: string): Promise<{ imported: number; errors: string[] }> {
    const result = await localStorageManager.importSessions(jsonData);
    
    // If cloud is enabled, sync imported sessions
    if (this.isCloudInitialized && this.config?.enableCloudSync && result.imported > 0) {
      try {
        await this.syncToCloud();
      } catch (error) {
        console.warn('Failed to sync imported sessions to cloud:', error);
      }
    }
    
    return result;
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const hybridStorageManager = new HybridStorageManager();
