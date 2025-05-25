import React from 'react';

type Account = { id: string; name: string };
type Props = { onSelect?: (a: Account) => void };

const accounts = [
  { id: 'acc1', name: 'Account A' },
  { id: 'acc2', name: 'Account B' },
  { id: 'acc3', name: 'Account C' },
];

export default function AccountPage({ onSelect }: Props) {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Select an Account</h2>
      <ul className="space-y-2">
        {accounts.map(acc => (
          <li key={acc.id}>
            <button
              className="px-4 py-2 rounded bg-green-100 hover:bg-green-200 text-green-800 font-semibold"
              onClick={() => onSelect && onSelect(acc)}
            >
              {acc.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
} 