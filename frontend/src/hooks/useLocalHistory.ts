/**
 * Local Chat History Hook
 * 
 * React hook for managing local chat history with IndexedDB.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getAllSessions,
  getSessionMessages,
  saveSession,
  saveMessage,
  deleteSession,
  clearAllHistory,
  exportHistory,
  importHistory,
  getStorageStats,
  createSession,
  isIndexedDBSupported,
  type ChatSession,
  type ChatMessage,
} from "@/lib/storage";

export type UseLocalHistoryOptions = {
  autoLoad?: boolean;
  onError?: (error: Error) => void;
};

export type UseLocalHistoryReturn = {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSupported: boolean;
  storageStats: { sessions: number; messages: number; estimatedSize: string } | null;
  loadSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  createNewSession: () => Promise<ChatSession>;
  addMessage: (message: Omit<ChatMessage, 'id' | 'createdAt'>) => Promise<void>;
  deleteSessionById: (sessionId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
  refreshStats: () => Promise<void>;
};

/**
 * Hook for managing local chat history
 * 
 * @example
 * ```tsx
 * const {
 *   sessions,
 *   currentSession,
 *   messages,
 *   createNewSession,
 *   addMessage,
 * } = useLocalHistory({ autoLoad: true });
 * 
 * // Create new session
 * const session = await createNewSession();
 * 
 * // Add message
 * await addMessage({
 *   sessionId: session.id,
 *   role: 'user',
 *   content: 'Hello!',
 * });
 * ```
 */
export function useLocalHistory(options: UseLocalHistoryOptions = {}): UseLocalHistoryReturn {
  const { autoLoad = true, onError } = options;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported] = useState(() => isIndexedDBSupported());
  const [storageStats, setStorageStats] = useState<{
    sessions: number;
    messages: number;
    estimatedSize: string;
  } | null>(null);

  /**
   * Load all sessions
   */
  const loadSessions = useCallback(async () => {
    if (!isSupported) return;

    try {
      setIsLoading(true);
      const loadedSessions = await getAllSessions();
      setSessions(loadedSessions);
    } catch (error) {
      console.error('[LocalHistory] Failed to load sessions:', error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, onError]);

  /**
   * Load a specific session and its messages
   */
  const loadSession = useCallback(
    async (sessionId: string) => {
      if (!isSupported) return;

      try {
        setIsLoading(true);
        const loadedMessages = await getSessionMessages(sessionId);
        setMessages(loadedMessages);

        const session = sessions.find((s) => s.id === sessionId);
        setCurrentSession(session || null);
      } catch (error) {
        console.error('[LocalHistory] Failed to load session:', error);
        onError?.(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, sessions, onError]
  );

  /**
   * Create a new session
   */
  const createNewSession = useCallback(async (): Promise<ChatSession> => {
    if (!isSupported) {
      throw new Error('IndexedDB is not supported');
    }

    try {
      const newSession = await createSession();
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
      return newSession;
    } catch (error) {
      console.error('[LocalHistory] Failed to create session:', error);
      onError?.(error as Error);
      throw error;
    }
  }, [isSupported, onError]);

  /**
   * Add a message to the current session
   */
  const addMessage = useCallback(
    async (message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
      if (!isSupported) return;

      try {
        const fullMessage: ChatMessage = {
          ...message,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };

        await saveMessage(fullMessage);
        setMessages((prev) => [...prev, fullMessage]);

        // Update session in list
        setSessions((prev) =>
          prev.map((s) =>
            s.id === message.sessionId
              ? {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  messageCount: (s.messageCount || 0) + 1,
                  title:
                    s.title || (message.role === 'user' ? message.content.substring(0, 50) : s.title),
                }
              : s
          )
        );
      } catch (error) {
        console.error('[LocalHistory] Failed to add message:', error);
        onError?.(error as Error);
      }
    },
    [isSupported, onError]
  );

  /**
   * Delete a session
   */
  const deleteSessionById = useCallback(
    async (sessionId: string) => {
      if (!isSupported) return;

      try {
        await deleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));

        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
          setMessages([]);
        }
      } catch (error) {
        console.error('[LocalHistory] Failed to delete session:', error);
        onError?.(error as Error);
      }
    },
    [isSupported, currentSession, onError]
  );

  /**
   * Clear all history
   */
  const clearHistory = useCallback(async () => {
    if (!isSupported) return;

    try {
      await clearAllHistory();
      setSessions([]);
      setCurrentSession(null);
      setMessages([]);
      setStorageStats(null);
    } catch (error) {
      console.error('[LocalHistory] Failed to clear history:', error);
      onError?.(error as Error);
    }
  }, [isSupported, onError]);

  /**
   * Export history as JSON
   */
  const exportData = useCallback(async (): Promise<string> => {
    if (!isSupported) {
      throw new Error('IndexedDB is not supported');
    }

    try {
      return await exportHistory();
    } catch (error) {
      console.error('[LocalHistory] Failed to export history:', error);
      onError?.(error as Error);
      throw error;
    }
  }, [isSupported, onError]);

  /**
   * Import history from JSON
   */
  const importData = useCallback(
    async (jsonData: string) => {
      if (!isSupported) return;

      try {
        await importHistory(jsonData);
        await loadSessions();
      } catch (error) {
        console.error('[LocalHistory] Failed to import history:', error);
        onError?.(error as Error);
        throw error;
      }
    },
    [isSupported, loadSessions, onError]
  );

  /**
   * Refresh storage statistics
   */
  const refreshStats = useCallback(async () => {
    if (!isSupported) return;

    try {
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('[LocalHistory] Failed to get storage stats:', error);
      onError?.(error as Error);
    }
  }, [isSupported, onError]);

  // Auto-load sessions on mount
  useEffect(() => {
    if (autoLoad && isSupported) {
      void loadSessions();
      void refreshStats();
    }
  }, [autoLoad, isSupported, loadSessions, refreshStats]);

  return {
    sessions,
    currentSession,
    messages,
    isLoading,
    isSupported,
    storageStats,
    loadSessions,
    loadSession,
    createNewSession,
    addMessage,
    deleteSessionById,
    clearHistory,
    exportData,
    importData,
    refreshStats,
  };
}
