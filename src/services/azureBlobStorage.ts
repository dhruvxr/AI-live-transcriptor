import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { TranscriptionSession } from './storageTypes';

export interface AzureBlobConfig {
  connectionString: string;
  containerName: string;
}

class AzureBlobStorageManager {
  private blobServiceClient: BlobServiceClient | null = null;
  private containerClient: ContainerClient | null = null;
  private isInitialized = false;

  async initialize(config: AzureBlobConfig): Promise<void> {
    try {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
      this.containerClient = this.blobServiceClient.getContainerClient(config.containerName);
      
      // Create container if it doesn't exist
      await this.containerClient.createIfNotExists();
      
      this.isInitialized = true;
      console.log('Azure Blob Storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Azure Blob Storage:', error);
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.containerClient) {
      throw new Error('Azure Blob Storage not initialized. Call initialize() first.');
    }
  }

  private getSessionBlobName(sessionId: string): string {
    return `sessions/${sessionId}.json`;
  }

  private getIndexBlobName(): string {
    return 'session-index.json';
  }

  async saveSession(session: TranscriptionSession): Promise<void> {
    this.ensureInitialized();
    
    try {
      const blobName = this.getSessionBlobName(session.id);
      const blobClient = this.containerClient!.getBlobClient(blobName);
      const blockBlobClient = blobClient.getBlockBlobClient();
      
      const sessionData = {
        ...session,
        cloudSynced: true,
        lastModified: new Date().toISOString()
      };
      
      await blockBlobClient.upload(
        JSON.stringify(sessionData, null, 2),
        JSON.stringify(sessionData).length,
        {
          blobHTTPHeaders: {
            blobContentType: 'application/json'
          },
          metadata: {
            sessionId: session.id,
            sessionTitle: session.title,
            sessionDate: session.date,
            lastModified: sessionData.lastModified
          }
        }
      );
      
      // Update session index
      await this.updateSessionIndex(session);
      
      console.log(`Session ${session.id} saved to Azure Blob Storage`);
    } catch (error) {
      console.error(`Failed to save session ${session.id} to Azure Blob Storage:`, error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<TranscriptionSession | null> {
    this.ensureInitialized();
    
    try {
      const blobName = this.getSessionBlobName(sessionId);
      const blobClient = this.containerClient!.getBlobClient(blobName);
      
      if (!(await blobClient.exists())) {
        return null;
      }
      
      const downloadResponse = await blobClient.download();
      const content = await this.streamToString(downloadResponse.readableStreamBody!);
      
      return JSON.parse(content) as TranscriptionSession;
    } catch (error) {
      console.error(`Failed to get session ${sessionId} from Azure Blob Storage:`, error);
      return null;
    }
  }

  async getAllSessions(): Promise<TranscriptionSession[]> {
    this.ensureInitialized();
    
    try {
      const sessions: TranscriptionSession[] = [];
      
      // List all session blobs
      const iterator = this.containerClient!.listBlobsFlat({
        prefix: 'sessions/'
      });
      
      for await (const blob of iterator) {
        if (blob.name.endsWith('.json') && blob.name !== 'sessions/session-index.json') {
          try {
            const blobClient = this.containerClient!.getBlobClient(blob.name);
            const downloadResponse = await blobClient.download();
            const content = await this.streamToString(downloadResponse.readableStreamBody!);
            const session = JSON.parse(content) as TranscriptionSession;
            sessions.push(session);
          } catch (error) {
            console.warn(`Failed to load session from blob ${blob.name}:`, error);
          }
        }
      }
      
      // Sort by date descending
      return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Failed to get all sessions from Azure Blob Storage:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      const blobName = this.getSessionBlobName(sessionId);
      const blobClient = this.containerClient!.getBlobClient(blobName);
      
      const deleteResponse = await blobClient.deleteIfExists();
      
      if (deleteResponse.succeeded) {
        // Update session index
        await this.removeFromSessionIndex(sessionId);
        console.log(`Session ${sessionId} deleted from Azure Blob Storage`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to delete session ${sessionId} from Azure Blob Storage:`, error);
      return false;
    }
  }

  private async updateSessionIndex(session: TranscriptionSession): Promise<void> {
    try {
      const indexBlobName = this.getIndexBlobName();
      const blobClient = this.containerClient!.getBlobClient(indexBlobName);
      
      let index: any = { sessions: [] };
      
      // Try to get existing index
      if (await blobClient.exists()) {
        try {
          const downloadResponse = await blobClient.download();
          const content = await this.streamToString(downloadResponse.readableStreamBody!);
          index = JSON.parse(content);
        } catch (error) {
          console.warn('Failed to read existing index, creating new one');
        }
      }
      
      // Update or add session in index
      const existingIndex = index.sessions.findIndex((s: any) => s.id === session.id);
      const sessionSummary = {
        id: session.id,
        title: session.title,
        date: session.date,
        duration: session.duration,
        type: session.type,
        wordsCount: session.wordsCount,
        questionsCount: session.questionsCount,
        lastModified: new Date().toISOString()
      };
      
      if (existingIndex >= 0) {
        index.sessions[existingIndex] = sessionSummary;
      } else {
        index.sessions.push(sessionSummary);
      }
      
      index.lastUpdated = new Date().toISOString();
      index.totalSessions = index.sessions.length;
      
      // Save updated index
      const blockBlobClient = blobClient.getBlockBlobClient();
      await blockBlobClient.upload(
        JSON.stringify(index, null, 2),
        JSON.stringify(index).length,
        {
          blobHTTPHeaders: {
            blobContentType: 'application/json'
          }
        }
      );
    } catch (error) {
      console.warn('Failed to update session index:', error);
      // Don't throw error as this is not critical for session saving
    }
  }

  private async removeFromSessionIndex(sessionId: string): Promise<void> {
    try {
      const indexBlobName = this.getIndexBlobName();
      const blobClient = this.containerClient!.getBlobClient(indexBlobName);
      
      if (!(await blobClient.exists())) {
        return;
      }
      
      const downloadResponse = await blobClient.download();
      const content = await this.streamToString(downloadResponse.readableStreamBody!);
      const index = JSON.parse(content);
      
      index.sessions = index.sessions.filter((s: any) => s.id !== sessionId);
      index.lastUpdated = new Date().toISOString();
      index.totalSessions = index.sessions.length;
      
      const blockBlobClient = blobClient.getBlockBlobClient();
      await blockBlobClient.upload(
        JSON.stringify(index, null, 2),
        JSON.stringify(index).length,
        {
          blobHTTPHeaders: {
            blobContentType: 'application/json'
          }
        }
      );
    } catch (error) {
      console.warn('Failed to update session index after deletion:', error);
    }
  }

  async getSessionIndex(): Promise<any> {
    this.ensureInitialized();
    
    try {
      const indexBlobName = this.getIndexBlobName();
      const blobClient = this.containerClient!.getBlobClient(indexBlobName);
      
      if (!(await blobClient.exists())) {
        return { sessions: [], totalSessions: 0, lastUpdated: null };
      }
      
      const downloadResponse = await blobClient.download();
      const content = await this.streamToString(downloadResponse.readableStreamBody!);
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to get session index:', error);
      return { sessions: [], totalSessions: 0, lastUpdated: null };
    }
  }

  private async streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      readableStream.on('data', (data) => {
        chunks.push(data.toString());
      });
      readableStream.on('end', () => {
        resolve(chunks.join(''));
      });
      readableStream.on('error', reject);
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      this.ensureInitialized();
      const properties = await this.containerClient!.getProperties();
      console.log('Azure Blob Storage connection test successful:', properties);
      return true;
    } catch (error) {
      console.error('Azure Blob Storage connection test failed:', error);
      return false;
    }
  }
}

export const azureBlobStorageManager = new AzureBlobStorageManager();
