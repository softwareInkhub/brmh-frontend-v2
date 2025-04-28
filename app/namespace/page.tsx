'use client';
import { useState } from 'react';
import Namespace from './components/Namespace';
import ApiBuilder from './components/ApiBuilder';

const NamespacePage = () => {
  const [activeTab, setActiveTab] = useState('namespace');

    return (
    <div className="w-full h-full">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-gray-100">
          <button
          className={`px-6  text-sm font-medium transition-all relative ${
            activeTab === 'namespace'
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('namespace')}
        >
          Namespace
          {activeTab === 'namespace' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all"></div>
          )}
            </button>
            <button
          className={`px-6 py-2 text-sm font-medium transition-all relative ${
            activeTab === 'apiBuilder'
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('apiBuilder')}
        >
          API Builder
          {activeTab === 'apiBuilder' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all"></div>
          )}
                  </button>
              </div>

      {/* Tab Content */}
      <div className="w-full pt-4">
        {activeTab === 'namespace' && <Namespace />}
        {activeTab === 'apiBuilder' && <ApiBuilder />}
                          </div>
    </div>
  );
};

export default NamespacePage;