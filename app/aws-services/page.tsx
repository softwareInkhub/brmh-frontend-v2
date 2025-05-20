'use client';

import React from 'react';
import Link from 'next/link';
import { Landmark, Database, Cloud, Shield, Radio, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SIDEPANEL_WIDTH = 256;
const awsServices = [
  { id: 'lambda', name: 'Lambda', icon: <Landmark className="text-orange-500" />, route: '/aws/lambda' },
  { id: 's3', name: 'S3', icon: <Cloud className="text-yellow-500" />, route: '/aws/s3' },
  { id: 'dynamodb', name: 'DynamoDB', icon: <Database className="text-green-500" />, route: '/aws/dynamodb' },
  { id: 'iam', name: 'IAM', icon: <Shield className="text-blue-500" />, route: '/aws/iam' },
  { id: 'sns', name: 'SNS', icon: <Radio className="text-purple-500" />, route: '/aws/sns' },
  { id: 'apigateway', name: 'API Gateway', icon: <Globe className="text-rose-900" />, route: '/aws/apigateway' },
];

function AwsSidePanel({ onServiceClick }: { onServiceClick?: (service: any) => void }) {
  const [active, setActive] = React.useState<string | null>(null);
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

const awsPage = () => {
  return (
    <div className="flex h-screen ml-20">
      {/* SidePanel */}
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
        <AwsSidePanel onServiceClick={() => {}} />
      </div>
      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pl-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">AWS Services Overview</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and monitor your AWS services from one central dashboard
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {serviceCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{card.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{card.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const serviceCards = [
  {
    title: 'S3 Buckets',
    description: 'Manage your S3 storage buckets',
    href: '/aws/s3',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
      </svg>
    ),
  },
  {
    title: 'DynamoDB Tables',
    description: 'Manage your DynamoDB tables',
    href: '/aws/dynamodb',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z"/>
      </svg>
    ),
  },
  {
    title: 'Lambda Functions',
    description: 'Manage your Lambda functions',
    href: '/aws/lambda',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    title: 'API Gateway',
    description: 'Manage your API endpoints',
    href: '/aws/apigateway',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z"/>
      </svg>
    ),
  },
  {
    title: 'IAM Roles',
    description: 'Manage your IAM roles and policies',
    href: '/aws/iam',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
      </svg>
    ),
  },
];

export default awsPage;
