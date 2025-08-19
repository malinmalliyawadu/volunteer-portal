"use client";

import { useEffect, useRef, useCallback } from "react";

interface NotificationStreamEvent {
  type: 'connected' | 'heartbeat' | 'notification' | 'unread_count_changed';
  userId?: string;
  timestamp?: number;
  data?: {
    count?: number;
    [key: string]: unknown;
  };
}

interface UseNotificationStreamOptions {
  onUnreadCountChange?: (count: number) => void;
  onNewNotification?: (notification: Record<string, unknown>) => void;
  enabled?: boolean;
}

export function useNotificationStream({
  onUnreadCountChange,
  onNewNotification,
  enabled = true
}: UseNotificationStreamOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;
    
    cleanup();

    try {
      const eventSource = new EventSource('/api/notifications/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('Notification stream connected');
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      };

      eventSource.onmessage = (event) => {
        try {
          const data: NotificationStreamEvent = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              console.log('SSE connection established for user:', data.userId);
              break;
            case 'heartbeat':
              // Connection is alive, no action needed
              break;
            case 'unread_count_changed':
              onUnreadCountChange?.(data.data?.count || 0);
              break;
            case 'notification':
              if (data.data) {
                onNewNotification?.(data.data);
              }
              break;
            default:
              console.log('Unknown SSE event type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        
        // Implement exponential backoff for reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached, falling back to polling');
          cleanup();
        }
      };

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
    }
  }, [enabled, onUnreadCountChange, onNewNotification, cleanup]);

  // Initialize connection
  useEffect(() => {
    if (enabled) {
      connect();
    }
    
    return cleanup;
  }, [enabled, connect, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    reconnect: connect,
    disconnect: cleanup,
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN
  };
}