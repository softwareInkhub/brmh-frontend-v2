import React, { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function SingleNamespacePage({ namespaceId, initialNamespace }: { namespaceId: string, initialNamespace?: any }) {
  const [namespace, setNamespace] = useState<any>(initialNamespace || null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNamespace = async () => {
      setLoading(true);
      if (!namespaceId) {
        console.error('No namespaceId provided!');
        setAccounts([]);
        setMethods([]);
        setSchemas([]);
        setLoading(false);
        return;
      }
      try {
        if (!initialNamespace) {
          const nsRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}`);
          const ns = await nsRes.json();
          if (ns && Object.keys(ns).length > 0) {
            setNamespace(ns);
          }
          // else, keep the initialNamespace
        }
        console.log('Fetching accounts for namespaceId:', namespaceId);
        const accRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}/accounts`);
        const accData = await accRes.json();
        console.log('Accounts:', accData);
        setAccounts(Array.isArray(accData) ? accData : []);

        console.log('Fetching methods for namespaceId:', namespaceId);
        const methRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}/methods`);
        const methData = await methRes.json();
        console.log('Methods:', methData);
        setMethods(Array.isArray(methData) ? methData : []);

        console.log('Fetching schemas for namespaceId:', namespaceId);
        const schRes = await fetch(`${API_BASE_URL}/unified/schema`);
        const schData = await schRes.json();
        console.log('Schemas:', schData);
        setSchemas(Array.isArray(schData) 
          ? schData.filter((s: any) => s.namespaceId === namespaceId)
          : []);
      } catch (err) {
        // do not overwrite namespace if initialNamespace exists
        if (!initialNamespace) setNamespace(null);
        setAccounts([]);
        setMethods([]);
        setSchemas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNamespace();
  }, [namespaceId, initialNamespace]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!namespace || Object.keys(namespace).length === 0) return <div className="p-8">Namespace not found.</div>;

  return (
    <div className="p-8 w-full">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Namespace: {namespace['namespace-name']}</h2>
      <div className="mb-2 text-gray-700">
        <span className="font-semibold">ID:</span> <span className="font-mono">{namespace['namespace-id']}</span>
      </div>
      <div className="mb-4 text-gray-700">
        <span className="font-semibold">URL:</span> <span className="font-mono">{namespace['namespace-url']}</span>
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Accounts</h3>
        {accounts.length === 0 ? (
          <div className="text-gray-400">No accounts found.</div>
        ) : (
          <ul className="list-disc ml-6">
            {accounts.map((acc: any) => (
              <li key={acc['namespace-account-id']} className="mb-1">
                <span className="font-medium">{acc['namespace-account-name']}</span>
                {acc['namespace-account-url-override'] && (
                  <span className="ml-2 text-xs text-gray-500">(URL: {acc['namespace-account-url-override']})</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Methods</h3>
        {methods.length === 0 ? (
          <div className="text-gray-400">No methods found.</div>
        ) : (
          <ul className="list-disc ml-6">
            {methods.map((m: any) => (
              <li key={m['namespace-method-id']} className="mb-1">
                <span className="font-medium">{m['namespace-method-name']}</span>
                <span className="ml-2 text-xs text-gray-500">({m['namespace-method-type']})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Schemas</h3>
        {schemas.length === 0 ? (
          <div className="text-gray-400">No schemas found.</div>
        ) : (
          <ul className="list-disc ml-6">
            {schemas.map((s: any) => (
              <li key={s.id} className="mb-1">
                <span className="font-medium">{s.schemaName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 