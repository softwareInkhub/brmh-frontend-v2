'use client';
import React, { useState } from 'react';

const CONTEXTS = [
  {
    label: 'Create Namespace',
    value: 'create-namespace',
    context: 'You are an expert in BRMH. Generate a JSON schema or instructions to create a new namespace in BRMH.',
  },
  {
    label: 'Create Schema of a Namespace',
    value: 'create-schema',
    context: 'You are an expert in BRMH. Generate a JSON schema for a namespace in BRMH.',
  },
  {
    label: 'Create AWS Lambda Function',
    value: 'create-lambda',
    context: 'You are an expert in AWS and BRMH. Generate code or configuration for an AWS Lambda function for BRMH.',
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

export default function LLMDashboard() {
  const [selected, setSelected] = useState(CONTEXTS[0]);
  const [message, setMessage] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setOutput('');
    const prompt = `${selected.context}\n\n${message}`;
    const res = await fetch('http://localhost:5000/llm/generate-schema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    setOutput(data.llm_output || JSON.stringify(data.schema, null, 2) || data.error || 'No output');
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">LLM Dashboard (BRMH)</h1>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Use Case</label>
        <select
          className="w-full border rounded p-2"
          value={selected.value}
          onChange={e => setSelected(CONTEXTS.find(c => c.value === e.target.value)!)}
        >
          {CONTEXTS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Context</label>
        <textarea
          className="w-full border rounded p-2"
          rows={2}
          value={selected.context}
          onChange={e => setSelected({ ...selected, context: e.target.value })}
        />
      </div>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Message</label>
        <textarea
          className="w-full border rounded p-2"
          rows={3}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe your requirements..."
        />
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded font-semibold"
        onClick={handleSend}
        disabled={loading || !message.trim()}
      >
        {loading ? 'Generating...' : 'Send to LLM'}
      </button>
      <div className="mt-6">
        <label className="block font-semibold mb-1">LLM Output</label>
        <pre className="bg-gray-100 p-4 rounded min-h-[120px]">{output}</pre>
      </div>
    </div>
  );
}