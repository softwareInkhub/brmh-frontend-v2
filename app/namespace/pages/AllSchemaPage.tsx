import React, { useEffect, useState } from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5001';

const schemaApis = [
  {
    method: 'POST',
    path: '/schema/generate',
    description: 'Generate schema from data',
    details: 'Request body: { ... }\nResponse: { ... }'
  },
  {
    method: 'POST',
    path: '/schema/validate',
    description: 'Validate schema',
    details: 'Request body: { ... }\nResponse: { ... }'
  },
  {
    method: 'POST',
    path: '/schema',
    description: 'Save schema',
    details: 'Request body: { ... }\nResponse: { ... }'
  },
  {
    method: 'GET',
    path: '/schema',
    description: 'List all schemas',
    details: 'Response: [ { ... }, ... ]'
  },
  {
    method: 'GET',
    path: '/schema/{schemaId}',
    description: 'Get schema by ID',
    details: 'Response: { ... }'
  },
];

function ApiAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mt-8 border-t pt-4">
      <h3 className="text-xl font-bold mb-4 text-gray-900">Schema API Endpoints</h3>
      <div>
        {schemaApis.map((api, idx) => (
          <div key={`${api.method}-${api.path}`} className="mb-2 border rounded bg-white shadow-sm">
            <button
              className="w-full flex items-center justify-between px-4 py-2 focus:outline-none"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    api.method === 'GET'
                      ? 'bg-blue-500 text-white'
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {api.method}
                </span>
                <span className="font-mono text-sm text-gray-800">{api.path}</span>
                <span className="ml-2 text-gray-500 text-xs">{api.description}</span>
              </span>
              <span className="text-gray-400">{openIndex === idx ? '▲' : '▼'}</span>
            </button>
            {openIndex === idx && (
              <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-700 whitespace-pre-wrap">
                {api.details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AllSchemaPage({ namespace, onViewSchema }: { namespace?: any, onViewSchema?: (schema: any, ns?: any) => void }) {
  const [schemas, setSchemas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchemas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/unified/schema`);
      const data = await res.json();
      setSchemas(Array.isArray(data)
        ? (namespace
            ? data.filter((s: any) => s.namespaceId === namespace['namespace-id'])
            : data)
        : []);
    } catch (err) {
      setSchemas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemas();
  }, [namespace]);

  const handleDelete = async (schemaId: string) => {
    if (!confirm('Are you sure you want to delete this schema?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/unified/schema/${schemaId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Remove the deleted schema from the state
        setSchemas(prevSchemas => prevSchemas.filter(s => s.id !== schemaId));
      } else {
        const error = await res.json();
        alert(`Failed to delete schema: ${error.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Failed to delete schema. Please try again.');
    }
  };

  return (
    <div className="p-8 w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        All Schemas{namespace ? `: ${namespace['namespace-name']}` : ''}
      </h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {schemas.map(schema => (
            <div
              key={schema.id}
              className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2 min-w-0 bg-white shadow-sm hover:shadow-md transition-shadow"
              style={{ width: '260px', margin: '0' }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-base font-semibold text-gray-900 truncate">{schema.schemaName}</span>
                <div className="flex gap-2">
                  <button className="text-blue-600 hover:text-blue-800 p-1" title="View" onClick={() => onViewSchema && onViewSchema(schema, namespace)}>
                    <Eye size={18} />
                  </button>
                  <button className="text-green-600 hover:text-green-800 p-1" title="Edit">
                    <Edit size={18} />
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-800 p-1" 
                    title="Delete"
                    onClick={() => handleDelete(schema.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ApiAccordion />
    </div>
  );
} 