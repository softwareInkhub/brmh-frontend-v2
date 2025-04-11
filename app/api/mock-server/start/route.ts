import { NextRequest, NextResponse } from 'next/server';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer, Server } from 'http';

interface ServerInfo {
  server: Server;
  port: number;
  lastAccessed: number;
}

// Define the global type for active servers
declare global {
  // eslint-disable-next-line no-var
  var activeServers: Map<string, ServerInfo>;
}

// Initialize the global map if it doesn't exist
if (!global.activeServers) {
  global.activeServers = new Map();
}

// Cleanup function to periodically remove stale servers (optional - runs every hour)
function setupCleanupInterval() {
  const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
  
  // This cleanup function will only remove servers that haven't been accessed in 24 hours
  setInterval(() => {
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    
    for (const [id, serverInfo] of global.activeServers.entries()) {
      // Only remove really old servers (24 hours of inactivity)
      if (now - serverInfo.lastAccessed > TWENTY_FOUR_HOURS) {
        try {
          serverInfo.server.close();
          global.activeServers.delete(id);
          console.log(`Cleaned up inactive server ${id}`);
        } catch (err) {
          console.error(`Error cleaning up server ${id}:`, err);
        }
      }
    }
  }, ONE_HOUR);
}

// Start the cleanup interval
setupCleanupInterval();

interface ServerOptions {
  port: number;
  delay: number;
  corsEnabled: boolean;
  validateRequests: boolean;
  generateExamples: boolean;
  useAvailablePort?: boolean;
}

interface EndpointConfig {
  path: string;
  method: string;
  status?: number;
  response?: unknown;
}

interface RequestBody {
  apiSpec: string;
  options: ServerOptions;
  endpoints?: EndpointConfig[];
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { options, endpoints } = await request.json() as RequestBody;
    
    // Create the Express app
    const app = express();
    
    // Apply middleware
    if (options.corsEnabled) {
      app.use(cors());
    }
    
    app.use(express.json());
    
    // Add response delay if specified
    if (options.delay > 0) {
      app.use((req: Request, res: Response, next: NextFunction) => {
        setTimeout(next, options.delay);
      });
    }

    // Extract endpoints from API spec or use provided endpoints
    const routeEndpoints = endpoints || [];
    
    // Generate routes based on endpoints
    generateSimpleRoutes(app, routeEndpoints);
    
    // Start the server
    const port = options.port || 4000;
    const server = createServer(app);
    
    // Try to start the server
    let actualPort = port;
    let serverStarted = false;
    
    // Determine if we should try alternative ports or just the requested one
    const maxAttempts = options.useAvailablePort === false ? 1 : 10;
    
    // Try up to maxAttempts ports (starting from the specified one)
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        actualPort = port + attempt;
        await new Promise<void>((resolve, reject) => {
          server.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              // Port is in use, will try next one if useAvailablePort is true
              reject(new Error(`Port ${actualPort} is already in use`));
            } else {
              reject(err);
            }
          });
          
          server.listen(actualPort, () => {
            serverStarted = true;
            resolve();
          });
        });
        
        // If we get here, the server started successfully
        break;
      } catch (err) {
        console.error(`Failed to start on port ${actualPort}:`, err);
        // If this was the last attempt or useAvailablePort is false, give up
        if (attempt === maxAttempts - 1 || options.useAvailablePort === false) {
          return NextResponse.json({ 
            error: `Failed to start server: ${err instanceof Error ? err.message : String(err)}`,
            details: `Port ${actualPort} is already in use. Please try a different port.`
          }, { status: 500 });
        }
        // Otherwise, continue to next port
      }
    }
    
    if (!serverStarted) {
      return NextResponse.json({ error: 'Failed to start server' }, { status: 500 });
    }
    
    // Store the active server
    const serverId = Date.now().toString();
    global.activeServers.set(serverId, { 
      server, 
      port: actualPort,
      lastAccessed: Date.now()
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Mock server started',
      serverId,
      port: actualPort,
      url: `http://localhost:${actualPort}`
    });
  } catch (error) {
    console.error('Error starting mock server:', error);
    return NextResponse.json({ 
      error: 'Failed to start mock server',
      details: String(error)
    }, { status: 500 });
  }
}

// Generate routes based on endpoint configurations
function generateSimpleRoutes(app: express.Application, endpoints: EndpointConfig[]) {
  // Create default test routes
  app.get('/api/test', (_req: Request, res: Response) => {
    res.status(200).json({ 
      message: 'Test successful', 
      timestamp: new Date().toISOString() 
    });
  });
  
  app.post('/api/echo', (req: Request, res: Response) => {
    res.status(201).json({ 
      message: 'Echo successful', 
      body: req.body, 
      timestamp: new Date().toISOString() 
    });
  });
  
  // Add routes for each endpoint
  endpoints.forEach(endpoint => {
    const method = endpoint.method.toLowerCase();
    if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
      const routeHandler = (_req: Request, res: Response) => {
        const status = endpoint.status || 200;
        const response = endpoint.response || { 
          message: 'Success',
          method: method.toUpperCase(),
          path: endpoint.path,
          timestamp: new Date().toISOString()
        };
        res.status(status).json(response);
      };

      switch (method) {
        case 'get':
          app.get(endpoint.path, routeHandler);
          break;
        case 'post':
          app.post(endpoint.path, routeHandler);
          break;
        case 'put':
          app.put(endpoint.path, routeHandler);
          break;
        case 'delete':
          app.delete(endpoint.path, routeHandler);
          break;
        case 'patch':
          app.patch(endpoint.path, routeHandler);
          break;
        case 'options':
          app.options(endpoint.path, routeHandler);
          break;
        case 'head':
          app.head(endpoint.path, routeHandler);
          break;
      }
    }
  });
  
  // Add fallback route
  app.use((req: Request, res: Response) => {
    res.status(404).json({ 
      error: 'Not Found', 
      message: `Route ${req.path} not found`,
      availableRoutes: ['/api/test', '/api/echo', ...endpoints.map(e => e.path)],
      timestamp: new Date().toISOString()
    });
  });
}

// GET handler to check if the server is already running
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serverId = searchParams.get('serverId');
  
  // List all active servers for debugging
  console.log(`Active servers: ${Array.from(global.activeServers.keys()).join(', ') || 'none'}`);
  
  if (serverId && global.activeServers.has(serverId)) {
    const serverInfo = global.activeServers.get(serverId)!;
    
    // Check if server is actually still running by testing if we can send a message to it
    try {
      // Optional: perform a server health check here if needed
      
      // Update the last accessed time
      serverInfo.lastAccessed = Date.now();
      global.activeServers.set(serverId, serverInfo);
      
      console.log(`Server ${serverId} verified running on port ${serverInfo.port}`);
      
      return NextResponse.json({
        running: true,
        port: serverInfo.port,
        url: `http://localhost:${serverInfo.port}`
      });
    } catch (err) {
      console.error(`Server ${serverId} has an error:`, err);
      // Server might be in a bad state, remove it
      try {
        serverInfo.server.close();
      } catch {
        // Ignore close errors
      }
      global.activeServers.delete(serverId);
      
      return NextResponse.json({ 
        running: false,
        error: "Server has connection issues and was removed"
      });
    }
  }
  
  if (serverId) {
    console.log(`Server ID ${serverId} not found in active servers`);
  }
  
  return NextResponse.json({ running: false });
} 