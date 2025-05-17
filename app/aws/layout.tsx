'use client'
import React, { useState } from 'react';

const SIDEPANEL_WIDTH = 256; // px, w-64

const awsServices = [
  { id: 'lambda', name: 'Lambda', icon: '🟧' },
  { id: 's3', name: 'S3', icon: '🟨' },
  { id: 'dynamodb', name: 'DynamoDB', icon: '🟩' },
  { id: 'iam', name: 'IAM', icon: '🟦' },
  { id: 'sns', name: 'SNS', icon: '🟪' },
  { id: 'apigateway', name: 'API Gateway', icon: '🟫' },
];

function AwsSidePanel({ onServiceClick }: { onServiceClick?: (service: any) => void }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <aside className="h-full w-full bg-white flex flex-col py-4">
      <div className="text-xs font-bold text-gray-500 px-4 mb-4">AWS Services</div>
      <ul className="space-y-1">
        {awsServices.map(service => (
          <li key={service.id}>
            <button
              className={`flex items-center w-full px-4 py-2 rounded-lg text-left transition-colors
                ${active === service.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => {
                setActive(service.id);
                onServiceClick && onServiceClick(service);
              }}
            >
              <span className="mr-2 text-lg">{service.icon}</span>
              <span>{service.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

const AwsLayout = ({ children }: { children: React.ReactNode }) => {
  const handleServiceClick = (service: any) => {
    // For now, do nothing or show a placeholder
    // alert(`Clicked: ${service.name}`);
  };

  return (
    <div className="flex h-screen ml-20">
      {/* AWS SidePanel */}
      <div
        style={{
          width: SIDEPANEL_WIDTH,
          minWidth: SIDEPANEL_WIDTH,
          maxWidth: SIDEPANEL_WIDTH,
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          height: '100vh',
          zIndex: 20,
        }}
      >
        <AwsSidePanel onServiceClick={handleServiceClick} />
      </div>
      {/* Main AWS Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pl-8">
        {children}
      </div>
    </div>
  );
};

export default AwsLayout; 