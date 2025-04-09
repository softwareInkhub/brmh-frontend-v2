'use client'
import { FC, useState, useEffect } from "react";
import { ApiEndpoint } from "../types/index2";
import { Copy, Play, Square, ExternalLink, Server, Settings, Activity, AlertTriangle } from "lucide-react";

interface MockServerPanelProps {
  apiSpec: string;
  endpoints: ApiEndpoint[];
}

// Keys for localStorage
const STORAGE_KEYS = {
  SERVER_OPTIONS: 'mock-server-options',
  LOGS: 'mock-server-logs',
  SERVER_ID: 'mock-server-id',
  SERVER_URL: 'mock-server-url',
  SERVER_RUNNING: 'mock-server-running',
};

const MockServerPanel: FC<MockServerPanelProps> = ({ apiSpec, endpoints }) => {
  // Initialize state from localStorage if available
  const [isServerRunning, setIsServerRunning] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.SERVER_RUNNING);
      return stored ? JSON.parse(stored) : false;
    }
    return false;
  });
  
  const [mockServerUrl, setMockServerUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.SERVER_URL) || "";
    }
    return "";
  });
  
  const [serverId, setServerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.SERVER_ID) || "";
    }
    return "";
  });
  
  const [logs, setLogs] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  
  // Server configuration with localStorage persistence
  const [serverOptions, setServerOptions] = useState<{
    port: number;
    delay: number;
    corsEnabled: boolean;
    validateRequests: boolean;
    generateExamples: boolean;
    autoStart: boolean;
  }>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.SERVER_OPTIONS);
      return stored ? JSON.parse(stored) : {
        port: 4000,
        delay: 250,
        corsEnabled: true,
        validateRequests: true,
        generateExamples: true,
        autoStart: false,
      };
    }
    return {
    port: 4000,
    delay: 250,
    corsEnabled: true,
    validateRequests: true,
      generateExamples: true,
      autoStart: false,
    };
  });
  
  // Add a state to track if a stop operation is in progress
  const [isStoppingServer, setIsStoppingServer] = useState<boolean>(false);
  
  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SERVER_RUNNING, JSON.stringify(isServerRunning));
  }, [isServerRunning]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SERVER_URL, mockServerUrl);
  }, [mockServerUrl]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SERVER_ID, serverId);
  }, [serverId]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }, [logs]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SERVER_OPTIONS, JSON.stringify(serverOptions));
  }, [serverOptions]);
  
  // Add a log message with timestamp
  const addLog = (message: string, isError: boolean = false) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => {
      const newLogs = [`[${timestamp}] ${message}`, ...prevLogs].map((log, index) => 
        index === 0 && isError ? `<span class="text-red-500">${log}</span>` : log
      );
      // Save to localStorage immediately for extra protection
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(newLogs));
      return newLogs;
    });
  };
  
  // Check server status on mount and tab visibility change with improved error handling and retry logic
  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null;
    let isComponentMounted = true;
    
    const checkServerStatus = async () => {
      // First check local storage for server ID
      const storedServerId = localStorage.getItem(STORAGE_KEYS.SERVER_ID);
      
      if (storedServerId && storedServerId.trim() !== '') {
        try {
          // Check if server is still running
          const response = await fetch(`/api/mock-server/start?serverId=${storedServerId}`);
          
          // Only process if component is still mounted
          if (!isComponentMounted) return;
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.running) {
              // Server is still running, update state
              setIsServerRunning(true);
              setServerId(storedServerId);
              setMockServerUrl(data.url);
              console.log(`Server verified running: ${data.url}`);
            } else {
              // Server is no longer running, update local state
              if (localStorage.getItem(STORAGE_KEYS.SERVER_RUNNING) === 'true') {
                console.log('Server not running but should be - updating state');
                addLog("Mock server is no longer running. It may have been stopped or restarted.", true);
                // Update localStorage
                localStorage.setItem(STORAGE_KEYS.SERVER_RUNNING, 'false');
                localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
                setIsServerRunning(false);
                setMockServerUrl('');
              }
            }
          } else {
            console.error('Failed to check server status:', response.status, response.statusText);
          }
        } catch (error) {
          console.error("Error checking server status:", error);
          // Only update state if necessary and if the error is persistent
          // This prevents temporary network issues from affecting the UI
        }
      }
    };
    
    // Check server status when component mounts
    checkServerStatus();
    
    // Set up periodic checks every 30 seconds if the server should be running
    // This ensures we detect any server issues even when the tab remains visible
    checkInterval = setInterval(() => {
      if (localStorage.getItem(STORAGE_KEYS.SERVER_RUNNING) === 'true') {
        checkServerStatus();
      }
    }, 30000);
    
    // Also check when tab becomes visible again (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, checking server status');
        checkServerStatus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      // Set flag to prevent state updates after component unmount
      isComponentMounted = false;
      
      // Clear interval and event listener
      if (checkInterval) clearInterval(checkInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // IMPORTANT: Do NOT stop the server on component unmount!
      // This was causing the server to stop when switching tabs
    };
  }, []);
  
  // Only shutdown on beforeunload (page refresh/close), not on visibility change
  useEffect(() => {
    // Handle beforeunload event (page close/refresh)
    const handleBeforeUnload = () => {
      // We can't use async functions with beforeunload, so trigger a sync fetch
      if (isServerRunning && serverId) {
        navigator.sendBeacon('/api/mock-server/stop', JSON.stringify({ serverId }));
      }
    };
    
    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // IMPORTANT: Do NOT stop the server here - this effect cleanup runs
      // when component unmounts, which happens during tab switching with React Router
    };
  }, [isServerRunning, serverId]);
  
  // Verify if server exists before stopping
  const verifyServer = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/mock-server/start?serverId=${id}`);
      if (response.ok) {
        const data = await response.json();
        return data.running === true;
      }
      return false;
    } catch (error) {
      console.error("Error verifying server:", error);
      return false;
    }
  };
  
  // Stop mock server with improved reliability
  const stopMockServer = async () => {
    if (!serverId) {
      addLog("No server ID found, cannot stop server");
      
      // Still clean up the state in case it's inconsistent
      setMockServerUrl("");
      setIsServerRunning(false);
      setServerId("");
      localStorage.setItem(STORAGE_KEYS.SERVER_RUNNING, 'false');
      localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
      localStorage.setItem(STORAGE_KEYS.SERVER_ID, '');
      
      return;
    }
    
    // Prevent duplicate stop requests
    if (isStoppingServer) {
      addLog("Stop operation already in progress, please wait...");
      return;
    }
    
    try {
      setIsStoppingServer(true);
      addLog("Stopping mock server...");
      
      // First verify if the server actually exists
      const serverExists = await verifyServer(serverId);
      
      if (!serverExists) {
        addLog("Server not found or already stopped. Resetting client state...");
        // Reset state and return early
        setMockServerUrl("");
        setIsServerRunning(false);
        setServerId("");
        localStorage.setItem(STORAGE_KEYS.SERVER_RUNNING, 'false');
        localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
        localStorage.setItem(STORAGE_KEYS.SERVER_ID, '');
        setIsStoppingServer(false);
        return;
      }
      
      // Capture the current server ID to prevent race conditions
      const currentServerId = serverId;
      
      // Immediately clear the server ID to prevent duplicate stops
      setServerId("");
      localStorage.setItem(STORAGE_KEYS.SERVER_ID, '');
      
      // Server exists, proceed with stopping - try up to 3 times
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout
          
          const response = await fetch('/api/mock-server/stop', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              serverId: currentServerId
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          // Always reset the state regardless of server response
          setMockServerUrl("");
          setIsServerRunning(false);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.alreadyStopped) {
              addLog("Server was already stopped in another tab or request");
            } else {
              addLog("Mock server stopped successfully");
            }
            
            // Clear the localStorage values
            localStorage.setItem(STORAGE_KEYS.SERVER_RUNNING, 'false');
            localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
            
            // Success! Exit the retry loop
            setIsStoppingServer(false);
            return;
          }
          
          if (response.status === 404) {
            // Server not found, it's already gone
            addLog("Server already stopped or removed. Resetting client state...");
            localStorage.setItem(STORAGE_KEYS.SERVER_RUNNING, 'false');
            localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
            setIsStoppingServer(false);
            return;
          }
          
          // Other error, try again
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          addLog(`Attempt ${attempt + 1} failed: ${errorData.error || response.statusText}`, true);
          
          if (attempt === 2) {
            // Final attempt failed
            addLog("Failed to stop server after multiple attempts. Resetting client state...", true);
            localStorage.setItem(STORAGE_KEYS.SERVER_RUNNING, 'false');
            localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
            setIsStoppingServer(false);
          } else {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            addLog(`Retrying... (attempt ${attempt + 2})`);
          }
        } catch (fetchError: unknown) {
          // Handle network errors
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            addLog(`Attempt ${attempt + 1} timed out`, true);
          } else {
            console.error(`Error on attempt ${attempt + 1}:`, fetchError);
            addLog(`Attempt ${attempt + 1} error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`, true);
          }
          
          if (attempt === 2) {
            // Final attempt failed
            addLog("Failed to stop server after multiple attempts. Resetting client state...", true);
            
            // Reset state even if there was an error
            setMockServerUrl("");
            setIsServerRunning(false);
            localStorage.setItem(STORAGE_KEYS.SERVER_RUNNING, 'false');
            localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
            setIsStoppingServer(false);
          } else {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            addLog(`Retrying... (attempt ${attempt + 2})`);
          }
        }
      }
    } catch (error: unknown) {
      console.error("Error in stopMockServer:", error);
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`, true);
      
      // Reset state even in case of a catastrophic error
      setMockServerUrl("");
      setIsServerRunning(false);
      setServerId("");
      
      // Clear the localStorage values
      localStorage.setItem(STORAGE_KEYS.SERVER_RUNNING, 'false');
      localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
      localStorage.setItem(STORAGE_KEYS.SERVER_ID, '');
      setIsStoppingServer(false);
    }
  };
  
  // Start mock server with improved reliability
  const startMockServer = async () => {
    try {
      addLog("Starting mock server...");
      
      // Prepare endpoint data for potential fallback
      const endpointData = endpoints.map(endpoint => ({
        path: endpoint.path,
        method: endpoint.method,
        status: 200,
        response: {
          success: true,
          message: `Mock response for ${endpoint.method.toUpperCase()} ${endpoint.path}`,
          endpoint: endpoint.path,
          method: endpoint.method
        }
      }));
      
      // Use AbortController to allow timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
      
      try {
        const response = await fetch('/api/mock-server/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            apiSpec,
            options: {
              ...serverOptions,
              useAvailablePort: false // Explicitly disable using an alternative port
            },
            endpoints: endpointData
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Check if the returned URL contains the requested port
          const urlPort = new URL(data.url).port;
          const requestedPort = serverOptions.port.toString();
          
          if (urlPort !== requestedPort) {
            // The server started on a different port than requested
            addLog(`Error: Requested port ${requestedPort} is already in use. Server attempted to use port ${urlPort} instead.`, true);
            addLog("Stopping automatically created server to prevent conflicts...");
            
            // Stop the automatically created server
            try {
              await fetch('/api/mock-server/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serverId: data.serverId })
              });
              addLog("Server stopped. Please select a different port and try again.");
            } catch (stopError) {
              console.error("Error stopping auto-created server:", stopError);
            }
            
            return;
          }
          
          // If port matches, proceed as normal
          setServerId(data.serverId);
          setMockServerUrl(data.url);
          setIsServerRunning(true);
          addLog(`Mock server started at ${data.url}`);
          addLog(`Server ID: ${data.serverId}`);
          
          // Verify server is actually reachable (optional health check)
          try {
            const healthCheck = await fetch(`${data.url}/api/test`);
            if (healthCheck.ok) {
              addLog("Server health check passed");
            }
          } catch (healthErr) {
            // Just log a warning but don't stop the server
            console.warn("Server health check failed:", healthErr);
            addLog("Warning: Server may not be reachable from browser", true);
          }
        } else {
          // Handle error response
          if (data.error && (data.error.includes('already in use') || data.details?.includes('already in use'))) {
            const portMatch = data.error.match(/Port (\d+) is already in use/) || 
                              data.details?.match(/Port (\d+) is already in use/);
            const portNumber = portMatch ? portMatch[1] : serverOptions.port;
            
            addLog(`Error: Port ${portNumber} is already in use. Please select a different port.`, true);
          } else {
            addLog(`Error: ${data.error}`, true);
          }
          if (data.details && !data.details.includes('already in use')) {
            addLog(`Details: ${data.details}`);
          }
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          addLog("Error: Request timed out. The server may be taking too long to start.", true);
        } else {
          console.error("Error starting mock server:", fetchError);
          addLog(`Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`, true);
        }
      }
    } catch (error: unknown) {
      console.error("Error in startMockServer:", error);
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  };
  
  // Copy URL to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        addLog("URL copied to clipboard");
      },
      (err) => {
        console.error("Could not copy text: ", err);
        addLog("Failed to copy URL to clipboard");
      }
    );
  };
  
  // Open endpoint in browser
  const openInBrowser = (endpoint: ApiEndpoint) => {
    if (!isServerRunning || endpoint.method.toLowerCase() !== 'get') return;
    
    const url = `${mockServerUrl}${endpoint.path}`;
    window.open(url, '_blank');
    addLog(`Opening GET endpoint in browser: ${url}`);
  };
  
  // Clear logs with localStorage update
  const clearLogs = () => {
    setLogs([]);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Server size={22} className="text-blue-600" />
        <h2 className="text-2xl font-semibold text-gray-800">OpenAPI Mock Server</h2>
      </div>
      
    
      
      <p className="text-gray-600 mb-6 -mt-1 ml-9">
        Generate a mock server from your OpenAPI specification to test your API without writing backend code.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Server Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-5 py-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Settings size={18} />
                Server Configuration
              </h3>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={serverOptions.port}
                  onChange={(e) => {
                    // Handle empty input case
                    const newPort = e.target.value === '' ? 4000 : parseInt(e.target.value);
                    if (!isNaN(newPort)) {
                      setServerOptions({...serverOptions, port: newPort});
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isServerRunning}
                  min="1000"
                  max="65535"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Response Delay (ms)
                </label>
                <input
                  type="number"
                  value={serverOptions.delay}
                  onChange={(e) => {
                    const newDelay = parseInt(e.target.value);
                    setServerOptions({...serverOptions, delay: isNaN(newDelay) ? 0 : newDelay});
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isServerRunning}
                  min="0"
                  max="10000"
                />
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cors-enabled"
                    checked={serverOptions.corsEnabled}
                    onChange={(e) => setServerOptions({...serverOptions, corsEnabled: e.target.checked})}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    disabled={isServerRunning}
                  />
                  <label htmlFor="cors-enabled" className="text-sm text-gray-700">
                    Enable CORS
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="validate-requests"
                    checked={serverOptions.validateRequests}
                    onChange={(e) => setServerOptions({...serverOptions, validateRequests: e.target.checked})}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    disabled={isServerRunning}
                  />
                  <label htmlFor="validate-requests" className="text-sm text-gray-700">
                    Validate Requests
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="generate-examples"
                    checked={serverOptions.generateExamples}
                    onChange={(e) => setServerOptions({...serverOptions, generateExamples: e.target.checked})}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    disabled={isServerRunning}
                  />
                  <label htmlFor="generate-examples" className="text-sm text-gray-700">
                    Generate Example Responses
                  </label>
                </div>
              </div>
              
              <div className="pt-2">
                <button
                  onClick={isServerRunning ? stopMockServer : startMockServer}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium ${
                    isServerRunning
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  } transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={!apiSpec || isStoppingServer}
                >
                  {isStoppingServer ? (
                    <>
                      <Square size={16} className="animate-pulse" />
                      Stopping Server...
                    </>
                  ) : isServerRunning ? (
                    <>
                      <Square size={16} />
                      Stop Mock Server
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Start Mock Server
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Server Status */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-5 py-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Activity size={18} />
                Server Status
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isServerRunning ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <span className="text-sm font-medium">
                  {isServerRunning ? "Simulation Running" : "Stopped"}
                </span>
              </div>
              
              {isServerRunning && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-800">Simulated Server URL</p>
                    <button
                      onClick={() => copyToClipboard(mockServerUrl)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Copy to clipboard"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-blue-700 font-mono break-all">{mockServerUrl}</p>
                  <div className="mt-2 py-1 px-2 bg-yellow-100 border border-yellow-200 rounded text-xs text-yellow-800">
                    <strong>Note:</strong> This URL is for demonstration only. No actual server is running on this port.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* API Endpoints & Logs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Endpoints */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3">
              <h3 className="text-lg font-medium text-white">API Endpoints</h3>
            </div>
            <div className="p-4">
              <div className="overflow-y-auto max-h-72 pr-1">
                {endpoints.length > 0 ? (
                  <div className="space-y-2">
                    {endpoints.map((endpoint, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedEndpoint === endpoint ? "border-blue-400 bg-blue-50" : "border-gray-200"
                        }`}
                        onClick={() => setSelectedEndpoint(endpoint)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                              endpoint.method === 'get' ? 'bg-green-100 text-green-800' :
                              endpoint.method === 'post' ? 'bg-blue-100 text-blue-800' :
                              endpoint.method === 'put' ? 'bg-yellow-100 text-yellow-800' :
                              endpoint.method === 'delete' ? 'bg-red-100 text-red-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {endpoint.method}
                            </span>
                            <span className="font-mono text-sm">{endpoint.path}</span>
                          </div>
                          {isServerRunning && endpoint.method.toLowerCase() === 'get' && (
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                openInBrowser(endpoint); 
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="View simulated response"
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}
                        </div>
                        {selectedEndpoint === endpoint && (
                          <div className="mt-2 text-xs text-gray-600">
                            {endpoint.summary || "No description available"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic py-10 text-center">No endpoints available. Generate an API specification first.</div>
                )}
              </div>
            </div>
          </div>
          
          {/* Server Logs */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-5 py-3 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">Server Logs</h3>
              <button
                onClick={clearLogs}
                className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                Clear
              </button>
            </div>
            <div className="bg-gray-900 text-gray-200 font-mono text-sm h-40 overflow-y-auto p-4">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="mb-1" dangerouslySetInnerHTML={{ __html: log }}></div>
                ))
              ) : (
                <div className="text-gray-500 italic text-center py-10">No server logs yet. Start the mock server to see activity.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockServerPanel; 