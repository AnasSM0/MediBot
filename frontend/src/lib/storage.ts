/**
 * IndexedDB Storage Service
 * 
 * Production-ready local storage for chat history using IndexedDB.
 * Features:
 * - Session-based chat storage
 * - Message persistence
 * - GDPR-compliant (local-only, user-controlled)
 * - Export/import functionality
 * - Clear history options
 * - No server dependency
 */

const DB_NAME = 'medibot-storage';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const MESSAGES_STORE = 'messages';

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  severity?: 'mild' | 'moderate' | 'severe';
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type ChatSession = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  metadata?: Record<string, unknown>;
};

/**
 * Initialize IndexedDB database
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create sessions store
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        sessionsStore.createIndex('createdAt', 'createdAt', { unique: false });
        sessionsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Create messages store
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const messagesStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
        messagesStore.createIndex('sessionId', 'sessionId', { unique: false });
        messagesStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Save a chat session
 */
export async function saveSession(session: ChatSession): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);
    const request = store.put(session);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save session'));
  });
}

/**
 * Get a chat session by ID
 */
export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readonly');
    const store = transaction.objectStore(SESSIONS_STORE);
    const request = store.get(sessionId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('Failed to get session'));
  });
}

/**
 * Get all chat sessions
 */
export async function getAllSessions(): Promise<ChatSession[]> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE], 'readonly');
    const store = transaction.objectStore(SESSIONS_STORE);
    const index = store.index('updatedAt');
    const request = index.openCursor(null, 'prev'); // Most recent first

    const sessions: ChatSession[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        sessions.push(cursor.value);
        cursor.continue();
      } else {
        resolve(sessions);
      }
    };

    request.onerror = () => reject(new Error('Failed to get sessions'));
  });
}

/**
 * Delete a chat session and all its messages
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE, MESSAGES_STORE], 'readwrite');
    
    // Delete session
    const sessionsStore = transaction.objectStore(SESSIONS_STORE);
    sessionsStore.delete(sessionId);

    // Delete all messages in session
    const messagesStore = transaction.objectStore(MESSAGES_STORE);
    const index = messagesStore.index('sessionId');
    const request = index.openCursor(IDBKeyRange.only(sessionId));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Failed to delete session'));
  });
}

/**
 * Save a chat message
 */
export async function saveMessage(message: ChatMessage): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MESSAGES_STORE, SESSIONS_STORE], 'readwrite');
    
    // Save message
    const messagesStore = transaction.objectStore(MESSAGES_STORE);
    messagesStore.put(message);

    // Update session
    const sessionsStore = transaction.objectStore(SESSIONS_STORE);
    const sessionRequest = sessionsStore.get(message.sessionId);

    sessionRequest.onsuccess = () => {
      const session = sessionRequest.result;
      if (session) {
        session.updatedAt = new Date().toISOString();
        session.messageCount = (session.messageCount || 0) + 1;
        
        // Update title from first user message if not set
        if (!session.title && message.role === 'user') {
          session.title = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
        }
        
        sessionsStore.put(session);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Failed to save message'));
  });
}

/**
 * Get all messages for a session
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(MESSAGES_STORE);
    const index = store.index('sessionId');
    const request = index.getAll(IDBKeyRange.only(sessionId));

    request.onsuccess = () => {
      const messages = request.result || [];
      // Sort by createdAt
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      resolve(messages);
    };

    request.onerror = () => reject(new Error('Failed to get messages'));
  });
}

/**
 * Clear all chat history (GDPR right to erasure)
 */
export async function clearAllHistory(): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SESSIONS_STORE, MESSAGES_STORE], 'readwrite');
    
    transaction.objectStore(SESSIONS_STORE).clear();
    transaction.objectStore(MESSAGES_STORE).clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Failed to clear history'));
  });
}

/**
 * Export all chat history as JSON (GDPR data portability)
 */
export async function exportHistory(): Promise<string> {
  const sessions = await getAllSessions();
  const allMessages: ChatMessage[] = [];

  for (const session of sessions) {
    const messages = await getSessionMessages(session.id);
    allMessages.push(...messages);
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    sessions,
    messages: allMessages,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import chat history from JSON
 */
export async function importHistory(jsonData: string): Promise<{ sessions: number; messages: number }> {
  try {
    const data = JSON.parse(jsonData);
    
    if (!data.sessions || !data.messages) {
      throw new Error('Invalid import data format');
    }

    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SESSIONS_STORE, MESSAGES_STORE], 'readwrite');
      const sessionsStore = transaction.objectStore(SESSIONS_STORE);
      const messagesStore = transaction.objectStore(MESSAGES_STORE);

      // Import sessions
      for (const session of data.sessions) {
        sessionsStore.put(session);
      }

      // Import messages
      for (const message of data.messages) {
        messagesStore.put(message);
      }

      transaction.oncomplete = () => {
        resolve({
          sessions: data.sessions.length,
          messages: data.messages.length,
        });
      };

      transaction.onerror = () => reject(new Error('Failed to import history'));
    });
  } catch (error) {
    throw new Error(`Import failed: ${error}`);
  }
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  sessions: number;
  messages: number;
  estimatedSize: string;
}> {
  const sessions = await getAllSessions();
  let totalMessages = 0;

  for (const session of sessions) {
    totalMessages += session.messageCount || 0;
  }

  // Estimate size (rough calculation)
  const exportData = await exportHistory();
  const sizeInBytes = new Blob([exportData]).size;
  const sizeInKB = (sizeInBytes / 1024).toFixed(2);
  const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2);

  return {
    sessions: sessions.length,
    messages: totalMessages,
    estimatedSize: sizeInBytes > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`,
  };
}

/**
 * Check if IndexedDB is supported
 */
export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Create a new session
 */
export async function createSession(): Promise<ChatSession> {
  const session: ChatSession = {
    id: crypto.randomUUID(),
    title: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 0,
  };

  await saveSession(session);
  return session;
}

/**
 * Update session title
 */
export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  session.title = title;
  session.updatedAt = new Date().toISOString();
  await saveSession(session);
}
