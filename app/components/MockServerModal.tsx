import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

const DEFAULT_PORT = 4010;

export default function MockServerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'mock' | 'test'>('mock');
  const [port, setPort] = useState(DEFAULT_PORT);
  const [status, setStatus] = useState<'stopped' | 'running' | 'error'>('stopped');
  const [error, setError] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState(`http://localhost:${DEFAULT_PORT}`);
  const [testMethod, setTestMethod] = useState('GET');
  const [testBody, setTestBody] = useState('');
  const [testResponse, setTestResponse] = useState<string | null>(null);

  if (!isOpen) return null;

  const startMockServer = async () => {
    setError(null);
    setStatus('stopped');
    try {
      const res = await fetch(`${API_BASE_URL}/api/mock-server/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to start mock server');
        setStatus('error');
        return;
      }
      setStatus('running');
      setTestUrl(`http://localhost:${port}`);
    } catch (e) {
      setError('Failed to start mock server');
      setStatus('error');
    }
  };

  const stopMockServer = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mock-server/stop`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to stop mock server');
        return;
      }
      setStatus('stopped');
    } catch (e) {
      setError('Failed to stop mock server');
    }
  };

  const testRequest = async () => {
    setTestResponse(null);
    try {
      const res = await fetch(testUrl, {
        method: testMethod,
        headers: { 'Content-Type': 'application/json' },
        body: testMethod !== 'GET' ? testBody : undefined
      });
      const text = await res.text();
      setTestResponse(text);
    } catch (e) {
      setTestResponse('Request failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-0 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-bold">Mock Server</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-pink-500 p-2">
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        <div className="flex border-b">
          <button className={`flex-1 py-2 ${tab === 'mock' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`} onClick={() => setTab('mock')}>Mock Server</button>
          <button className={`flex-1 py-2 ${tab === 'test' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`} onClick={() => setTab('test')}>Test Schema</button>
        </div>
        <div className="p-6">
          {tab === 'mock' && (
            <div>
              <div className="mb-4 flex items-center gap-4">
                <label className="font-medium">Port:</label>
                <input type="number" value={port} onChange={e => setPort(Number(e.target.value))} className="border rounded px-2 py-1 w-24" min={1} max={65535} />
                <span className={`ml-4 px-2 py-1 rounded text-xs ${status === 'running' ? 'bg-green-100 text-green-700' : status === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{status === 'running' ? 'Running' : status === 'error' ? 'Error' : 'Stopped'}</span>
              </div>
              {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
              <div className="flex gap-2">
                <button onClick={startMockServer} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={status === 'running'}>Start</button>
                <button onClick={stopMockServer} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50" disabled={status !== 'running'}>Stop</button>
              </div>
            </div>
          )}
          {tab === 'test' && (
            <div>
              <div className="mb-4">
                <label className="block font-medium mb-1">URL</label>
                <input type="text" value={testUrl} onChange={e => setTestUrl(e.target.value)} className="border rounded px-2 py-1 w-full" />
              </div>
              <div className="mb-4 flex gap-2 items-center">
                <select value={testMethod} onChange={e => setTestMethod(e.target.value)} className="border rounded px-2 py-1">
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                  <option>PATCH</option>
                </select>
                {testMethod !== 'GET' && (
                  <input type="text" value={testBody} onChange={e => setTestBody(e.target.value)} className="border rounded px-2 py-1 flex-1" placeholder="Request body (JSON)" />
                )}
                <button onClick={testRequest} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Send</button>
              </div>
              {testResponse && (
                <div className="mt-4">
                  <label className="block font-medium mb-1">Response</label>
                  <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto max-h-48">{testResponse}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 