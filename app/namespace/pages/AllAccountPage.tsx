import React, { useEffect, useState } from 'react';
import { Eye, Pencil, Trash2, User } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5001';

function AllAccountPage({ namespace, onViewAccount }: { namespace?: any, onViewAccount?: (account: any, ns?: any) => void }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllAccounts = async () => {
      setLoading(true);
      try {
        let allAccounts: any[] = [];
        if (namespace) {
          const accRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespace['namespace-id']}/accounts`);
          const nsAccounts = await accRes.json();
          allAccounts = (nsAccounts || []).map((acc: any) => ({ ...acc, namespace }));
        } else {
          const nsRes = await fetch(`${API_BASE_URL}/unified/namespaces`);
          const namespaces = await nsRes.json();
          for (const ns of namespaces) {
            const accRes = await fetch(`${API_BASE_URL}/unified/namespaces/${ns['namespace-id']}/accounts`);
            const nsAccounts = await accRes.json();
            allAccounts = allAccounts.concat(
              (nsAccounts || []).map((acc: any) => ({ ...acc, namespace: ns }))
            );
          }
        }
        setAccounts(allAccounts);
      } catch (err) {
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllAccounts();
  }, [namespace]);

  return (
    <div className="p-8 w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">All Accounts</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {accounts.map(acc => (
            <div key={acc['namespace-account-id']} className="border border-gray-200 rounded-md p-2 flex flex-col gap-1 min-w-0 bg-white" style={{ width: '260px', margin: '0' }}>
              <div className="flex items-center gap-2">
                <User size={16} className="text-blue-400" />
                <span className="text-base font-semibold text-gray-900 truncate">{acc['namespace-account-name']}</span>
              </div>
              <div className="text-xs text-gray-500 truncate">Namespace: <span className="font-medium text-gray-700">{acc.namespace?.['namespace-name']}</span></div>
              <div className="flex gap-2 mt-1">
                <button className="text-blue-600 hover:text-blue-800 p-1" title="View" onClick={() => onViewAccount && onViewAccount(acc, acc.namespace)}><Eye size={16} /></button>
                <button className="text-green-600 hover:text-green-800 p-1" title="Edit"><Pencil size={16} /></button>
                <button className="text-red-600 hover:text-red-800 p-1" title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AllAccountPage; 