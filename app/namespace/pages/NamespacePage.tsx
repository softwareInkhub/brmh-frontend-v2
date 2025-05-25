import React from 'react';

type Namespace = { id: string; name: string };
type Props = { onSelect?: (ns: Namespace) => void };

const namespaces = [
  { id: 'ns1', name: 'pinterest' },
  { id: 'ns2', name: 'shopify' },
  { id: 'ns3', name: 'project management' },
  { id: 'ns4', name: 'whapi' },
  { id: 'ns5', name: 'aws' },
];

export default function NamespacePage({ onSelect }: Props) {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Select a Namespace</h2>
      <ul className="space-y-2">
        {namespaces.map(ns => (
          <li key={ns.id}>
            <button
              className="px-4 py-2 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold"
              onClick={() => onSelect && onSelect(ns)}
            >
              {ns.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
} 