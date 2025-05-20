import React from 'react';

const schemas = [
  { id: 's1', name: 'UserSchema' },
  { id: 's2', name: 'ProductSchema' },
  { id: 's3', name: 'OrderSchema' },
];

export default function SchemaPage({ onSelect }) {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Select a Schema</h2>
      <ul className="space-y-2">
        {schemas.map(s => (
          <li key={s.id}>
            <button
              className="px-4 py-2 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold"
              onClick={() => onSelect && onSelect(s)}
            >
              {s.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
} 