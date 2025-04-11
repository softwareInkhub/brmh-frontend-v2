"use client"
import { useState, useEffect, useCallback } from 'react';
import { ApiEndpoint, StatusLogEntry, WebSocketMessage } from '../types/index2';
import { WS_BASE_URL } from '../lib/constants';

// Event interface for schema change
export interface SchemaChangeEvent {
  type: 'schema-change';
  detail: {
    endpoints: ApiEndpoint[];
    specification: string;
  };
}

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<StatusLogEntry[]>([{
    type: 'info',
    message: 'System initializing...',
    timestamp: new Date().toLocaleTimeString()
  }]);
  const [swaggerUrl, setSwaggerUrl] = useState<string>('');
  const [newSchemaReceived, setNewSchemaReceived] = useState(false);

  const addLog = useCallback((type: StatusLogEntry['type'], message: string) => {
    setLogs(prevLogs => [
      ...prevLogs,
      {
        type,
        message,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  }, []);

  useEffect(() => {
    // Setup WebSocket connection
    const ws = new WebSocket(`${WS_BASE_URL}/ws`);

    ws.onopen = () => {
      setIsConnected(true);
      addLog('connection', 'WebSocket connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      addLog('error', 'WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      addLog('error', 'WebSocket error occurred');
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        switch (data.type) {
          case 'spec-generated':
            addLog('success', 'OpenAPI specification generated');
            break;
          
          case 'server-ready':
            addLog('success', data.message);
            break;
            
          case 'swagger-url':
            setSwaggerUrl(data.message);
            addLog('info', `Swagger UI available at ${data.message}`);
            break;
            
          case 'error':
            addLog('error', data.message);
            break;
            
          case 'status':
            addLog('info', data.message);
            break;
            
          case 'schema-changed':
            // Handle schema change
            addLog('info', 'API schema has been updated');
            
            // Set flag that new schema was received
            setNewSchemaReceived(true);
            
            // Dispatch custom event for TestPanel to catch
            const schemaChangeEvent = new CustomEvent('schema-change', {
              detail: data.data
            });
            window.dispatchEvent(schemaChangeEvent);
            break;
            
          default:
            console.log('Received message:', data);
            addLog('info', data.message);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [addLog]);

  return {
    socket,
    isConnected,
    logs,
    addLog,
    swaggerUrl,
    newSchemaReceived,
    resetSchemaFlag: () => setNewSchemaReceived(false)
  };
}
