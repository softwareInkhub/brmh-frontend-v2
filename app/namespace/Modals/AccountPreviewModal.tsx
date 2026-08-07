import React from 'react';
import { X, User, Edit2, Trash2, Link } from 'lucide-react';

interface KeyValuePair {
  key: string;
  value: string;
}

interface Account {
  "namespace-account-id": string;
  "namespace-account-name": string;
  "namespace-account-url-override"?: string;
  "namespace-account-header": KeyValuePair[];
  "namespace-account-variables"?: KeyValuePair[];
  tags: string[];
}

interface AccountPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
  onLink?: (account: Account) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

const AccountPreviewModal: React.FC<AccountPreviewModalProps> = ({ isOpen, onClose, account, onEdit, onDelete, onLink }) => {
  if (!isOpen || !account) return null;

  // Pinterest OAuth redirect logic
  const handleOAuthRedirect = (account: Account) => {
    const variables = ((account as any)["variables"] || account["namespace-account-variables"] || []) as { key: string; value: string }[];
    const clientId = variables.find((v) => v.key === 'client_id')?.value;
    const clientSecret = variables.find((v) => v.key === 'secret_key')?.value;
    const redirectUrl = variables.find((v) => v.key === 'redirect_uri')?.value;

    if (!clientId || !redirectUrl || !clientSecret) {
      alert('Missing client_id, secret_key, or redirect_uri in account variables');
      return;
    }

    const scopes = ['boards:read', 'boards:write', 'pins:read', 'pins:write'];
    const authUrl = new URL('https://www.pinterest.com/oauth/');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUrl);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(','));

    sessionStorage.setItem('pinterestAccountDetails', JSON.stringify({
      clientId,
      clientSecret,
      redirectUrl,
      accountId: account['namespace-account-id']
    }));

    window.location.href = authUrl.toString();
  };

  return (
    <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 p-8 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="text-blue-600" size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 truncate">{account["namespace-account-name"]}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        {/* ID and URL Override */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1 font-medium">ID</div>
            <div className="text-xs font-mono break-all text-gray-800">{account["namespace-account-id"]}</div>
          </div>
          {account["namespace-account-url-override"] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1 font-medium">URL Override</div>
              <div className="text-xs font-mono break-all text-gray-800">{account["namespace-account-url-override"]}</div>
            </div>
          )}
        </div>
        {/* Headers */}
        {account["namespace-account-header"]?.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-700 mb-2">Headers</div>
            <div className="bg-gray-50 rounded-lg p-4">
              {account["namespace-account-header"].map((header, idx) => (
                <div key={idx} className="flex justify-between text-xs mb-1 gap-2">
                  <span className="font-medium text-gray-700 whitespace-nowrap mr-2">{header.key}</span>
                  <span className="font-mono text-gray-600 break-all whitespace-pre-line text-right flex-1">{header.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Tags */}
        <div>
          <div className="text-xs font-medium text-gray-700 mb-2">Tags</div>
          <div className="flex flex-wrap gap-2">
            {account.tags && account.tags.length > 0 ? (
              account.tags.map((tag, idx) => (
                <span key={idx} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">{tag}</span>
              ))
            ) : (
              <span className="text-xs text-gray-400">No tags</span>
            )}
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-8">
          <button
            title="Link"
            className="p-2 rounded-lg bg-gray-100 text-blue-700 hover:bg-blue-50 transition-colors"
            onClick={() => handleOAuthRedirect(account)}
          >
            <Link size={18} />
          </button>
          <button
            title="Edit"
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => onEdit && onEdit(account)}
          >
            <Edit2 size={18} />
          </button>
          <button
            title="Delete"
            className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            onClick={async () => {
              if (window.confirm('Are you sure you want to delete this account?')) {
                try {
                  const response = await fetch(
                    `${API_BASE_URL}/unified/accounts/${account['namespace-account-id']}`,
                    { method: 'DELETE' }
                  );
                  if (!response.ok) throw new Error('Failed to delete account');
                  if (typeof window !== 'undefined' && window.location) window.location.reload();
                } catch (error) {
                  alert('Failed to delete account');
                }
              }
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountPreviewModal; 