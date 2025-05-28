import React, { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function AllSchemaPage() {
  const [schemas, setSchemas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllSchemas = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/unified/schema`);
        const data = await res.json();
        setSchemas(Array.isArray(data) ? data : []);
      } catch (err) {
        setSchemas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllSchemas();
  }, []);

  return (
    <div className="p-8 w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">All Schemas</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {schemas.map(schema => (
            <div key={schema.id} className="border border-gray-200 rounded-md p-2 flex flex-col gap-1 min-w-0 bg-white" style={{ width: '260px', margin: '0' }}>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-gray-900 truncate">{schema.schemaName}</span>
              </div>
              <div className="text-xs text-gray-500 truncate">Namespace: <span className="font-medium text-gray-700">{schema.namespaceName || schema.namespaceId}</span></div>
              <div className="flex gap-2 mt-1">
                <button className="text-blue-600 hover:text-blue-800 p-1" title="View">View</button>
                <button className="text-green-600 hover:text-green-800 p-1" title="Edit">Edit</button>
                <button className="text-red-600 hover:text-red-800 p-1" title="Delete">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 