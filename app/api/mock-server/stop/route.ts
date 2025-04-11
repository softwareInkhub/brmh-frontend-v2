import { NextRequest, NextResponse } from 'next/server';
import { Server } from 'http';

interface ServerInfo {
  server: Server;
  port: number;
  lastAccessed: number;
}

// Define the global type for active servers
declare global {
  // eslint-disable-next-line no-var
  var activeServers: Map<string, ServerInfo>;
  // eslint-disable-next-line no-var
  var recentlyClosed: Map<string, number>; // Track recently closed server IDs
}

// Initialize the global maps if they don't exist
if (!global.activeServers) {
  global.activeServers = new Map();
}

if (!global.recentlyClosed) {
  global.recentlyClosed = new Map();
}

// Cleanup old entries from the recently closed map every hour
function setupRecentlyClosedCleanup() {
  const ONE_HOUR = 60 * 60 * 1000;
  
  setInterval(() => {
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    
    // Remove entries older than 5 minutes
    for (const [id, timestamp] of global.recentlyClosed.entries()) {
      if (now - timestamp > FIVE_MINUTES) {
        global.recentlyClosed.delete(id);
      }
    }
  }, ONE_HOUR);
}

setupRecentlyClosedCleanup();

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { serverId } = body as { serverId: string };
    
    if (!serverId) {
      return NextResponse.json({ error: 'Server ID is required' }, { status: 400 });
    }
    
    // Check if the server was recently closed (to prevent duplicate stop requests)
    if (global.recentlyClosed.has(serverId)) {
      console.log(`Server ID ${serverId} was recently stopped, returning success to prevent duplicate processing`);
      return NextResponse.json({ 
        success: true, 
        message: 'Mock server was already stopped recently',
        alreadyStopped: true
      });
    }
    
    // Check if the server exists
    if (!global.activeServers?.has(serverId)) {
      console.log(`Server ID ${serverId} not found in active servers map`);
      
      // Add to recently closed list even though it wasn't found (defensive programming)
      global.recentlyClosed.set(serverId, Date.now());
      
      return NextResponse.json({ 
        error: 'Server not found',
        message: `No active server found with ID: ${serverId}`
      }, { status: 404 });
    }
    
    // Get the server and stop it
    const serverInfo = global.activeServers.get(serverId)!;
    const { server, port } = serverInfo;
    
    try {
      // Set a timeout to force server closure if it takes too long
      const serverClosePromise = new Promise<void>((resolve, reject) => {
        const closeTimeout = setTimeout(() => {
          console.log(`Server close timed out for ID ${serverId}, forcing removal`);
          // Force server removal from map regardless of close success
          global.activeServers.delete(serverId);
          // Track that we've closed this server
          global.recentlyClosed.set(serverId, Date.now());
          resolve(); // Resolve anyway to avoid hanging
        }, 5000); // 5 second timeout
        
        server.close((err?: Error) => {
          clearTimeout(closeTimeout);
          if (err) {
            console.error(`Error closing server ${serverId}:`, err);
            reject(err);
          } else {
            console.log(`Successfully closed server ${serverId} on port ${port}`);
            resolve();
          }
        });
      });
      
      await serverClosePromise;
      
      // Remove the server from the active servers map
      global.activeServers.delete(serverId);
      
      // Add to recently closed list
      global.recentlyClosed.set(serverId, Date.now());
      
      return NextResponse.json({ 
        success: true, 
        message: 'Mock server stopped'
      });
    } catch (closeError) {
      console.error(`Error closing server ${serverId}:`, closeError);
      
      // Remove from map anyway since we can't recover
      global.activeServers.delete(serverId);
      
      // Track that we've tried to close this server
      global.recentlyClosed.set(serverId, Date.now());
      
      return NextResponse.json({ 
        success: true, // Return success even if there was an error closing
        message: 'Mock server forced to stop due to close error',
        warning: String(closeError)
      });
    }
  } catch (error) {
    console.error('Error processing stop request:', error);
    return NextResponse.json({ 
      error: 'Failed to stop mock server',
      details: String(error)
    }, { status: 500 });
  }
}

// GET handler to list all active servers
export async function GET(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: NextRequest
) {
  if (!global.activeServers) {
    return NextResponse.json({ activeServers: [] });
  }
  
  const serverList = Array.from(global.activeServers.entries()).map(
    ([id, { port, lastAccessed }]) => ({
      id,
      port,
      url: `http://localhost:${port}`,
      lastAccessed: new Date(lastAccessed).toISOString()
    })
  );
  
  return NextResponse.json({ 
    activeServers: serverList,
    recentlyClosed: Array.from(global.recentlyClosed.keys())
  });
} 