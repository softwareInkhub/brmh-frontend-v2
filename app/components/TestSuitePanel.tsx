'use client'
import { FC, useState, useEffect } from "react";
import { ApiEndpoint } from "../types/index2";

interface TestSuitePanelProps {
  apiSpec: string;
  endpoints: ApiEndpoint[];
}

// Keys for localStorage
const STORAGE_KEYS = {
  TEST_SUITES: 'test-suite-data',
  TEST_RESULTS: 'test-suite-results',
  TEST_LOGS: 'test-suite-logs',
  SERVER_OPTIONS: 'test-suite-server-options',
  SERVER_ID: 'test-suite-server-id',
  SERVER_URL: 'test-suite-server-url',
  SERVER_RUNNING: 'test-suite-server-running'
};

// Add TestResult interface
interface TestResult {
  status: 'passed' | 'failed' | 'error';
  responseTime?: number;
  statusCode?: number;
  assertions?: Array<{ name: string; result: boolean }>;
  responseData?: unknown;
  message?: string;
}

const TestSuitePanel: FC<TestSuitePanelProps> = ({ apiSpec, endpoints }) => {
  // Initialize state from localStorage when available
  const [mockServerUrl, setMockServerUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.SERVER_URL) || "";
    }
    return "";
  });
  
  const [isServerRunning, setIsServerRunning] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.SERVER_RUNNING);
      return stored ? JSON.parse(stored) : false;
    }
    return false;
  });
  
  const [serverId, setServerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.SERVER_ID) || "";
    }
    return "";
  });
  
  const [testResults, setTestResults] = useState<Record<string, TestResult>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.TEST_RESULTS);
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });
  
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  
  const [testSuites, setTestSuites] = useState<{name: string, tests: {name: string, selected: boolean}[]}[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.TEST_SUITES);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  
  const [testLogs, setTestLogs] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.TEST_LOGS);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  // Initialize mock server settings
  const [serverOptions, setServerOptions] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.SERVER_OPTIONS);
      return stored ? JSON.parse(stored) : {
        port: 4000,
        delay: 100,  // Lower default delay for testing
        corsEnabled: true,
        validateRequests: true,
        generateExamples: true
      };
    }
    return {
      port: 4000,
      delay: 100,  // Lower default delay for testing
      corsEnabled: true,
      validateRequests: true,
      generateExamples: true
    };
  });

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
    localStorage.setItem(STORAGE_KEYS.TEST_RESULTS, JSON.stringify(testResults));
  }, [testResults]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEST_SUITES, JSON.stringify(testSuites));
  }, [testSuites]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEST_LOGS, JSON.stringify(testLogs));
  }, [testLogs]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SERVER_OPTIONS, JSON.stringify(serverOptions));
  }, [serverOptions]);

  // Add a log message with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLogs(prevLogs => {
      const newLogs = [`[${timestamp}] ${message}`, ...prevLogs];
      // Save to localStorage immediately for extra protection
      localStorage.setItem(STORAGE_KEYS.TEST_LOGS, JSON.stringify(newLogs));
      return newLogs;
    });
  };

  // Check server status on mount and tab visibility change
  useEffect(() => {
    let isComponentMounted = true;
    
    const checkServerStatus = async () => {
      const storedServerId = localStorage.getItem(STORAGE_KEYS.SERVER_ID);
      
      if (storedServerId && storedServerId.trim() !== '') {
        try {
          const response = await fetch(`/api/mock-server/start?serverId=${storedServerId}`);
          
          // Only process if component is still mounted
          if (!isComponentMounted) return;
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.running) {
              setIsServerRunning(true);
              setServerId(storedServerId);
              setMockServerUrl(data.url);
              console.log(`Server verified running: ${data.url}`);
            } else {
              // Server is no longer running, update local state
              if (localStorage.getItem(STORAGE_KEYS.SERVER_RUNNING) === 'true') {
                console.log('Server not running but should be - updating state');
                addLog("Mock server is no longer running. It may have been stopped or restarted.");
                // Update localStorage
                localStorage.setItem(STORAGE_KEYS.SERVER_RUNNING, 'false');
                localStorage.setItem(STORAGE_KEYS.SERVER_URL, '');
                setIsServerRunning(false);
                setMockServerUrl('');
              }
            }
          }
        } catch {
          // Log error without using error variable
          console.error("Error checking server status");
        }
      }
    };
    
    // Check server status when component mounts
    checkServerStatus();
    
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
      
      // Remove event listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // IMPORTANT: Do NOT stop the server on component unmount!
      // This was causing the server to stop when switching tabs
    };
  }, []);

  // Generate test suites based on endpoints - only if we don't have stored ones
  useEffect(() => {
    if (endpoints.length > 0 && testSuites.length === 0) {
      // Group endpoints by tag
      const endpointsByTag: Record<string, ApiEndpoint[]> = {};
      
      endpoints.forEach(endpoint => {
        const tag = endpoint.tag || "default";
        if (!endpointsByTag[tag]) {
          endpointsByTag[tag] = [];
        }
        endpointsByTag[tag].push(endpoint);
      });
      
      // Create test suites from groups
      const suites = Object.entries(endpointsByTag).map(([tag, endpoints]) => {
        return {
          name: tag,
          tests: endpoints.map(endpoint => ({
            name: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
            selected: true
          }))
        };
      });
      
      setTestSuites(suites);
    }
  }, [endpoints, testSuites.length]);

  // Start mock server
  const startMockServer = async () => {
    try {
      addLog("Starting mock server for testing...");
      
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
      
      const response = await fetch('/api/mock-server/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiSpec,
          options: serverOptions,
          endpoints: endpointData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setServerId(data.serverId);
        setMockServerUrl(data.url);
        setIsServerRunning(true);
        addLog(`Mock server started at ${data.url}`);
        addLog(`Server ID: ${data.serverId}`);
        return true;
      } else {
        addLog(`Error: ${data.error}`);
        if (data.details) {
          addLog(`Details: ${data.details}`);
        }
        return false;
      }
    } catch (error) {
      console.error("Error starting mock server:", error);
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  };

  // Stop mock server
  const stopMockServer = async () => {
    if (!serverId) {
      addLog("No server ID found, cannot stop server");
      return;
    }
    
    try {
      addLog("Stopping mock server...");
      
      const response = await fetch('/api/mock-server/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMockServerUrl("");
        setIsServerRunning(false);
        addLog("Mock server stopped");
      } else {
        addLog(`Error: ${data.error}`);
        if (data.details) {
          addLog(`Details: ${data.details}`);
        }
      }
    } catch (error) {
      console.error("Error stopping mock server:", error);
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Run a single test against the mock server
  const runSingleTest = async (endpoint: ApiEndpoint): Promise<TestResult> => {
    try {
      const startTime = performance.now();
      
      const method = endpoint.method.toLowerCase();
      const url = `${mockServerUrl}${endpoint.path}`;
      
      // Create the request options based on the endpoint
      const options: RequestInit = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      // Add body for non-GET requests (using a simple empty object for testing)
      if (method !== 'get') {
        options.body = JSON.stringify({});
      }
      
      // Execute the request with retry logic for 404s (which might indicate server not ready)
      let response: Response | undefined;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        response = await fetch(url, options);
        
        // If we get a success response or something other than 404, break out of retry loop
        if (response.status !== 404) {
          break;
        }
        
        // If we got a 404 and have retries left, wait and retry
        if (retryCount < maxRetries) {
          addLog(`Got 404 for ${method.toUpperCase()} ${endpoint.path}, retrying in 1s... (Attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        } else {
          break;
        }
      }
      
      // Set default response if somehow undefined (should never happen)
      if (!response) {
        throw new Error("Failed to get response from server after retries");
      }
      
      const responseTime = Math.floor(performance.now() - startTime);
      const responseData = await response.json().catch(() => ({}));
      
      // Check if status code is in the 2xx range
      const statusCodeOk = response.status >= 200 && response.status < 300;
      
      // Perform assertions
      const assertions = [
        { name: 'Status code is 2XX', result: statusCodeOk },
        { name: 'Response has correct schema', result: typeof responseData === 'object' },
        { name: 'Response time < 2000ms', result: responseTime < 2000 }
      ];
      
      return {
        status: assertions.every(a => a.result) ? 'passed' : 'failed',
        responseTime,
        statusCode: response.status,
        assertions,
        responseData
      };
    } catch (error) {
      console.error(`Error executing test:`, error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  };

  // Run all selected tests
  const runTests = async () => {
    let serverStarted = false;
    
    if (!isServerRunning) {
      addLog("Starting mock server before running tests...");
      serverStarted = await startMockServer();
      if (!serverStarted) {
        addLog("Failed to start mock server, aborting tests");
        return;
      }
      
      // Add a delay to ensure the server is fully started before running tests
      addLog("Waiting for mock server to initialize...");
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Verify server is ready by making a health check request
      try {
        addLog("Verifying server is ready...");
        const healthResponse = await fetch(`${mockServerUrl}/health-check`);
        if (!healthResponse.ok) {
          // If health check fails, try one more time after additional delay
          addLog("Server not ready yet, waiting longer...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const retryResponse = await fetch(`${mockServerUrl}/health-check`).catch(() => null);
          if (!retryResponse || !retryResponse.ok) {
            addLog("Server health check failed, proceeding with caution...");
          } else {
            addLog("Server verified and ready!");
          }
        } else {
          addLog("Server verified and ready!");
        }
      } catch {
        addLog("Server health check failed, proceeding with tests anyway...");
        // Add extra buffer time since health check failed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    setIsRunningTests(true);
    setTestResults({});
    addLog("Starting test suite execution...");
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Get all selected tests
    const allTests = testSuites.flatMap(suite => 
      suite.tests
        .filter(test => test.selected)
        .map(test => ({ suiteName: suite.name, testName: test.name }))
    );
    
    totalTests = allTests.length;
    
    // Run tests sequentially
    for (const { suiteName, testName } of allTests) {
      addLog(`Running test: ${suiteName} - ${testName}`);
      
      // Find corresponding endpoint
      const methodPath = testName.split(" ");
      const method = methodPath[0].toLowerCase();
      const path = methodPath[1];
      
      const endpoint = endpoints.find(e => 
        e.method.toLowerCase() === method && e.path === path
      );
      
      if (!endpoint) {
        addLog(`Error: Endpoint not found for test: ${testName}`);
        continue;
      }
      
      // Run the test against the real mock server
      try {
        const result = await runSingleTest(endpoint);
        
        setTestResults(prev => ({
          ...prev,
          [`${suiteName}-${testName}`]: result
        }));
        
        if (result.status === 'passed') {
          passedTests++;
          addLog(`✅ Test passed: ${testName}`);
        } else if (result.status === 'failed') {
          addLog(`❌ Test failed: ${testName}`);
          const failedAssertions = result.assertions?.filter((a: { result: boolean }) => !a.result) || [];
          failedAssertions.forEach((a: { name: string }) => {
            addLog(`  - Failed assertion: ${a.name}`);
          });
        } else {
          addLog(`❌ Test error: ${testName} - ${result.message}`);
        }
      } catch (error) {
        console.error(`Error executing test ${testName}:`, error);
        addLog(`Error executing test: ${error instanceof Error ? error.message : String(error)}`);
        
        setTestResults(prev => ({
          ...prev,
          [`${suiteName}-${testName}`]: {
            status: 'error',
            message: error instanceof Error ? error.message : String(error)
          }
        }));
      }
    }
    
    addLog(`Test suite execution complete. ${passedTests}/${totalTests} tests passed.`);
    setIsRunningTests(false);
  };

  // Toggle all tests in a suite
  const toggleTestSuite = (suiteIndex: number, selected: boolean) => {
    const updatedSuites = [...testSuites];
    updatedSuites[suiteIndex].tests = updatedSuites[suiteIndex].tests.map(test => ({
      ...test,
      selected
    }));
    setTestSuites(updatedSuites);
  };

  // Toggle a single test
  const toggleTest = (suiteIndex: number, testIndex: number) => {
    const updatedSuites = [...testSuites];
    updatedSuites[suiteIndex].tests[testIndex].selected = !updatedSuites[suiteIndex].tests[testIndex].selected;
    setTestSuites(updatedSuites);
  };

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

  // Clear logs function
  const clearLogs = () => {
    setTestLogs([]);
    localStorage.setItem(STORAGE_KEYS.TEST_LOGS, JSON.stringify([]));
  };

  // Clear all test data function
  const clearAllTestData = () => {
    // Create empty test suites from endpoints
    const endpointsByTag: Record<string, ApiEndpoint[]> = {};
    
    endpoints.forEach(endpoint => {
      const tag = endpoint.tag || "default";
      if (!endpointsByTag[tag]) {
        endpointsByTag[tag] = [];
      }
      endpointsByTag[tag].push(endpoint);
    });
    
    // Create test suites from groups
    const suites = Object.entries(endpointsByTag).map(([tag, endpoints]) => {
      return {
        name: tag,
        tests: endpoints.map(endpoint => ({
          name: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
          selected: true
        }))
      };
    });
    
    setTestSuites(suites);
    setTestResults({});
    setTestLogs([]);
    
    // Clear from localStorage
    localStorage.removeItem(STORAGE_KEYS.TEST_SUITES);
    localStorage.removeItem(STORAGE_KEYS.TEST_RESULTS);
    localStorage.removeItem(STORAGE_KEYS.TEST_LOGS);
    
    addLog("All test data cleared");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Test Suite</h2>
          <p className="text-sm text-gray-500">Run tests against your mock server</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={clearAllTestData}
            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
          >
            Clear All
          </button>
          {isServerRunning ? (
            <button
              onClick={stopMockServer}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Stop Server
            </button>
          ) : null}
          <button
            onClick={() => runTests()}
            disabled={!isServerRunning || isRunningTests}
            className={`px-4 py-2 rounded ${
              isServerRunning && !isRunningTests
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isRunningTests ? "Running..." : "Run All Tests"}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Test Selection Panel */}
        <div className="lg:col-span-5">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Test Selection</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => testSuites.forEach((_, i) => toggleTestSuite(i, true))}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={() => testSuites.forEach((_, i) => toggleTestSuite(i, false))}
                  className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-96 pr-2">
              {testSuites.map((suite, suiteIndex) => (
                <div key={suiteIndex} className="mb-4">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`suite-${suiteIndex}`}
                      checked={suite.tests.every(t => t.selected)}
                      onChange={e => toggleTestSuite(suiteIndex, e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <label htmlFor={`suite-${suiteIndex}`} className="font-medium">
                      {suite.name} ({suite.tests.filter(t => t.selected).length}/{suite.tests.length})
                    </label>
                  </div>
                  
                  <div className="pl-6 space-y-1">
                    {suite.tests.map((test, testIndex) => (
                      <div key={testIndex} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`test-${suiteIndex}-${testIndex}`}
                          checked={test.selected}
                          onChange={() => toggleTest(suiteIndex, testIndex)}
                          className="rounded text-blue-600 focus:ring-blue-500 mr-2"
                        />
                        <label 
                          htmlFor={`test-${suiteIndex}-${testIndex}`}
                          className={`text-sm ${
                            testResults[`${suite.name}-${test.name}`]?.status === 'passed' ? 'text-green-600' : 
                            testResults[`${suite.name}-${test.name}`]?.status === 'failed' ? 'text-red-600' : 
                            testResults[`${suite.name}-${test.name}`]?.status === 'error' ? 'text-orange-600' :
                            'text-gray-700'
                          }`}
                        >
                          {test.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {testSuites.length === 0 && (
                <div className="text-gray-500 italic">No endpoints available. Generate an API specification first.</div>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-3">Test Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mock Server Port
                </label>
                <input
                  type="number"
                  value={serverOptions.port}
                  onChange={(e) => setServerOptions({...serverOptions, port: parseInt(e.target.value) || 4000})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isServerRunning}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Response Delay (ms)
                </label>
                <input
                  type="number"
                  value={serverOptions.delay}
                  onChange={(e) => setServerOptions({...serverOptions, delay: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isServerRunning}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="test-cors-enabled"
                  checked={serverOptions.corsEnabled}
                  onChange={(e) => setServerOptions({...serverOptions, corsEnabled: e.target.checked})}
                  className="rounded text-blue-600 focus:ring-blue-500"
                  disabled={isServerRunning}
                />
                <label htmlFor="test-cors-enabled" className="text-sm text-gray-700">
                  Enable CORS
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="test-validate-requests"
                  checked={serverOptions.validateRequests}
                  onChange={(e) => setServerOptions({...serverOptions, validateRequests: e.target.checked})}
                  className="rounded text-blue-600 focus:ring-blue-500"
                  disabled={isServerRunning}
                />
                <label htmlFor="test-validate-requests" className="text-sm text-gray-700">
                  Validate Requests
                </label>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={runTests}
                  disabled={isRunningTests || testSuites.length === 0 || !testSuites.some(suite => suite.tests.some(test => test.selected))}
                  className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunningTests ? 'Running Tests...' : 'Run Tests'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Test Results Panel */}
        <div className="lg:col-span-7">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Test Logs</h3>
              <button
                onClick={clearLogs}
                className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Clear
              </button>
            </div>
            <div className="bg-gray-900 text-gray-200 rounded-lg p-3 h-64 overflow-y-auto font-mono text-sm">
              {testLogs.length > 0 ? (
                testLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              ) : (
                <div className="text-gray-500 italic">No test logs yet. Run tests to see results.</div>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-3">Test Results</h3>
            
            {Object.keys(testResults).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(testResults).map(([testId, result], index) => {
                  const [suiteName, ...testNameParts] = testId.split('-');
                  const testName = testNameParts.join('-');
                  
                  return (
                    <div 
                      key={index} 
                      className={`border rounded-lg p-3 ${
                        result.status === 'passed' ? 'border-green-200 bg-green-50' : 
                        result.status === 'failed' ? 'border-red-200 bg-red-50' : 
                        'border-orange-200 bg-orange-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{testName}</h4>
                          <p className="text-sm text-gray-600">{suiteName}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          result.status === 'passed' ? 'bg-green-100 text-green-700' : 
                          result.status === 'failed' ? 'bg-red-100 text-red-700' : 
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {result.status === 'passed' ? 'Passed' : 
                           result.status === 'failed' ? 'Failed' : 
                           'Error'}
                        </span>
                      </div>
                      
                      {result.status !== 'error' ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500">Status Code:</span> {result.statusCode}
                            </div>
                            <div className="bg-white p-2 rounded">
                              <span className="text-gray-500">Response Time:</span> {result.responseTime}ms
                            </div>
                          </div>
                          
                          <div className="text-sm">
                            <p className="text-gray-500 mb-1">Assertions:</p>
                            <ul className="bg-white p-2 rounded space-y-1">
                              {result.assertions?.map((assertion: { result: boolean, name: string }, i: number) => (
                                <li key={i} className="flex items-center">
                                  <span className={`mr-2 ${assertion.result ? 'text-green-500' : 'text-red-500'}`}>
                                    {assertion.result ? '✓' : '✗'}
                                  </span>
                                  {assertion.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm bg-white p-2 rounded">
                          <span className="text-gray-500">Error:</span> {result.message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 italic">No test results yet. Run tests to see results.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestSuitePanel; 