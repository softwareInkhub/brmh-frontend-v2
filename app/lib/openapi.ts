import OpenAPIBackend, { Context, Request, Document } from 'openapi-backend';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs';
import { logger } from '@/app/utils/logger';

const COMPONENT_NAME = 'OpenAPI Backend';

// Load OpenAPI specification
let apiSpec: Document;
try {
  const specPath = path.join(process.cwd(), 'app/api/openapi.yaml');
  const fileContents = fs.readFileSync(specPath, 'utf8');
  apiSpec = yaml.load(fileContents) as Document;
  logger.info(`${COMPONENT_NAME}: API specification loaded successfully`, {
    component: COMPONENT_NAME,
    data: { paths: Object.keys(apiSpec.paths || {}) }
  });
} catch (error) {
  logger.error(`${COMPONENT_NAME}: Error loading API specification`, {
    component: COMPONENT_NAME,
    data: { error }
  });
  apiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'API',
      version: '1.0.0'
    },
    paths: {}
  };
}

// Initialize OpenAPI Backend
export const api = new OpenAPIBackend({
  definition: apiSpec,
  strict: true,
  validate: true,
  handlers: {
    validationFail: async (c: Context, req: NextRequest) => {
      logger.error(`${COMPONENT_NAME}: Validation failed`, {
        component: COMPONENT_NAME,
        data: { 
          errors: c.validation.errors,
          path: req.nextUrl.pathname,
          method: req.method
        }
      });
      
      return NextResponse.json({
        error: 'Validation Failed',
        message: c.validation.errors,
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }, { status: 400 });
    },
    notFound: async (c: Context, req: NextRequest) => {
      logger.error(`${COMPONENT_NAME}: Path not found`, {
        component: COMPONENT_NAME,
        data: { 
          path: req.nextUrl.pathname,
          method: req.method,
          availablePaths: Object.keys(apiSpec.paths || {})
        }
      });
      
      return NextResponse.json({
        error: 'Not Found',
        message: 'Path not found in API specification',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }, { status: 404 });
    },
    notImplemented: async (c: Context, req: NextRequest) => {
      logger.error(`${COMPONENT_NAME}: Operation not implemented`, {
        component: COMPONENT_NAME,
        data: { 
          path: req.nextUrl.pathname,
          method: req.method,
          operation: c.operation.operationId
        }
      });
      
      return NextResponse.json({
        error: 'Not Implemented',
        message: `Operation ${c.operation.operationId} not implemented`,
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }, { status: 501 });
    }
  }
});

// Initialize API
try {
  api.init();
  logger.info(`${COMPONENT_NAME}: OpenAPI Backend initialized successfully`, {
    component: COMPONENT_NAME
  });
} catch (error) {
  logger.error(`${COMPONENT_NAME}: Failed to initialize OpenAPI Backend`, {
    component: COMPONENT_NAME,
    data: { error }
  });
}

// Helper function to validate request against OpenAPI spec
export async function validateRequest(request: NextRequest, handler: (c: Context, req: NextRequest) => Promise<NextResponse>) {
  try {
    const requestId = crypto.randomUUID();
    logger.info(`${COMPONENT_NAME}: Validating request`, {
      component: COMPONENT_NAME,
      data: { 
        requestId,
        path: request.nextUrl.pathname,
        method: request.method
      }
    });

    // Create the OpenAPI request object
    const openAPIRequest: Request = {
      path: request.nextUrl.pathname,
      method: request.method.toLowerCase(),
      body: request.body ? await request.clone().json() : undefined,
      query: Object.fromEntries(new URL(request.url).searchParams),
      headers: Object.fromEntries(request.headers)
    };

    // Find and register the operation handler
    const operation = api.router.matchOperation(openAPIRequest);
    if (operation?.operationId) {
      api.register(operation.operationId, handler);
    } else {
      logger.warn(`${COMPONENT_NAME}: No matching operation found`, {
        component: COMPONENT_NAME,
        data: { 
          path: request.nextUrl.pathname,
          method: request.method
        }
      });
    }

    // Handle the request through OpenAPI Backend
    const response = await api.handleRequest(openAPIRequest, request);

    return response;
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Request validation failed`, {
      component: COMPONENT_NAME,
      data: { 
        error,
        path: request.nextUrl.pathname,
        method: request.method
      }
    });

    return NextResponse.json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
}

export interface OpenAPIPath {
  [method: string]: {
    summary?: string;
    description?: string;
    parameters?: OpenAPIParameter[];
    requestBody?: {
      content: {
        [contentType: string]: {
          schema: unknown;
        };
      };
    };
    responses: {
      [statusCode: string]: {
        description: string;
        content?: {
          [contentType: string]: {
            schema: unknown;
          };
        };
      };
    };
  };
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema: unknown;
}

export interface OpenAPIComponent {
  schemas?: Record<string, unknown>;
  securitySchemes?: Record<string, unknown>;
}

export function parseOpenAPI(schema: OpenAPISchema): OpenAPISchema {
  // Validate OpenAPI version
  if (!schema.openapi || !schema.openapi.startsWith('3.')) {
    throw new Error('Invalid OpenAPI version. Must be 3.x.x');
  }

  // Validate info object
  if (!schema.info || !schema.info.title || !schema.info.version) {
    throw new Error('Missing required info fields');
  }

  // Validate paths
  if (!schema.paths || Object.keys(schema.paths).length === 0) {
    throw new Error('No paths defined');
  }

  return schema;
}

export function generateOpenAPI(schema: OpenAPISchema): string {
  return JSON.stringify(schema, null, 2);
}

export function validateOpenAPI(schema: OpenAPISchema): boolean {
  try {
    parseOpenAPI(schema);
    return true;
  } catch {
    return false;
  }
} 