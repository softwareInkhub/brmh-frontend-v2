'use client';
import React, { useState, useRef } from 'react';
import yaml from 'js-yaml';
import JSZip from 'jszip';

const CONTEXTS = [
  {
    label: 'Create Namespace',
    value: 'create-namespace',
    context: 'You are an expert in BRMH. Generate a namespace using openApi specs with schema routes and methods and make sure to include all the necessary information to create a namespace in BRMH. dont miss closing brackets',
  },
  {
    label: 'Create Schema of a Namespace',
    value: 'create-schema',
    context: 'You are an expert in BRMH. Generate a JSON schema for a namespace in BRMH.',
  },
  {
    label: 'Create AWS Lambda Function',
    value: 'create-lambda',
    context: 'You are an expert in AWS and BRMH. Generate code for an AWS Lambda function for BRMH.',
  },
  {
    label: 'Create Method/API for Namespace',
    value: 'create-method',
    context: 'You are an expert in BRMH. Generate an API method for a namespace in BRMH.',
  },
  {
    label: 'Build Complex API Workflow',
    value: 'build-workflow',
    context: 'You are an expert in BRMH. Build a complex API workflow using existing namespaces.',
  },
  {
    label: 'Create AWS StepFunction',
    value: 'create-stepfunction',
    context: 'You are an expert in AWS Step Functions and BRMH. Generate a StepFunction definition for BRMH.',
  },
];

function autoFormatOutput(output: string): { type: 'json' | 'yaml' | 'code' | 'text', formatted: string } {
  // Replace all literal \n with real newlines
  const normalized = output.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

  // Try JSON
  try {
    const json = JSON.parse(normalized);
    return { type: 'json', formatted: JSON.stringify(json, null, 2) };
  } catch {}

  // Try YAML
  try {
    const doc = yaml.load(normalized);
    if (typeof doc === 'object') {
      return { type: 'yaml', formatted: yaml.dump(doc) };
    }
  } catch {}

  // Try code (simple heuristic: starts with export/function/const/let/var or contains =>)
  const codeLike = /^\s*(export\s+)?(const|let|var|function)\s|\s=>\s/.test(normalized) || normalized.trim().startsWith('import ');
  if (codeLike) {
    return { type: 'code', formatted: normalized };
  }

  // Fallback: plain text
  return { type: 'text', formatted: normalized };
}

