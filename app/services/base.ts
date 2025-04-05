import { logger } from '@/app/utils/logger';

export interface LogOptions {
  component: string;
  data?: Record<string, unknown>;
}

export interface AWSResponse<T> {
  data: T;
  requestId: string;
  timestamp: string;
}

export interface AWSError {
  error: string;
  message: string;
  requestId: string;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: unknown[];
}

export interface ApiConfig {
  baseURL: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export abstract class AWSService {
  protected region: string;
  protected credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  protected serviceName: string;

  constructor(serviceName: string) {
    this.validateEnvVars();
    this.region = process.env.AWS_REGION!;
    this.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    };
    this.serviceName = serviceName;
  }

  protected validateEnvVars() {
    const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const error = `Missing required environment variables: ${missingVars.join(', ')}`;
      this.logError('Environment validation failed', { missingVars });
      throw new Error(error);
    }
  }

  protected createResponse<T>(data: T, requestId: string): AWSResponse<T> {
    return {
      data,
      requestId,
      timestamp: new Date().toISOString()
    };
  }

  protected createError(error: Error | unknown, requestId?: string): AWSError {
    const errorObj = error instanceof Error ? error : new Error('Unknown error');
    
    this.logError('Operation failed', {
      error: {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack
      }
    });

    return {
      error: errorObj.name,
      message: errorObj.message,
      requestId: requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
  }

  protected logInfo(message: string, data?: Record<string, unknown>) {
    logger.info(`${this.serviceName}: ${message}`, {
      component: this.serviceName,
      data
    });
  }

  protected logError(message: string, data?: Record<string, unknown>) {
    logger.error(`${this.serviceName}: ${message}`, {
      component: this.serviceName,
      data
    });
  }

  protected logOperation(operation: string, data?: Record<string, unknown>) {
    this.logInfo(`Operation: ${operation}`, data);
  }
}

export class ApiService {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  async get<T = unknown>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.config.baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: this.config.headers,
    });

    if (!response.ok) {
      throw {
        status: response.status,
        message: response.statusText,
      } as ApiError;
    }

    const data = await response.json();
    return {
      status: response.status,
      data,
    };
  }

  async post<T = unknown>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(new URL(endpoint, this.config.baseURL).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw {
        status: response.status,
        message: response.statusText,
      } as ApiError;
    }

    const data = await response.json();
    return {
      status: response.status,
      data,
    };
  }

  async put<T = unknown>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(new URL(endpoint, this.config.baseURL).toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw {
        status: response.status,
        message: response.statusText,
      } as ApiError;
    }

    const data = await response.json();
    return {
      status: response.status,
      data,
    };
  }

  async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(new URL(endpoint, this.config.baseURL).toString(), {
      method: 'DELETE',
      headers: this.config.headers,
    });

    if (!response.ok) {
      throw {
        status: response.status,
        message: response.statusText,
      } as ApiError;
    }

    const data = await response.json();
    return {
      status: response.status,
      data,
    };
  }
} 