'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, Database, Cloud, Shield, Radio, Globe } from 'lucide-react';

const SIDEPANEL_WIDTH = 256; // px, w-64

const awsServices = [
  { id: 'lambda', name: 'Lambda', icon: <Landmark className="text-orange-500" />, route: '/aws/lambda' },
  { id: 's3', name: 'S3', icon: <Cloud className="text-yellow-500" />, route: '/aws/s3' },
  { id: 'dynamodb', name: 'DynamoDB', icon: <Database className="text-green-500" />, route: '/aws/dynamodb' },
  { id: 'iam', name: 'IAM', icon: <Shield className="text-blue-500" />, route: '/aws/iam' },
  { id: 'sns', name: 'SNS', icon: <Radio className="text-purple-500" />, route: '/aws/sns' },
  { id: 'apigateway', name: 'API Gateway', icon: <Globe className="text-rose-900" />, route: '/aws/apigateway' },
];

function AwsSidePanel({ onServiceClick }: { onServiceClick?: (service: any) => void }) {
  const [active, setActive] = useState<string | null>(null);
  const router = useRouter();
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
                router.push(service.route);
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
    <div className="flex h-screen ">
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
      <div className="flex-1 min-h-0 overflow-y-auto ">
        {children}
      </div>
    </div>
  );
};

export default AwsLayout; 