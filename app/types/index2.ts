export type Tab = 'docs' | 'spec' | 'mock' | 'test-suite';

export interface StatusLogEntry {
  type: 'info' | 'success' | 'error' | 'connection' | 'generating';
  message: string;
  timestamp: string;
}

export interface ApiParameter {
  name: string;
  in: string;
  type: string;
  description: string;
  required?: boolean;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  data: unknown;
  duration: number;
}

export interface ApiResponseSpec {
  description: string;
  content?: Record<string, unknown>;
}

export interface ApiInfo {
  title: string;
  description: string;
  version: string;
}

export interface ApiEndpoint {
  path: string;
  method: string;
  summary: string;
  description?: string;
  tag?: string;
  parameters?: ApiParameter[];
  responses: Record<string, ApiResponseSpec>;
  requestBody?: unknown;
  info?: ApiInfo;
  server?: string;
}

export interface WebSocketMessage {
  type: 'connection' | 'spec-generated' | 'server-ready' | 'swagger-url' | 'error' | 'status' | 'schema-changed';
  message: string;
  data?: {
    endpoints?: ApiEndpoint[];
    specification?: string;
    [key: string]: unknown;
  };
}
