import { useState, useCallback, useRef, useEffect } from 'react';
import { CONFIG } from '@/config/config';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export interface MessageContext {
  url?: string;
  tradeId?: string;
  [key: string]: unknown;
}

interface UseAssistantChatReturn {
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, context?: MessageContext) => void;
  stopStream: () => void;
  clearMessages: () => void;
}

export function useAssistantChat(): UseAssistantChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const currentAssistantMessageRef = useRef<string>('');
  const mountedRef = useRef(true);

  const closeConnection = useCallback(() => {
    const ws = wsRef.current;
    if (!ws) return;

    ws.onopen = null;
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;

    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }

    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    closeConnection();

    const ws = new WebSocket(`${CONFIG.WS_BASE_URL}/ws/assistant`);

    ws.onopen = () => {
      if (mountedRef.current) {
        setIsConnected(true);
        setError(null);
      }
    };

    ws.onclose = () => {
      if (mountedRef.current) {
        setIsConnected(false);
      }
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };

    ws.onerror = () => {
      if (mountedRef.current) {
        setError('Connection error. Please try again.');
        setIsConnected(false);
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;

      try {
        const data = JSON.parse(event.data);

        if (data.done) {
          setIsLoading(false);
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage?.role === 'assistant') {
              lastMessage.isStreaming = false;
            }
            return updated;
          });
          currentAssistantMessageRef.current = '';
        } else if (data.token !== undefined) {
          currentAssistantMessageRef.current += data.token;

          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];

            if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
              lastMessage.content = currentAssistantMessageRef.current;
            } else {
              updated.push({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: currentAssistantMessageRef.current,
                isStreaming: true,
              });
            }

            return [...updated];
          });
        }
      } catch {
      }
    };

    wsRef.current = ws;
  }, [closeConnection]);

  const doSend = useCallback((content: string, context?: MessageContext) => {
    // Only show the user's message content in the UI (not the context)
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content,
      },
    ]);

    currentAssistantMessageRef.current = '';
    setIsLoading(true);
    setError(null);

    // Send message with context to the WebSocket
    wsRef.current?.send(JSON.stringify({
      message: content,
      context,
    }));
  }, []);

  const sendMessage = useCallback(
    (content: string, context?: MessageContext) => {
      if (!content.trim()) return;

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        doSend(content, context);
        return;
      }

      connect();

      const checkAndSend = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          clearInterval(checkAndSend);
          doSend(content, context);
        }
      }, 50);

      setTimeout(() => {
        clearInterval(checkAndSend);
        if (mountedRef.current && wsRef.current?.readyState !== WebSocket.OPEN) {
          setError('Failed to connect. Please try again.');
          setIsLoading(false);
        }
      }, 5000);
    },
    [connect, doSend]
  );

  const stopStream = useCallback(() => {
    closeConnection();

    setMessages((prev) => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
        lastMessage.isStreaming = false;
      }
      return updated;
    });

    setIsLoading(false);
    currentAssistantMessageRef.current = '';
  }, [closeConnection]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    currentAssistantMessageRef.current = '';
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      closeConnection();
    };
  }, [closeConnection]);

  return {
    messages,
    isConnected,
    isLoading,
    error,
    sendMessage,
    stopStream,
    clearMessages,
  };
}
