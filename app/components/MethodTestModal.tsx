import { useEffect, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  namespaceId: string;
}

interface Method {
  id: string;
  name: string;
  namespaceId: string;
  type: string;
  endpoint?: string;
}

interface RequestData {
  accountId: string;
  methodId: string;
  namespaceId: string;
}

interface Response {
  success: boolean;
  data?: any;
  error?: string;
}

interface MethodTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  namespaceId: string;
  methodId: string;
  methodName: string;
  methodType: string;
}

export default function MethodTestModal({
  isOpen,
  onClose,
  namespaceId,
  methodId,
  methodName,
  methodType
}: MethodTestModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts for the given namespace
  const fetchAccounts = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch(`/api/namespace/${namespaceId}/accounts`);
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.accounts || []);
        if (data.accounts && data.accounts.length > 0) {
          setSelectedAccount(data.accounts[0]);
        }
      } else {
        setError(data.error || 'Failed to fetch accounts');
      }
    } catch (err) {
      setError('Network error when fetching accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Execute the method test
  const executeTest = async () => {
    if (!selectedAccount) {
      setError('Please select an account');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      setResponse(null);

      const requestData: RequestData = {
        accountId: selectedAccount.id,
        methodId: methodId,
        namespaceId: namespaceId
      };

      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      setResponse(data);
      
      if (!data.success) {
        setError(data.error || 'Test execution failed');
      }
    } catch (err) {
      setError('Network error during test execution');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Close when clicking outside the modal
  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Initialize
  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen, namespaceId]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleOutsideClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal header */}
        <div className="border-b dark:border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold dark:text-white">
            Test Method: <span className="text-blue-500">{methodName}</span>
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2 dark:text-white">Method Information</h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                <p className="font-medium dark:text-white">{methodType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">ID</p>
                <p className="font-medium dark:text-white text-xs truncate">{methodId}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2 dark:text-white">Select Account</h3>
            
            <div className="relative">
              <div 
                className="border dark:border-gray-600 rounded-md p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="dark:text-white">
                  {selectedAccount ? selectedAccount.name : 'Select an account'}
                </span>
                <ChevronDown size={18} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </div>
              
              {showDropdown && (
                <div className="absolute left-0 right-0 mt-1 border dark:border-gray-600 rounded-md shadow-lg bg-white dark:bg-gray-800 z-10 max-h-40 overflow-y-auto">
                  {accounts.length === 0 ? (
                    <div className="p-3 text-gray-500 dark:text-gray-400 text-center">
                      {loading ? 'Loading accounts...' : 'No accounts available'}
                    </div>
                  ) : (
                    accounts.map(account => (
                      <div 
                        key={account.id}
                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer dark:text-white"
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowDropdown(false);
                        }}
                      >
                        {account.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Response section */}
          {response && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2 dark:text-white">Response</h3>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                <pre className="whitespace-pre-wrap break-words text-xs overflow-x-auto dark:text-white">
                  {JSON.stringify(response.data || response, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="border-t dark:border-gray-700 p-4 flex justify-end">
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-md mr-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={executeTest}
            disabled={loading || !selectedAccount}
          >
            {loading ? 'Testing...' : 'Execute Test'}
          </button>
        </div>
      </div>
    </div>
  );
} 