export default function LLMDashboard() {
  const [selected, setSelected] = useState(CONTEXTS[0]);
  const [message, setMessage] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [testEvent, setTestEvent] = useState('{"key": "value"}');
  const [testResult, setTestResult] = useState('');
  const [testError, setTestError] = useState('');
  const [mockResult, setMockResult] = useState('');
  const [mockError, setMockError] = useState('');
  const testOutputRef = useRef<HTMLPreElement>(null);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployName, setDeployName] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState('');
  const [deployError, setDeployError] = useState('');
  const [deploySuccess, setDeploySuccess] = useState('');
  const [deployRuntime, setDeployRuntime] = useState('nodejs22.x');
  const [deployHandler, setDeployHandler] = useState('index.handler');
  const [deployMemory, setDeployMemory] = useState('128');
  const [deployTimeout, setDeployTimeout] = useState('3');

  const { type: outputType, formatted: autoFormatted } = autoFormatOutput(output);

  // Extract code from output (for modal)
  let codeForDeploy = '';
  try {
    const parsed = JSON.parse(output);
    if (parsed.code && parsed.code['index.js']) {
      codeForDeploy = parsed.code['index.js'];
    } else {
      codeForDeploy = autoFormatted;
    }
  } catch {
    codeForDeploy = autoFormatted;
  }

  const handleSend = async () => {
    setLoading(true);
    setStreaming(true);
    setOutput('');
    const prompt = `${selected.context}\n\n${message}`;
    
    try {
      const response = await fetch('http://localhost:5000/llm/generate-schema/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setStreaming(false);
          break;
        }
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setStreaming(false);
              break;
            }
            setOutput(prev => prev + data);
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setOutput('Error: ' + (error as Error).message);
    } finally {
    setLoading(false);
    }
  };

  const handleTestLambda = async () => {
    setTestError('');
    setTestResult('');
    try {
      const code = output;
      const event = JSON.parse(testEvent);
      // eslint-disable-next-line no-new-func
      const fn = new Function('event', `
        let exports = {};
        ${code}
        return (typeof handler === 'function' ? handler : exports.handler)(event);
      `);
      const result = await fn(event);
      setTestResult(JSON.stringify(result, null, 2));
      setTimeout(() => {
        testOutputRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setTestError((err as any).message || String(err));
    }
  };


  const handleShowTokenCount = async () => {
    setTokenError('');
    setTokenCount(null);
    try {
      const response = await fetch('http://localhost:5000/llm/count-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: output }),
      });
      const data = await response.json();
      if (data.tokenCount !== undefined) {
        setTokenCount(data.tokenCount);
      } else {
        setTokenError('Could not count tokens.');
      }
    } catch (err: any) {
      setTokenError(err.message || String(err));
    }
  };

  // Add function to check Lambda status
  const checkLambdaStatus = async (functionName: string): Promise<{ isReady: boolean; state?: string }> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_AWS_URL}/api/aws/lambda/${encodeURIComponent(functionName)}`);
      if (!response.ok) {
        throw new Error('Failed to check Lambda status');
      }
      const data = await response.json();
      return { 
        isReady: data.state !== 'Pending', 
        state: data.state 
      };
    } catch (error) {
      console.error('Error checking Lambda status:', error);
      return { isReady: false };
    }
  };

  // Add function to wait for Lambda to be ready
  const waitForLambdaReady = async (functionName: string, maxAttempts = 30): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
      const { isReady, state } = await checkLambdaStatus(functionName);
      setDeployStatus(`Waiting for Lambda function to be ready... Current state: ${state || 'Unknown'} (${i + 1}/${maxAttempts})`);
      
      if (isReady) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between checks
    }
    return false;
  };

  // Add function to upload code with retries
  const uploadCodeWithRetry = async (functionName: string, formData: FormData, maxRetries = 5): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        setDeployStatus(`Uploading Lambda code... Attempt ${i + 1}/${maxRetries}`);
        const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_AWS_URL}/api/aws/lambda/${encodeURIComponent(functionName)}/code`, {
          method: 'PUT',
          body: formData,
        });

        if (uploadRes.ok) {
          return true;
        }

        const data = await uploadRes.json().catch(() => ({}));
        if (data.message?.includes('Pending') || data.message?.includes('Creating')) {
          setDeployStatus(`Lambda still creating, waiting before retry... (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
          continue;
        }
        throw new Error(data.message || 'Failed to upload Lambda code');
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        setDeployStatus(`Upload failed, retrying... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    return false;
  };

  const handleDeploy = async () => {
    setDeployError('');
    setDeploySuccess('');
    setDeployStatus('');
    
    if (!deployName.trim()) {
      setDeployError('Lambda function name is required');
      return;
    }
    if (!codeForDeploy.trim()) {
      setDeployError('Lambda code is required');
      return;
    }
    
    setDeploying(true);
    try {
      // 1. Create Lambda function
      setDeployStatus('Creating Lambda function...');
      const createRes = await fetch(`${process.env.NEXT_PUBLIC_AWS_URL}/api/aws/lambda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: deployName,
          runtime: deployRuntime,
          handler: deployHandler,
          memorySize: parseInt(deployMemory),
          timeout: parseInt(deployTimeout),
        }),
      });
      
      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create Lambda function');
      }

      // 2. Wait for Lambda to be ready
      const isReady = await waitForLambdaReady(deployName);
      if (!isReady) {
        throw new Error('Lambda function creation timed out');
      }

      // 3. Upload code with retry logic
      const zip = new JSZip();
      zip.file('index.js', codeForDeploy);
      const blob = await zip.generateAsync({ type: 'blob' });
      const formData = new FormData();
      formData.append('file', new File([blob], 'lambda.zip', { type: 'application/zip' }));
      
      const uploadSuccess = await uploadCodeWithRetry(deployName, formData);
      if (!uploadSuccess) {
        throw new Error('Failed to upload Lambda code after multiple attempts');
      }

      setDeploySuccess('Lambda created and code uploaded successfully!');
      setShowDeployModal(false);
      setDeployName('');
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeploying(false);
      setDeployStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">LLM Dashboard (BRMH)</h1>
          <button
            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-200 transition-colors"
            onClick={handleShowTokenCount}
            disabled={!output}
          >
            Show Token Count
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: Input Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Use Case</label>
        <select
                className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          value={selected.value}
          onChange={e => setSelected(CONTEXTS.find(c => c.value === e.target.value)!)}
        >
          {CONTEXTS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
            <div className="bg-white rounded-2xl shadow p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Context</label>
        <textarea
                className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          rows={2}
          value={selected.context}
          onChange={e => setSelected({ ...selected, context: e.target.value })}
        />
      </div>
            <div className="bg-white rounded-2xl shadow p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
        <textarea
                className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          rows={3}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe your requirements..."
        />
      </div>
      <button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:from-blue-600 hover:to-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        onClick={handleSend}
        disabled={loading || !message.trim()}
      >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  {streaming ? 'Streaming...' : 'Generating...'}
                </div>
              ) : (
                'Send to LLM'
              )}
            </button>
            {tokenCount !== null && (
              <div className="mt-2 text-blue-700 text-sm font-medium">Token count: {tokenCount}</div>
            )}
            {tokenError && <div className="mt-2 text-red-500 text-sm font-medium">{tokenError}</div>}
          </div>
          {/* Right: Output Section */}
          <div className="bg-white rounded-2xl shadow p-6 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <label className="text-lg font-semibold text-gray-700">LLM Output</label>
              {outputType === 'code' && (
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  onClick={() => setShowDeployModal(true)}
                >
                  Deploy to Lambda
      </button>
              )}
            </div>
            <div className="flex-1 overflow-x-auto">
        {outputType === 'code' ? (
                <pre className="bg-gray-900 text-white p-4 rounded-lg min-h-[120px] whitespace-pre-wrap overflow-x-auto text-sm">
            <code>{autoFormatted}</code>
          </pre>
        ) : (
                <pre className="bg-gray-50 p-4 rounded-lg min-h-[120px] whitespace-pre-wrap overflow-x-auto text-sm">
            {autoFormatted}
            {streaming && <span className="animate-pulse">▋</span>}
          </pre>
        )}
      </div>
          </div>
        </div>
      </div>

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Deploy Lambda Function</h2>
            <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowDeployModal(false)}
            >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
            </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lambda Function Name</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={deployName}
                      onChange={e => setDeployName(e.target.value)}
                      placeholder="my-brmh-lambda"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Runtime</label>
                    <select 
                      className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={deployRuntime} 
                      onChange={e => setDeployRuntime(e.target.value)}
                    >
                      <option value="nodejs22.x">Node.js 22.x</option>
                      <option value="nodejs20.x">Node.js 20.x</option>
                      <option value="nodejs18.x">Node.js 18.x</option>
                      <option value="python3.12">Python 3.12</option>
                      <option value="python3.11">Python 3.11</option>
                      <option value="python3.10">Python 3.10</option>
                      <option value="java21">Java 21</option>
                      <option value="java17">Java 17</option>
                      <option value="java11">Java 11</option>
                      <option value="dotnet8">.NET 8</option>
                      <option value="dotnet6">.NET 6</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Handler</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={deployHandler}
                      onChange={e => setDeployHandler(e.target.value)}
                      placeholder="index.handler"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Memory (MB)</label>
                      <select 
                        className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={deployMemory} 
                        onChange={e => setDeployMemory(e.target.value)}
                      >
                        <option value="128">128</option>
                        <option value="256">256</option>
                        <option value="512">512</option>
                        <option value="1024">1024</option>
                        <option value="2048">2048</option>
                        <option value="4096">4096</option>
                        <option value="8192">8192</option>
                        <option value="10240">10240</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                      <select 
                        className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={deployTimeout} 
                        onChange={e => setDeployTimeout(e.target.value)}
                      >
                        <option value="3">3</option>
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="30">30</option>
                        <option value="60">60</option>
                        <option value="300">300</option>
                        <option value="900">900</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lambda Code (index.js)</label>
                  <div className="relative">
                    <textarea
                      className="w-full border border-gray-200 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      rows={18}
                      value={codeForDeploy}
                      onChange={e => { codeForDeploy = e.target.value; setOutput(e.target.value); }}
                    />
                  </div>
                </div>
              </div>

              {deployStatus && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg">
                  {deployStatus}
                </div>
              )}
              {deployError && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">
                  {deployError}
                </div>
              )}
              {deploySuccess && (
                <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg">
                  {deploySuccess}
                </div>
            )}
          </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
            <button
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleDeploy}
                  disabled={deploying}
            >
                  {deploying ? (
                    <div className="flex items-center">
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Deploying...
                    </div>
                  ) : (
                    'Deploy'
                  )}
            </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}