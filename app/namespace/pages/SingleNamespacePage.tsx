'use client'
import React, { useEffect, useState } from 'react';
import { Users, Code2, BookOpen } from 'lucide-react';

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
    <div className="p-8 w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      <h2 className="text-3xl font-extrabold mb-4 text-gray-900 flex items-center gap-2">
        <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Namespace:</span> {namespace['namespace-name']}
      </h2>
      <div className="mb-2 text-gray-700">
        <span className="font-semibold">ID:</span> <span className="font-mono">{namespace['namespace-id']}</span>
      </div>
      <div className="mb-6 text-gray-700">
        <span className="font-semibold">URL:</span> <a href={namespace['namespace-url']} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 underline">{namespace['namespace-url']}</a>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Accounts Card */}
        <div className="flex-1 bg-white rounded-2xl shadow-lg border-t-4 border-blue-400 p-5 min-w-[240px] max-h-[380px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Users className="text-blue-500" size={22} />
            <h3 className="text-lg font-bold text-blue-700">Accounts</h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center text-gray-400 mt-8">
                <Users className="mb-2" size={32} />
                <span>No accounts found.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {accounts.map((acc: any, idx: number) => (
                  <li key={acc['namespace-account-id'] || idx} className="bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2 flex flex-col">
                    <span className="font-semibold text-gray-900">{acc['namespace-account-name']}</span>
                    {acc['namespace-account-url-override'] && (
                      <span className="text-xs text-blue-600">URL: {acc['namespace-account-url-override']}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* Methods Card */}
        <div className="flex-1 bg-white rounded-2xl shadow-lg border-t-4 border-green-400 p-5 min-w-[240px] max-h-[380px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="text-green-500" size={22} />
            <h3 className="text-lg font-bold text-green-700">Methods</h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {methods.length === 0 ? (
              <div className="flex flex-col items-center text-gray-400 mt-8">
                <Code2 className="mb-2" size={32} />
                <span>No methods found.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {methods.map((m: any, idx: number) => (
                  <li key={m['namespace-method-id'] || idx} className="bg-green-50/60 border border-green-100 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{m['namespace-method-name']}</span>
                    <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded ${m['namespace-method-type']==='GET' ? 'bg-green-200 text-green-800' : m['namespace-method-type']==='POST' ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-700'}`}>{m['namespace-method-type']}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* Schemas Card */}
        <div className="flex-1 bg-white rounded-2xl shadow-lg border-t-4 border-purple-400 p-5 min-w-[240px] max-h-[380px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="text-purple-500" size={22} />
            <h3 className="text-lg font-bold text-purple-700">Schemas</h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {schemas.length === 0 ? (
              <div className="flex flex-col items-center text-gray-400 mt-8">
                <BookOpen className="mb-2" size={32} />
                <span>No schemas found.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {schemas.map((s: any, idx: number) => (
                  <li key={s.id || idx} className="bg-purple-50/60 border border-purple-100 rounded-lg px-3 py-2">
                    <span className="font-semibold text-gray-900">{s.schemaName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 