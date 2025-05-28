import React, { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function SingleNamespacePage({ namespaceId }: { namespaceId: string }) {
  const [namespace, setNamespace] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNamespace = async () => {
      setLoading(true);
      try {
        const nsRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}`);
        const ns = await nsRes.json();
        setNamespace(ns);
        const accRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}/accounts`);
        setAccounts(await accRes.json());
        const methRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}/methods`);
        setMethods(await methRes.json());
        const schRes = await fetch(`${API_BASE_URL}/unified/schema?namespaceId=${namespaceId}`);
        setSchemas(await schRes.json());
      } catch (err) {
        setNamespace(null);
        setAccounts([]);
        setMethods([]);
        setSchemas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNamespace();
  }, [namespaceId]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!namespace) return <div className="p-8">Namespace not found.</div>;

  return (
    <div className="p-8 w-full">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Namespace: {namespace['namespace-name']}</h2>
      <div className="mb-4 text-gray-700">URL: <span className="font-mono">{namespace['namespace-url']}</span></div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Accounts</h3>
        <ul className="list-disc ml-6">
          {accounts.map((acc: any) => (
            <li key={acc['namespace-account-id']} className="mb-1">{acc['namespace-account-name']}</li>
          ))}
        </ul>
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Methods</h3>
        <ul className="list-disc ml-6">
          {methods.map((m: any) => (
            <li key={m['namespace-method-id']} className="mb-1">{m['namespace-method-name']}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Schemas</h3>
        <ul className="list-disc ml-6">
          {schemas.map((s: any) => (
            <li key={s.id} className="mb-1">{s.schemaName}</li>
          ))}
        </ul>
      </div>
    </div>
  );
} 