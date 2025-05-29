import React, { useEffect, useState } from 'react';
import { Eye, Pencil, Trash2, Zap, Send, Database } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function AllMethodPage({ namespace, onViewMethod }: { namespace?: any, onViewMethod?: (method: any, ns?: any) => void }) {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllMethods = async () => {
      setLoading(true);
      try {
        let allMethods: any[] = [];
        if (namespace) {
          const mRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespace['namespace-id']}/methods`);
          const nsMethods = await mRes.json();
          allMethods = (nsMethods || []).map((m: any) => ({ ...m, namespace }));
        } else {
          const nsRes = await fetch(`${API_BASE_URL}/unified/namespaces`);
          const namespaces = await nsRes.json();
          for (const ns of namespaces) {
            const mRes = await fetch(`${API_BASE_URL}/unified/namespaces/${ns['namespace-id']}/methods`);
            const nsMethods = await mRes.json();
            allMethods = allMethods.concat(
              (nsMethods || []).map((m: any) => ({ ...m, namespace: ns }))
            );
          }
        }
        setMethods(allMethods);
      } catch (err) {
        setMethods([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllMethods();
  }, [namespace]);

  return (
    <div className="p-8 w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">All Methods</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {methods.map(m => {
            let typeIcon = <Database size={16} className="text-gray-400" />;
            if (m['namespace-method-type'] === 'GET') typeIcon = <Zap size={16} className="text-green-500" />;
            if (m['namespace-method-type'] === 'POST') typeIcon = <Send size={16} className="text-orange-500" />;
            return (
              <div key={m['namespace-method-id']} className="border border-gray-200 rounded-md p-2 flex flex-col gap-1 min-w-0 bg-white" style={{ width: '260px', margin: '0' }}>
                <div className="flex items-center gap-2">
                  {typeIcon}
                  <span className="text-base font-semibold text-gray-900 truncate">{m['namespace-method-name']}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${m['namespace-method-type'] === 'GET' ? 'bg-green-100 text-green-700' : m['namespace-method-type'] === 'POST' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-700'}`}>{m['namespace-method-type']}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">Namespace: <span className="font-medium text-gray-700">{m.namespace?.['namespace-name']}</span></div>
                <div className="flex gap-2 mt-1">
                  <button className="text-blue-600 hover:text-blue-800 p-1" title="View" onClick={() => onViewMethod && onViewMethod(m, m.namespace)}><Eye size={16} /></button>
                  <button className="text-green-600 hover:text-green-800 p-1" title="Edit"><Pencil size={16} /></button>
                  <button className="text-red-600 hover:text-red-800 p-1" title="Delete"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 