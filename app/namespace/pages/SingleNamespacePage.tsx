'use client'
import React, { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

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
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
          Namespace: {namespace['namespace-name']}
        </h2>
        <div className="flex flex-wrap gap-6 text-gray-700 mb-4">
          <div className="bg-gray-50 rounded-lg px-4 py-2 flex flex-col min-w-[220px]">
            <span className="font-semibold text-xs text-gray-500">ID</span>
            <span className="font-mono text-sm">{namespace['namespace-id']}</span>
          </div>
          <div className="bg-gray-50 rounded-lg px-4 py-2 flex flex-col min-w-[220px]">
            <span className="font-semibold text-xs text-gray-500">URL</span>
            <span className="font-mono text-sm">{namespace['namespace-url']}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Accounts Card */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span> Accounts
          </h3>
          {accounts.length === 0 ? (
            <div className="text-gray-400">No accounts found.</div>
          ) : (
            <ul className="space-y-2">
              {accounts.map((acc: any, idx: number) => (
                <li key={acc['namespace-account-id'] || idx} className="flex flex-col bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-800">{acc['namespace-account-name']}</span>
                  {acc['namespace-account-url-override'] && (
                    <span className="text-xs text-gray-500">URL: {acc['namespace-account-url-override']}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Methods Card */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span> Methods
          </h3>
          {methods.length === 0 ? (
            <div className="text-gray-400">No methods found.</div>
          ) : (
            <ul className="space-y-2">
              {methods.map((m: any, idx: number) => (
                <li key={m['namespace-method-id'] || idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-800">{m['namespace-method-name']}</span>
                  <span className="ml-2 text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-mono">{m['namespace-method-type']}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Schemas Card */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-purple-400 rounded-full"></span> Schemas
          </h3>
          {schemas.length === 0 ? (
            <div className="text-gray-400">No schemas found.</div>
          ) : (
            <ul className="space-y-2">
              {schemas.map((s: any, idx: number) => (
                <li key={s.id || idx} className="flex flex-col bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-800">{s.schemaName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 