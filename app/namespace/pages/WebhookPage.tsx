import React, { useState, useEffect } from 'react';
import { Link2, Hash, Tag, Sliders, User, CheckCircle, Zap, Globe, Edit3, Trash2 } from 'lucide-react';

interface WebhookPageProps {
  webhook: any;
  namespace?: any;
}

const WebhookPage: React.FC<WebhookPageProps> = ({ webhook, namespace }) => {
  const [editWebhook, setEditWebhook] = useState<any>(webhook || {});
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    setEditWebhook(webhook || {});
  }, [webhook]);

  const handleInput = (field: string, value: any) => {
    setEditWebhook((prev: any) => ({ ...prev, [field]: value }));
  };

  // Debug log to check editMode on each render
  console.log('WebhookPage render, editMode:', editMode);

  if (!webhook) return <div>No webhook selected.</div>;

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-gradient-to-br flex flex-col h-full p-0 m-0">
      <div className="bg-white p-8 flex flex-col gap-6 w-full h-full m-0">
        <div className="flex items-center gap-3 mb-2 justify-between">
          <div className="flex items-center gap-3">
            <Zap className="text-pink-500" size={28} />
            <h2 className="text-2xl font-bold text-pink-700 tracking-tight">Webhook Details</h2>
          </div>
          <div className="flex gap-3 items-center">
            <button
              title="Edit"
              className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white shadow transition-colors"
              style={{ borderRadius: '0.5rem' }}
              onClick={() => { setEditMode(true); console.log('Edit button clicked, setEditMode(true)'); }}
              disabled={editMode}
            >
              <Edit3 size={22} />
            </button>
            <button
              title="Delete"
              className="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white shadow transition-colors"
              style={{ borderRadius: '0.5rem' }}
              disabled
            >
              <Trash2 size={22} />
            </button>
          </div>
        </div>
        {!editMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Tag size={16} className="text-pink-400" /> Name</div>
              <div className="text-lg font-semibold text-gray-900">{webhook['webhook-name']}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Hash size={16} className="text-purple-400" /> ID</div>
              <div className="text-base font-mono text-gray-700 break-all">{webhook['webhook-id'] || webhook['id']}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Link2 size={16} className="text-blue-400" /> Post Exec URL</div>
              <div className="text-base text-gray-700 break-all">{webhook['post-exec-url'] || <span className="italic text-gray-400">None</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Link2 size={16} className="text-blue-400" /> Pre Exec URL</div>
              <div className="text-base text-gray-700 break-all">{webhook['pre-exec-url'] || <span className="italic text-gray-400">None</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Sliders size={16} className="text-blue-400" /> Table Name</div>
              <div className="text-base text-gray-700">{webhook['table-name'] || webhook['tableName'] || <span className="italic text-gray-400">null</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><User size={16} className="text-green-400" /> Account ID</div>
              <div className="text-base font-mono text-gray-700 break-all">{webhook['account-id'] || <span className="italic text-gray-400">None</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Zap size={16} className="text-pink-400" /> Method ID</div>
              <div className="text-base font-mono text-gray-700 break-all">{webhook['method-id'] || <span className="italic text-gray-400">None</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Globe size={16} className="text-blue-400" /> Namespace ID</div>
              <div className="text-base font-mono text-gray-700 break-all">{webhook['namespace-id'] || <span className="italic text-gray-400">None</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><CheckCircle size={16} className={webhook['status'] === 'active' ? 'text-green-500' : 'text-gray-300'} /> Status</div>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold shadow-sm ${webhook['status'] === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{webhook['status'] || 'inactive'}</span>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Tag size={16} className="text-yellow-400" /> Tags</div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(webhook.tags) && webhook.tags.length > 0 ? (
                  webhook.tags.map((tag: string, idx: number) => (
                    <span key={idx} className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold shadow">{tag}</span>
                  ))
                ) : (
                  <span className="italic text-gray-400">No tags</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4"
            onSubmit={async e => {
              e.preventDefault();
              // Send update to backend
              await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/webhooks/${editWebhook['webhook-id'] || editWebhook['id']}`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    'webhook-name': editWebhook['webhook-name'],
                    'post-exec-url': editWebhook['post-exec-url'],
                    'pre-exec-url': editWebhook['pre-exec-url'],
                    'method-id': editWebhook['method-id'],
                    'namespace-id': editWebhook['namespace-id'],
                    'account-id': editWebhook['account-id'],
                    'tableName': editWebhook['table-name'] || editWebhook['tableName'],
                    'status': editWebhook['status'],
                    'tags': editWebhook['tags'],
                  })
                }
              );
              setEditMode(false);
              // Optionally: refresh data from backend here
            }}
          >
            <div>
              <label className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Tag size={16} className="text-pink-400" /> Name
              </label>
              <input
                className="w-full border border-pink-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition outline-none bg-pink-50 placeholder-gray-400"
                value={editWebhook['webhook-name'] || ''}
                onChange={e => handleInput('webhook-name', e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Link2 size={16} className="text-blue-400" /> Post Exec URL
              </label>
              <input
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
                value={editWebhook['post-exec-url'] || ''}
                onChange={e => handleInput('post-exec-url', e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Link2 size={16} className="text-blue-400" /> Pre Exec URL
              </label>
              <input
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
                value={editWebhook['pre-exec-url'] || ''}
                onChange={e => handleInput('pre-exec-url', e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <CheckCircle size={16} className="text-green-400" /> Status
              </label>
              <select
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-green-400 focus:border-green-400 transition outline-none bg-green-50"
                value={editWebhook['status'] || 'inactive'}
                onChange={e => handleInput('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Tag size={16} className="text-yellow-400" /> Tags (comma separated)
              </label>
              <input
                className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition outline-none bg-yellow-50 placeholder-gray-400"
                value={Array.isArray(editWebhook.tags) ? editWebhook.tags.join(', ') : ''}
                onChange={e => handleInput('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Zap size={16} className="text-pink-400" /> Method ID
              </label>
              <input
                className="w-full border border-pink-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition outline-none bg-pink-50 placeholder-gray-400"
                value={editWebhook['method-id'] || ''}
                onChange={e => handleInput('method-id', e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <User size={16} className="text-green-400" /> Account ID
              </label>
              <input
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-green-400 focus:border-green-400 transition outline-none bg-green-50 placeholder-gray-400"
                value={editWebhook['account-id'] || ''}
                onChange={e => handleInput('account-id', e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Sliders size={16} className="text-blue-400" /> Table Name
              </label>
              <input
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
                value={editWebhook['table-name'] || ''}
                onChange={e => handleInput('table-name', e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Globe size={16} className="text-blue-400" /> Namespace ID
              </label>
              <input
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
                value={editWebhook['namespace-id'] || ''}
                onChange={e => handleInput('namespace-id', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 mt-6">
              <button
                type="button"
                className="bg-gray-200 text-gray-700 rounded-lg px-6 py-2 font-semibold text-base hover:bg-gray-300 transition"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-6 py-2 font-bold text-base shadow-lg hover:from-blue-600 hover:to-purple-600 transition"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default WebhookPage; 