import React from 'react';

type Method = { id: string; name: string };
type Props = { onSelect?: (m: Method) => void };

const methods = [
  { id: 'm1', name: 'GET /users' },
  { id: 'm2', name: 'POST /login' },
  { id: 'm3', name: 'DELETE /item' },
];

export default function MethodPage({ onSelect }: Props) {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Select a Method</h2>
      <ul className="space-y-2">
        {methods.map(m => (
          <li key={m.id}>
            <button
              className="px-4 py-2 rounded bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-semibold"
              onClick={() => onSelect && onSelect(m)}
            >
              {m.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
} 