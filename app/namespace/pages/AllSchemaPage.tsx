import React, { useEffect, useState } from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';





export default function AllSchemaPage({ namespace, onViewSchema, openCreate = false, onCreateNew }: { namespace?: any, onViewSchema?: (schema: any, ns?: any) => void, openCreate?: boolean, onCreateNew?: () => void }) {
  const [schemas, setSchemas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchemas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/schema`);
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          All Schemas{namespace ? `: ${namespace['namespace-name']}` : ''}
        </h2>
        <button
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow"
          onClick={() => {
            if (typeof onCreateNew === 'function') onCreateNew();
          }}
        >
          + Create Schema
        </button>
      </div>
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
    </div>
  );
} 