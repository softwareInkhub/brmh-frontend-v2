type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  component?: string;
  requestId?: string;
  data?: Record<string, unknown>;
}



interface ILogger {
  info(message: string, options?: LogOptions): void;
  warn(message: string, options?: LogOptions): void;
  error(message: string, options?: LogOptions): void;
  debug(message: string, options?: LogOptions): void;
  logApiRequest(method: string, url: string, options?: { body?: unknown } & LogOptions): void;
  logApiResponse(method: string, url: string, response: unknown, options?: LogOptions): void;
  logApiError(method: string, url: string, error: Error | unknown, options?: LogOptions): void;
}

class LoggerImpl implements ILogger {
  private static instance: LoggerImpl;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  static getInstance(): LoggerImpl {
    if (!LoggerImpl.instance) {
      LoggerImpl.instance = new LoggerImpl();
    }
    return LoggerImpl.instance;
  }

  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = new Date().toISOString();
    const component = options?.component ? `[${options.component}]` : '';
    const requestId = options?.requestId ? `[${options.requestId}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${component}${requestId} ${message}`;
  }

  private log(level: LogLevel, message: string, options?: LogOptions): void {
    if (!this.isDevelopment) return;

    const formattedMessage = this.formatMessage(level, message, options);
    const data = options?.data ? JSON.stringify(options.data, null, 2) : '';

    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data);
        break;
      case 'info':
        console.info(formattedMessage, data);
        break;
      case 'warn':
        console.warn(formattedMessage, data);
        break;
      case 'error':
        console.error(formattedMessage, data);
        if (options?.data && 'error' in options.data && options.data.error instanceof Error) {
          console.error('Stack trace:', options.data.error.stack);
        }
        break;
    }
  }

  debug(message: string, options?: LogOptions): void {
    this.log('debug', message, options);
  }

  info(message: string, options?: LogOptions): void {
    this.log('info', message, options);
  }

  warn(message: string, options?: LogOptions): void {
    this.log('warn', message, options);
  }

  error(message: string, options?: LogOptions): void {
    this.log('error', message, options);
  }

  logApiRequest(method: string, url: string, options?: { body?: unknown } & LogOptions): void {
    this.info(`API Request: ${method} ${url}`, {
      ...options,
      data: { method, url, body: options?.body }
    });
  }

  logApiResponse(method: string, url: string, response: unknown, options?: LogOptions): void {
    this.info(`API Response: ${method} ${url}`, {
      ...options,
      data: { method, url, response }
    });
  }

  logApiError(method: string, url: string, error: Error | unknown, options?: LogOptions): void {
    this.error(`API Error: ${method} ${url}`, {
      ...options,
      data: { method, url, error }
    });
  }
}

export const logger: ILogger = LoggerImpl.getInstance(); 